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

import gradio as gr
from modules import script_callbacks

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
        conn = self.connect()
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns_info = cursor.fetchall()
        column_names = [column[1] for column in columns_info]
        return column_names

    def create_table(self, table_name, columns):
        conn = self.connect()
        cursor = conn.cursor()

        columns_definition = ', '.join([f"{column} {col_type}" for column, col_type in columns.items()])
        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS {table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            {columns_definition}
        )
        ''')

        conn.commit()
        conn.close()

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
    
    def item_exists(self, table_name, file_name):
        conn = self.connect()
        cursor = conn.cursor()
        
        cursor.execute(f'''
        SELECT 1 FROM {table_name} WHERE name = ?
        ''', (file_name,))
        exists = cursor.fetchone() is not None
        
        conn.close()
        return exists

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

    def update_item(self, table_name, item):

        conn = self.connect()
        cursor = conn.cursor()

        item_filtered = self.filter_and_normalize_paths(item)

        keys = ', '.join([f"{k} = ?" for k in item_filtered.keys()])
        values = tuple(json.dumps(val) if isinstance(val, (dict, list)) else val for val in item_filtered.values()) + (item['name'],)

        cursor.execute(f'''
        UPDATE {table_name} SET {keys} WHERE name = ?
        ''', values)
        
        conn.commit()
        conn.close()

    def delete_item(self, table_name, item):
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f'DELETE FROM {table_name} WHERE name = ?', (item['name'],))
            conn.commit()
            conn.close()
            logger.info(f"Item {item['name']} deleted from {table_name}.")
        except sqlite3.Error as e:
            logger.error(f"Database error while deleting item: {e}")
        except Exception as e:
            logger.error(f"Error deleting item: {e}")

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
        
        try:
            conn = self.connect()
            cursor = conn.cursor()

            if not search_columns:
                search_columns = ["filename"]

            where_clauses = []
            
            if sd_version:
                where_clauses.append("LOWER(sd_version) LIKE ?")

            where_clauses += [f"LOWER({col}) LIKE ?" for col in search_columns]
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
            
            like_search_term = f"%{search_term.lower()}%"
            query_params.extend([like_search_term] * len(search_columns))
            
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
            conn.close()

            return [dict(zip(column_names, row)) for row in rows]
        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
            return []

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

    def create_and_save_thumbnail(self, image_path, size=(512, 512)):
        image_path = self.get_image_path(image_path)
        if not image_path:
            return None
        try:
            with Image.open(image_path) as img:
                img.thumbnail(size)

                thumb_dir = Path(image_path).parent / 'thumbnails'
                thumb_dir.mkdir(parents=True, exist_ok=True)

                if ".preview" in image_path:
                    base_name = Path(image_path).name.replace(".preview", "")
                else:
                    base_name = Path(image_path).stem

                thumb_path = thumb_dir / f"{base_name}.thumb.webp"
                img.save(thumb_path, "WEBP")

                logger.info(f"Thumbnail saved to {thumb_path}")
                return thumb_path.as_posix()
        except Exception as e:
            logger.error(f"Error generating thumbnail for {image_path}: {e}")
            return None

    def generate_thumbnail(self, table_name, file_id, size=(512, 512)):
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f'SELECT local_preview FROM {table_name} WHERE id = ?', (file_id,))
            row = cursor.fetchone()
            if not row:
                return {"message": f"Image path not found for file_id {file_id}"}
            
            image_path = row[0]
            thumb_path = self.create_and_save_thumbnail(image_path, size)
            
            if thumb_path:
                cursor.execute(f'UPDATE {table_name} SET thumbnail = ? WHERE id = ?', (thumb_path, file_id))
                conn.commit()
                return {"message": f"Thumbnail generated and updated for file_id: {file_id}"}
            else:
                return {"message": f"Error generating thumbnail for file_id {file_id}"}
        except Exception as e:
            logger.error(f"Error processing file_id {file_id}: {e}")
            return {"message": f"Error processing file_id {file_id}: {e}"}
        finally:
            if conn:
                conn.close()

    def generate_thumbnails(self, table_name, size=(512, 512)):
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f'SELECT id, local_preview FROM {table_name} WHERE local_preview IS NOT NULL')
            rows = cursor.fetchall()

            for row in rows:
                file_id, image_path = row
                thumb_path = self.create_and_save_thumbnail(image_path, size)
                if thumb_path:
                    try:
                        cursor.execute(f'UPDATE {table_name} SET thumbnail = ? WHERE id = ?', (thumb_path, file_id))
                    except Exception as e:
                        logger.error(f"Error updating database for file_id {file_id}: {e}")

            conn.commit()
            conn.close()
            return {"message": "Thumbnails generated and updated successfully"}
        except Exception as e:
            return {"message": f"Error generating thumbnails: {e}"}


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

    @app.get("/sd_webui_ux/get_models_from_db")
    def get_models_from_db_endpoint(
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
                raise HTTPException(status_code=404, detail="File not found")
            return metadata
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/sd_webui_ux/get_user_metadata_editor")
    def get_user_metadata_editor_endpoint(type: str, name: str):
        try:
            page = db_tables_pages.get(type)
            if not page:
                raise HTTPException(status_code=400, detail="Invalid type specified")

            #metadata = page.create_user_metadata_editor(name)
            #if metadata is None:
            #    raise HTTPException(status_code=404, detail="File not found")
            #return metadata
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/sd_webui_ux/update_user_metadata")
    async def update_user_metadata_endpoint(payload: dict = Body(...)):
        table_name = payload.get('table_name')
        description = payload.get('description')
        notes = payload.get('notes')
        tags = payload.get('tags')
        sd_version = payload.get('sd_version')
        local_preview = payload.get('local_preview')
        name = payload.get('name')
        activation_text = payload.get('activation_text')
        preferred_weight = payload.get('preferred_weight')
        negative_prompt = payload.get('negative_prompt')

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
        optional_fields = {
            'activation_text': activation_text,
            'preferred_weight': preferred_weight,
            'negative_prompt': negative_prompt
        }
        item.update({key: value for key, value in optional_fields.items() if key in table_columns})

        try:
            db_manager.update_item(table_name, item)
            return {"message": "Item updated successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/sd_webui_ux/generate-thumbnails")
    async def generate_thumbnails(payload: dict = Body(...)):
        table_name = payload.get('table_name')
        if not table_name:
            raise HTTPException(status_code=422, detail="Table name is required")

        db_manager = DatabaseManager.get_instance()
        response = db_manager.generate_thumbnails(table_name)
        if "Error" in response["message"]:
            raise HTTPException(status_code=500, detail=response["message"])
        return response

    @app.post("/sd_webui_ux/generate-thumbnail")
    async def generate_thumbnail(payload: dict = Body(...)):
        table_name = payload.get('table_name')
        file_id = payload.get('file_id')

        if not table_name:
            raise HTTPException(status_code=422, detail="Table name is required")
        if not file_id:
            raise HTTPException(status_code=422, detail="File ID is required")

        db_manager = DatabaseManager.get_instance()
        response = db_manager.generate_thumbnail(table_name, file_id)
        if "Error" in response["message"]:
            raise HTTPException(status_code=500, detail=response["message"])
        return response
    
    @app.get("/sd_webui_ux/get_models_by_path")
    def get_models_by_path_endpoint(
        table_name: str,
        path: str = Query("")):       
        db_manager = DatabaseManager.get_instance()
        items = db_manager.get_items_by_path(table_name, path)
        return {"data": items}


    
# Modify the lambda to pass db_tables_pages in case we need to init db_tables_pages in another module
#script_callbacks.on_app_started(lambda _, app: api_uiux_db(_, app, db_tables_pages))





