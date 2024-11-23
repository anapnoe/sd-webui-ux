import logging
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Query, Body
#from fastapi import Request, Response

from typing import Optional, List, Dict, Any
import sqlite3
import json
import os
import re
from pathlib import Path
from PIL import Image
import shutil

import gradio as gr
from modules import script_callbacks

def validate_name(name, message):
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        raise ValueError(f"Invalid {message} name. Must start with a letter or underscore and contain only alphanumeric characters and underscores.")

class DatabaseManager:
    _instance = None

    def __init__(self, db_name):
        self.db_name = db_name

    @classmethod
    def set_instance(cls, instance):
        cls._instance = instance

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise Exception("DatabaseManager instance is not set.")
        return cls._instance


    def connect(self):
        return sqlite3.connect(self.db_name, check_same_thread=False)


    def get_table_columns(self, table_name):
        validate_name(table_name, "table")
        
        conn = self.connect()
        cursor = conn.cursor()
        
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns_info = cursor.fetchall()
        column_names = [column[1] for column in columns_info]
        
        return column_names


    def create_table(self, table_name, columns):
        validate_name(table_name, "table")

        # Validate column definitions
        valid_columns = []
        for column, col_type in columns.items():
            validate_name(column, "column")
            valid_columns.append(f"{column} {col_type}")

        columns_definition = ', '.join(valid_columns)

        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS {table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            {columns_definition}
        )
        ''')

        conn.commit()
        conn.close()


    def search_words_in_tables_columns(self, words, tables, columns, threshold, batch_size=500):
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            results = {}
            
            for table, cols in zip(tables, columns):
                validate_name(table, "table")  # Validate table
                results[table] = []
                
                # Create conditions
                conditions = ' OR '.join([f"{col} = ?" for col in cols for _ in words])
                values = words * len(cols)  # Repeat
                
                # Process in batches
                offset = 0
                while True:
                    # LIMIT and OFFSET
                    query = f"SELECT * FROM {table} WHERE {conditions} LIMIT ? OFFSET ?"
                    cursor.execute(query, values + [batch_size, offset])
                    rows = cursor.fetchall()
                    if not rows:
                        break
                    
                    column_names = [description[0] for description in cursor.description]
                    
                    for row in rows:
                        # match the conditions
                        matches = 0
                        for col in cols:
                            description = row[column_names.index(col)]
                            if description in words:  # exact match
                                matches += 1

                        #logger.debug(f"Row: {row}, Matches: {matches}")
                        
                        if matches >= threshold:
                            results[table].append(dict(zip(column_names, row)))
                            
                    offset += batch_size  # next batch

        except Exception as e:
            logger.error(f"An error occurred: {e}")
            results = {"error": str(e)}

        finally:
            conn.close()

        return results


    def default_value_for_key(self, key):
        default_values = {
            'description': '',
            'notes': '',
            'tags': '',
            'negative_prompt': ''
        }
        return default_values.get(key, '')


    def filter_and_normalize_paths(self, item):
        item_filtered = {k: v for k, v in item.items() if k != 'thumbnail'}
        
        # Normalize paths for 'filename' and 'local_preview'
        if 'filename' in item_filtered:
            item_filtered['filename'] = Path(item_filtered['filename']).as_posix()
        if 'local_preview' in item_filtered:
            item_filtered['local_preview'] = Path(item_filtered['local_preview']).as_posix()
        
        return item_filtered


    def table_exists(self, table_name):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (table_name,))
            exists = cursor.fetchone() is not None
            return exists
        except sqlite3.Error as e:
            logger.error(f"Database error in table_exists: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in table_exists: {e}")
        finally:
            if conn:
                conn.close()


    def item_exists(self, table_name, file_name):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f"SELECT 1 FROM {table_name} WHERE name = ?", (file_name,))
            exists = cursor.fetchone() is not None
            return exists
        except sqlite3.Error as e:
            logger.error(f"Database error in item_exists: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in item_exists: {e}")
        finally:
            if conn:
                conn.close()


    def item_exists_in_source(self, path):
        path = os.path.normpath(path)
        return os.path.exists(path)
    

    def insert_item(self, table_name, item):
        try:
            cleaned_item = {k: v[0] if v is not None else None for k, v in item.items()}
            
            item_exists_by_name = self.item_exists(table_name, cleaned_item['name'])
            item_allow_update = cleaned_item.get('allow_update', False)
            item_exists_in_source = self.item_exists_in_source(cleaned_item["filename"])

            if not item_exists_by_name and not item_exists_in_source:
                logger.info(f"Item {cleaned_item['name']} does not exist. Deleting from database.")
                self.delete_item(table_name, cleaned_item['name'])
                return
            
            elif item_exists_by_name and not item_exists_in_source:
                logger.info(f"Item {cleaned_item['name']} not found in source. Updating paths.")
                self.update_item_paths(table_name, cleaned_item)
                return
            
            elif item_exists_by_name:
                if item_allow_update:
                    logger.info(f"Updating item: {cleaned_item['name']} {cleaned_item.get('hash', 'N/A')} (allow_update=True)")
                    self.update_item(table_name, cleaned_item)
                return
            
            else:
                validate_name(table_name, "table")  # Validate table 
                logger.info(f"Inserting item: {cleaned_item['name']} {cleaned_item.get('hash', 'N/A')}")
                conn = self.connect()
                cursor = conn.cursor()

                item_filtered = self.filter_and_normalize_paths(cleaned_item)

                keys = ', '.join(item_filtered.keys())
                placeholders = ', '.join(['?' for _ in item_filtered])
                values = tuple(json.dumps(val) if isinstance(val, (dict, list)) else val for val in item_filtered.values())

                cursor.execute(f'''
                INSERT INTO {table_name} ({keys})
                VALUES ({placeholders})
                ''', values)

                conn.commit()
        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error inserting item: {e}")
        finally:
            if conn:
                conn.close()


    def update_item_paths(self, table_name, item):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute('BEGIN')
            cursor.execute(f'''
                UPDATE {table_name}
                SET filename = ?, local_preview = ?, preview = ?
                WHERE name = ?
            ''', (item['filename'], item['local_preview'], item['local_preview'], item['name']))

            conn.commit()
            logger.info(f"Paths for item {item['name']} updated successfully.")
        except sqlite3.Error as e:
            logger.error(f"Database error while updating paths: {e}")
            conn.rollback()
        except Exception as e:
            logger.error(f"Error updating paths: {e}")
            conn.rollback()
        finally:
            if conn:
                conn.close()


    def check_and_copy_local_preview(self, table_name, item_filtered):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute(f'SELECT local_preview FROM {table_name} WHERE name = ?', (item_filtered['name'],))
            curr_local_preview = cursor.fetchone()

            if curr_local_preview and curr_local_preview[0] != item_filtered.get('local_preview'):
                old_local_preview_path = curr_local_preview[0]
                new_local_preview_path = item_filtered.get('local_preview')

                # Copy, overwrite if exists
                if os.path.exists(new_local_preview_path):
                    shutil.copy2(new_local_preview_path, old_local_preview_path)
                    logger.info(f"Copied new local_preview from {new_local_preview_path} to {old_local_preview_path}")
                    
                return old_local_preview_path  # Path updated
            return None  # No Path update
        except Exception as e:
            logger.error(f"Error checking and copying local_preview: {e}")
            return None
        finally:
            if conn:
                conn.close()


    def update_item(self, table_name, item, update_local_preview=False):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            item_filtered = self.filter_and_normalize_paths(item)

            # Check and copy local_preview if the flag is set
            if update_local_preview:
                updated_local_preview_path = self.check_and_copy_local_preview(table_name, item_filtered)
                if updated_local_preview_path:
                    item_filtered['local_preview'] = updated_local_preview_path
                    item_filtered['thumbnail'] = self.create_and_save_thumbnail(updated_local_preview_path)

            keys = ', '.join([f"{k} = ?" for k in item_filtered.keys()])
            values = tuple(json.dumps(val) if isinstance(val, (dict, list)) else val for val in item_filtered.values()) + (item['name'],)

            cursor.execute(f'''
            UPDATE {table_name} SET {keys} WHERE name = ?
            ''', values)

            conn.commit()
            logger.info(f"Item {item['name']} updated successfully.")
        except sqlite3.Error as e:
            logger.error(f"Database error while updating item: {e}")
            if conn:
                conn.rollback()
        except Exception as e:
            logger.error(f"Error updating item: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                conn.close()


    def delete_item(self, table_name, item):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f'DELETE FROM {table_name} WHERE name = ?', (item['name'],))
            conn.commit()
            logger.info(f"Item {item['name']} deleted from {table_name}.")
        except sqlite3.Error as e:
            logger.error(f"Database error while deleting item: {e}")
            if conn:
                conn.rollback()
        except Exception as e:
            logger.error(f"Error deleting item: {e}")
        finally:
            if conn:
                conn.close()


    def get_items(
            self, 
            table_name: str, 
            skip: int = 0, 
            limit: int = 10, 
            sort_by: str = "id", 
            order: str = "asc", 
            search_term: str = "", 
            search_columns: Optional[List[str]] = None,
            sd_version: str = "") -> dict:
        
        validate_name(table_name, "table")  # Validate table

        
        valid_sort_columns = ["id", "name", "filename", "date_created", "date_modified"]  # whitelist
        if sort_by not in valid_sort_columns:
            raise ValueError(f"Invalid sort column: {sort_by}")
        
        if search_columns:
            for col in search_columns:
                validate_name(col, "search column")  # Validate search columns

        try:
            conn = self.connect()
            cursor = conn.cursor()

            where_clauses = []
            
            if sd_version:
                where_clauses.append("LOWER(sd_version) LIKE ?")

            if search_columns and search_term:
                terms = search_term.lower().split('+')  # Split by '+'
                for col in search_columns:
                    term_clauses = [f"LOWER({col}) LIKE ?" for _ in terms]
                    where_clauses.append(f"({' OR '.join(term_clauses)})") 

            # where_clauses += [f"LOWER({col}) LIKE ?" for col in search_columns]
            where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"

            query = f"""
            SELECT * FROM {table_name} 
            WHERE {where_clause}
            ORDER BY LOWER({sort_by}) {order} 
            LIMIT ? OFFSET ?
            """

            query_params = []
            
            if sd_version:
                query_params.append(f"%{sd_version.lower()}%")
            
            if search_columns and search_term:
                for term in terms:
                    like_search_term = f"%{term}%"
                    query_params.extend([like_search_term] * len(search_columns))
            
            #like_search_term = f"%{search_term.lower()}%"
            #query_params.extend([like_search_term] * len(search_columns))
            
            # Fetch limit + 1 to check if there are more items
            query_params.extend([limit + 1, skip])

            cursor.execute(query, tuple(query_params))
            rows = cursor.fetchall()
            column_names = [description[0] for description in cursor.description]
            conn.close()

            items = [dict(zip(column_names, row)) for row in rows[:limit]]
            next_cursor = skip + limit if len(rows) > limit else None

            return {
                "items": items,
                "nextCursor": next_cursor
            }

        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
            return {
                "items": [],
                "nextCursor": None
            }


    def get_items_by_path(self, table_name: str, path: str) -> List[dict]:
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Normalize and remove drive letters
            normalized_path = re.sub(r'^[a-zA-Z]:', '', Path(path).as_posix().lower())
            like_path = f"%{normalized_path}%" if normalized_path else "%"

            cursor.execute(f"""
                SELECT * FROM {table_name}
                WHERE lower(replace(filename, '\\', '/')) LIKE ? COLLATE NOCASE
                ORDER BY lower(replace(filename, '\\', '/'))
            """, (like_path,))

            rows = cursor.fetchall()
            column_names = [description[0] for description in cursor.description]
            
            return [dict(zip(column_names, row)) for row in rows]
        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
            return []
        finally:
            if conn:
                conn.close()


    def get_image_path(self, file_path):
        file_path = Path(file_path).as_posix()
        base_path = os.path.splitext(file_path)[0]
        image_extensions = ['.png', '.jpeg', '.jpg', '.webp']
        
        for ext in image_extensions:
            image_path = base_path + ext
            if os.path.exists(image_path):
                return image_path

            preview_image_path = base_path + ".preview" + ext
            if os.path.exists(preview_image_path):
                return preview_image_path
            
        return None


    def create_and_save_thumbnail(self, image_path, save_path=None, size=(512, 512)):
        image_path = self.get_image_path(image_path)
        if not image_path:
            return None
        try:
            with Image.open(image_path) as img:
                img.thumbnail(size)  
                thumb_dir = Path(save_path or image_path).parent / 'thumbnails'
                thumb_dir.mkdir(parents=True, exist_ok=True)

                if ".preview" in image_path:
                    base_name = Path(image_path).name.replace(".preview", "")
                else:
                    base_name = Path(image_path).stem

                thumb_path = thumb_dir / f"{base_name}.thumb.webp"

                exif_data = img.info.get('exif')
                if exif_data:
                    img.save(thumb_path, "WEBP", exif=exif_data)
                else:
                    img.save(thumb_path, "WEBP")
                
                logger.info(f"Thumbnail saved to {thumb_path}")
                return thumb_path.as_posix()
        except Exception as e:
            logger.error(f"Error generating thumbnail for {image_path}: {e}")
            return None


    def generate_thumbnails(self, table_name, size=(512, 512), file_id=None):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            
            # if file_id execute one
            if file_id is not None:
                cursor.execute(f'SELECT id, local_preview, filename FROM {table_name} WHERE id = ? AND local_preview IS NOT NULL', (file_id,))
            else:
                cursor.execute(f'SELECT id, local_preview, filename FROM {table_name} WHERE local_preview IS NOT NULL')
            
            rows = cursor.fetchall()

            if not rows:
                return {"message": f"No images found for file_id {file_id}" if file_id else "No images found."}

            for row in rows:
                file_id, image_path, save_path = row
                thumb_path = self.create_and_save_thumbnail(image_path, save_path, size)
                if thumb_path:
                    try:
                        cursor.execute(f'UPDATE {table_name} SET thumbnail = ? WHERE id = ?', (thumb_path, file_id))
                    except Exception as e:
                        logger.error(f"Error updating database for file_id {file_id}: {e}")

            conn.commit()
            return {"message": "Thumbnails generated and updated successfully" if not file_id else f"Thumbnail generated and updated for file_id: {file_id}"}
        except Exception as e:
            return {"message": f"Error generating thumbnails: {e}"}
        finally:
            if conn:
                conn.close()


def api_uiux_db(_: gr.Blocks, app: FastAPI, db_tables_pages):

    # Store the db_tables_pages in the app state
    app.state.db_tables_pages = db_tables_pages
    #print("api_uiux_db initilized")

    # Middleware to log requests debug
    '''
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # Log request details
        print(f"Request URL: {request.url}")
        print(f"Request Method: {request.method}")
        print(f"Request Headers: {request.headers}")

        # Get response
        response: Response = await call_next(request)

        # Log response details
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")

        return response
    '''

    @app.get("/sd_webui_ux/get_items_from_db")
    def get_items_from_db_endpoint(
        table_name: str,
        skip: int = 0, 
        limit: int = 10, 
        sort_by: Optional[str] = Query("id"), 
        order: Optional[str] = Query("asc"), 
        search_term: Optional[str] = Query(""), 
        search_columns: Optional[List[str]] = Query(["filename"]),
        sd_version: Optional[str] = Query("")
    ) -> Dict[str, Any]:
        if not table_name:
            raise HTTPException(status_code=400, detail="Table name is required.")
        
        db_manager = DatabaseManager.get_instance()

        try:
            result = db_manager.get_items(table_name, skip, limit, sort_by, order, search_term, search_columns, sd_version)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/sd_webui_ux/get_internal_metadata")
    def get_internal_metadata_endpoint(type: str, name: str):
        try:
            page = db_tables_pages.get(type)
            if not page:
                raise HTTPException(status_code=400, detail="Invalid type specified")

            metadata = page.get_internal_metadata(name)

            if metadata is None:
                return {}
                #raise HTTPException(status_code=404, detail="File not found")
            return metadata
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/sd_webui_ux/update_user_metadata")
    async def update_user_metadata_endpoint(payload: dict = Body(...)):
        table_name:str = payload.get('table_name')
        description:str = payload.get('description')
        notes:str = payload.get('notes')
        tags:str = payload.get('tags')
        sd_version:str = payload.get('sd_version')
        local_preview:str = payload.get('local_preview')
        name:str = payload.get('name')
        activation_text:str = payload.get('activation_text')
        preferred_weight: Optional[str] = payload.get('preferred_weight')
        negative_prompt:str = payload.get('negative_prompt')

        if not table_name:
            raise HTTPException(status_code=422, detail="DB table_name is required")

        db_manager = DatabaseManager.get_instance()
        table_columns = db_manager.get_table_columns(table_name)

        item = {
            'description': description,
            'notes': notes,
            'tags': tags,
            'sd_version': sd_version,
            'local_preview': local_preview,
            'name': name
        }

        if preferred_weight is not None:
            try:
                preferred_weight = float(preferred_weight)  # float
            except ValueError:
                raise HTTPException(status_code=422, detail="preferred_weight must be a valid number")

        optional_fields = {
            'activation_text': activation_text,
            'preferred_weight': preferred_weight,
            'negative_prompt': negative_prompt
        }

        item.update({key: value for key, value in optional_fields.items() if key in table_columns})

        try:
            db_manager.update_item(table_name, item, update_local_preview=True)
            return {"message": "Item updated successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/sd_webui_ux/generate-thumbnails")
    async def generate_thumbnails(payload: dict = Body(...)):
        table_name:str = payload.get('table_name')
        if not table_name:
            raise HTTPException(status_code=422, detail="Table name is required")

        db_manager = DatabaseManager.get_instance()
        response = db_manager.generate_thumbnails(table_name)
        if "Error" in response["message"]:
            raise HTTPException(status_code=500, detail=response["message"])
        return response

    @app.post("/sd_webui_ux/generate-thumbnail")
    async def generate_thumbnail(payload: dict = Body(...)):
        table_name:str = payload.get('table_name')
        file_id:str = payload.get('file_id')

        if not table_name:
            raise HTTPException(status_code=422, detail="Table name is required")
        if not file_id:
            raise HTTPException(status_code=422, detail="File ID is required")

        db_manager = DatabaseManager.get_instance()
        response = db_manager.generate_thumbnails(table_name, file_id=file_id)
        if "Error" in response["message"]:
            raise HTTPException(status_code=500, detail=response["message"])
        return response

    
    @app.get("/sd_webui_ux/get_items_by_path")
    def get_items_by_path_endpoint(
        table_name: str,
        path: str = Query("")):       
        db_manager = DatabaseManager.get_instance()
        items = db_manager.get_items_by_path(table_name, path)
        return {"data": items}


    @app.post("/sd_webui_ux/search_words_in_tables_columns")
    async def search_words_in_tables_columns_endpoint(payload: dict = Body(...)):       
        tables: str = payload.get("tables")
        columns: str = payload.get("columns")
        delimiter: Optional[str] = payload.get("delimiter")  # Optional delimiter
        words: List[str] = payload.get("words", [])
        textarea: Optional[str] = payload.get("textarea")
        threshold: Optional[str] = payload.get("threshold")

        # Validate input
        if textarea:
            if not textarea.strip():
                raise HTTPException(status_code=400, detail="Invalid input: textarea is empty")
            words = textarea.split(delimiter) if delimiter else textarea.split()

        if not words or not tables or not columns:
            raise HTTPException(status_code=400, detail="Invalid input: words, tables, and columns are required")

        if threshold is None:
            threshold = 1
        else:
            try:
                threshold = int(threshold)  # Convert to int
                if threshold <= 0:
                    raise ValueError("Threshold must be a positive integer")
            except ValueError:
                raise HTTPException(status_code=422, detail="Threshold must be a positive integer")

        table_list = tables.split(',')  

        if ';' in columns:
            column_list = [col.split(',') for col in columns.split(';')]  # Different columns for each table
        else:
            column_list = [columns.split(',')] * len(table_list)  # Same columns for all tables

        db_manager = DatabaseManager.get_instance()

        try:
            results = db_manager.search_words_in_tables_columns(words, table_list, column_list, threshold)
            return results
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))



    
# Modify the lambda to pass db_tables_pages in case we need to init db_tables_pages in another module
#script_callbacks.on_app_started(lambda _, app: api_uiux_db(_, app, db_tables_pages))





