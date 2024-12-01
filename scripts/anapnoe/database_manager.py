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
import time
import stat
import hashlib

def validate_name(name, message):
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        raise ValueError(f"Invalid {message} name. Must start with a letter or underscore and contain only alphanumeric characters and underscores.")

class DatabaseManager:
    _instance = None

    def __init__(self, db_name):
        self.db_name = db_name
        self.source_file = None

    @classmethod
    def set_instance(cls, instance):
        cls._instance = instance

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise Exception("DatabaseManager instance is not set.")
        return cls._instance


    def set_source_file(self, source_file):
        self.source_file = source_file


    def get_source_file(self):
        return self.source_file


    def connect(self):
        return sqlite3.connect(self.db_name, check_same_thread=False)


    def get_all_default_values(self):
        return {
            "type": (None, "TEXT"),
            "name": (None, "TEXT"),
            "filename": ("", "TEXT"),
            "hash": ("", "TEXT"),
            "thumbnail": ("", "TEXT"),
            "description": ("", "TEXT"),
            "tags": ("", "TEXT"),
            "notes": ("", "TEXT"),
            "sd_version": ("Unknown", "TEXT"),
            "preview": ('', "TEXT"),
            "local_preview": ("", "TEXT"),
            "filesize": (0, "INTEGER"),
            "date_created": (None, "INTEGER"),
            "date_modified": (None, "INTEGER"),  
            "allow_update": (False, "BOOLEAN"),
            "metadata_exists": (False, "BOOLEAN"),

            # checkpoint
            "vae": ("None", "TEXT"),

            # styles
            "prompt": ("", "TEXT"),
            "negative": ("", "TEXT"),
            "extra": ("", "TEXT"),
        }


    def calculate_sha256(self, filepath):
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    

    def create_directory_with_permissions(self, dir_path):
        try:
            os.makedirs(dir_path, exist_ok=True)
            logger.info(f"Directory created: {dir_path}")
            # Set permissions to rw-r--r-- (644)
            os.chmod(dir_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
            logger.info(f"Permissions set for {dir_path}: Read and Write for owner, Read for group and others")

        except PermissionError:
            logger.info(f"Permission denied when trying to create or modify: {dir_path}")
        except Exception as e:
            logger.info(f"Error: {e}")


    def filter_and_normalize_paths(self, item):
        item_filtered = {k: v for k, v in item.items() if k != 'thumbnail'}
        
        # Normalize paths for 'filename' and 'local_preview'
        if 'filename' in item_filtered:
            item_filtered['filename'] = Path(item_filtered['filename']).as_posix()
        if 'local_preview' in item_filtered:
            item_filtered['local_preview'] = Path(item_filtered['local_preview']).as_posix()
        
        return item_filtered


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


    def item_exists_by_name(self, table_name, file_name):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f"SELECT 1 FROM {table_name} WHERE name = ?", (file_name,))
            exists = cursor.fetchone() is not None
            return exists
        except sqlite3.Error as e:
            logger.error(f"Database error in item_exists_by_name: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in item_exists_by_name: {e}")
        finally:
            if conn:
                conn.close()


    def item_exists(self, table_name, item_id):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(f"SELECT 1 FROM {table_name} WHERE id = ?", (item_id,))
            exists = cursor.fetchone() is not None
            return exists
        except sqlite3.Error as e:
            logger.error(f"Database error in item_exists_by_name: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in item_exists_by_name: {e}")
        finally:
            if conn:
                conn.close()


    def item_exists_in_source(self, path):
        path = os.path.normpath(path)
        return os.path.exists(path)
    

    def import_item(self, table_name, item):
        try:
            cleaned_item = {k: v[0] if v is not None else None for k, v in item.items()}
            
            item_exists_by_name = self.item_exists_by_name(table_name, cleaned_item['name'])
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
                WHERE id = ?
            ''', (item.get('filename'), item.get('local_preview'), item.get('local_preview'), item.get('id')))

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

            cursor.execute(f'SELECT local_preview, filename FROM {table_name} WHERE id = ?', (item_filtered.get('id'),))
            result = cursor.fetchone()
            curr_local_preview, curr_filename = result if result else (None, None)

            new_local_preview_path = item_filtered.get('local_preview')
            new_filename = item_filtered.get('filename')
            
            source_file = self.get_source_file()
            self.set_source_file(None)

            new_preview_directory = os.path.dirname(new_local_preview_path)
            if not os.path.exists(new_preview_directory):
                self.create_directory_with_permissions(new_preview_directory)
                logger.info(f"Created directory: {new_preview_directory}")

            if source_file:
                if os.path.exists(source_file):
                    shutil.copy2(source_file, new_local_preview_path)
                    logger.info(f"Copied new local_preview from {source_file} to {new_local_preview_path}")
                return new_local_preview_path

            if curr_local_preview:
                if curr_filename != new_filename and new_filename:
                    if os.path.exists(curr_local_preview):
                        shutil.move(curr_local_preview, new_local_preview_path)
                        logger.info(f"Moved new local_preview from {curr_local_preview} to {new_local_preview_path}")
                        
                    return new_local_preview_path  # Return new path

                elif curr_local_preview != new_local_preview_path and new_local_preview_path:
                    # Copy, overwrite if exists
                    if os.path.exists(new_local_preview_path):
                        shutil.copy2(new_local_preview_path, curr_local_preview)
                        logger.info(f"Copied new local_preview from {new_local_preview_path} to {curr_local_preview}")
                        
                    return curr_local_preview  # Path updated

            return None  # No Path update
        except Exception as e:
            logger.error(f"Error checking and copying local_preview: {e}")
            return None
        finally:
            if conn:
                conn.close()

   
    def handle_local_preview(self, table_name, item_filtered):
        updated_local_preview_path = self.check_and_copy_local_preview(table_name, item_filtered)
        if updated_local_preview_path:
            item_filtered['local_preview'] = updated_local_preview_path
            item_filtered['thumbnail'] = self.create_and_save_thumbnail(updated_local_preview_path)

        return updated_local_preview_path


    def update_item(self, table_name, item, update_local_preview=False):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            item_filtered = self.filter_and_normalize_paths(item)
            is_updated = None

            has_id = 'id' in item and item['id']
            if has_id:
                is_updated = self.update_existing_item(cursor, table_name, item_filtered)
                
            # If update fails insert new item
            if is_updated is None:  
                self.insert_new_item(cursor, table_name, item_filtered)
                logger.info(f"Item {item['name']} inserted as a new entry.")
                
            if update_local_preview:
                local_preview_thumb = self.handle_local_preview(table_name, item_filtered)
                if local_preview_thumb:
                    self.update_local_preview_thumb(cursor, table_name, item_filtered)

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


    def update_existing_item(self, cursor, table_name, item_filtered):
        item_filtered['date_modified'] = int(time.time())
        keys = ', '.join([f"{k} = ?" for k in item_filtered.keys() if k != 'id'])
        values = tuple(json.dumps(val) if isinstance(val, (dict, list)) else val for k, val in item_filtered.items() if k != 'id') + (item_filtered['id'],)

        cursor.execute(f'''
        UPDATE {table_name} SET {keys} WHERE id = ?
        ''', values)

        return cursor.rowcount > 0


    def insert_new_item(self, cursor, table_name, item_filtered):
       
        actual_columns = self.get_table_columns(table_name)
        all_default_values = self.get_all_default_values()
        all_fields = {}

        for column in actual_columns:
            if column in all_default_values:
                default_value, _ = all_default_values[column]
                if column == "date_created":
                    all_fields[column] = int(time.time())
                elif column == "date_modified":
                    all_fields[column] = int(time.time())
                else:
                    all_fields[column] = item_filtered.get(column, default_value)

        # Filter out any None values
        all_fields = {k: v for k, v in all_fields.items() if v is not None}

        columns = ', '.join(all_fields.keys())
        placeholders = ', '.join(['?'] * len(all_fields))
        insert_values = tuple(json.dumps(val) if isinstance(val, (dict, list)) else val for val in all_fields.values())

        cursor.execute(f'''
        INSERT INTO {table_name} ({columns}) VALUES ({placeholders})
        ''', insert_values)

        last_inserted_id = cursor.lastrowid
        item_filtered['id'] = last_inserted_id


    def update_local_preview_thumb(self, cursor, table_name, item_filtered):
        # fields to update
        update_fields = {
            'local_preview': item_filtered.get('local_preview'),
            'thumbnail': item_filtered.get('thumbnail'),
            'filesize': None,
            'hash': None
        }

        if update_fields['thumbnail'] and os.path.exists(update_fields['thumbnail']):
            update_fields['filesize'] = os.stat(update_fields['thumbnail']).st_size

        if item_filtered.get('filename') and os.path.exists(item_filtered.get('filename')):
            update_fields['hash'] = self.calculate_sha256(item_filtered.get('filename'))

        set_clause = ', '.join(f"{key} = ?" for key in update_fields if update_fields[key] is not None)
        values = [value for value in update_fields.values() if value is not None] + [item_filtered.get('id')]

        if set_clause:
            cursor.execute(f'''
            UPDATE {table_name} 
            SET {set_clause} 
            WHERE id = ?
            ''', values)


    def delete_images(self, image_paths):
        for path_str in image_paths:
            path = Path(path_str) 
            if path.exists():
                path.unlink()  # Delete the file
                logger.info(f"Deleted image: {path}")
            else:
                logger.warning(f"Image not found: {path}")


    def delete_item(self, table_name, item_id):
        validate_name(table_name, "table")  # Validate table
        conn = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute(f'SELECT local_preview, thumbnail FROM {table_name} WHERE id = ?', (item_id,))
            paths = cursor.fetchone()

            if paths:
                local_preview, thumbnail = paths
                self.delete_images([local_preview, thumbnail])
            else:
                logger.warning(f"No item found with id {item_id} in {table_name}.")
                return {"message": f"No item found with id {item_id}."}

            cursor.execute(f'DELETE FROM {table_name} WHERE id = ?', (item_id,))
            conn.commit()
            logger.info(f"Item with id {item_id} deleted from {table_name}.")
            return {"message": f"Item with id {item_id} deleted successfully."}

        except sqlite3.Error as e:
            logger.error(f"Database error while deleting item: {e}")
            if conn:
                conn.rollback()
            return {"message": "Database error occurred."}
        except Exception as e:
            logger.error(f"Error deleting item: {e}")
            return {"message": "An error occurred."}
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


            # Count total
            count_query = f"""
            SELECT COUNT(*) FROM {table_name} 
            WHERE {where_clause}
            """

            count_params = []
            if sd_version:
                count_params.append(f"%{sd_version.lower()}%")
            
            if search_columns and search_term:
                for term in terms:
                    like_search_term = f"%{term}%"
                    count_params.extend([like_search_term] * len(search_columns))

            cursor.execute(count_query, tuple(count_params))
            total_rows = cursor.fetchone()[0]  # Get the total count


            # Main query
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
                "nextCursor": next_cursor,
                "total": total_rows
            }

        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
            return {
                "items": [],
                "nextCursor": None,
                "total": 0
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

            items = [dict(zip(column_names, row)) for row in rows]

            # Extract paths
            unique_paths = set()
            for item in items:
                path = item.get('filename', '')
                directory_path = str(Path(path).parent) + '/'
                unique_paths.add(Path(directory_path).as_posix())

            sorted_unique_paths = sorted(unique_paths)
            return items, sorted_unique_paths

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
                return Path(image_path)

            preview_image_path = base_path + ".preview" + ext
            if os.path.exists(preview_image_path):
                return Path(preview_image_path)
            
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

                #if ".preview" in image_path:
                #    base_name = Path(image_path).name.replace(".preview", "")
                #else:
                #    base_name = Path(image_path).stem
                
                base_name = image_path.stem 
                extension = image_path.suffix
                clean_base_name = base_name.split('.')[0]

                thumb_path = thumb_dir / f"{clean_base_name}.thumb.webp"

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
            if file_id:
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
                    item_filtered = {
                        'local_preview': image_path, 
                        'thumbnail': thumb_path,
                        'id': file_id
                    }
                    self.update_local_preview_thumb(cursor, table_name, item_filtered)

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
    async def get_items_from_db_endpoint(
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
    async def get_internal_metadata_endpoint(type: str, name: str):
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
        item_id:str = payload.get('id')
        data_type:str = payload.get('type')
        name:str = payload.get('name')
        filename:str = payload.get('filename')
        local_preview:str = payload.get('local_preview')

        description:str = payload.get('description')
        notes:str = payload.get('notes')
        tags:str = payload.get('tags')
        sd_version:str = payload.get('sd_version')
        
        activation_text:str = payload.get('activation_text')
        negative_prompt:str = payload.get('negative_prompt')
        preferred_weight: Optional[str] = payload.get('preferred_weight')

        prompt:str = payload.get('prompt')
        negative:str = payload.get('negative')
        source_file:str = payload.get('source_file')

        if not table_name:
            raise HTTPException(status_code=422, detail="DB table_name is required")

        db_manager = DatabaseManager.get_instance()
        table_columns = db_manager.get_table_columns(table_name)

        item = {                     
            'type': data_type,
            'name': name,
        }

        if preferred_weight is not None:
            try:
                preferred_weight = float(preferred_weight)  # float
            except ValueError:
                raise HTTPException(status_code=422, detail="preferred_weight must be a valid number")

        optional_fields = {
            'id': item_id,
            'filename': filename,
            'local_preview': local_preview, 

            'description': description,
            'notes': notes,           
            'tags': tags,
            'sd_version': sd_version,

            'activation_text': activation_text,
            'negative_prompt': negative_prompt,
            'preferred_weight': preferred_weight,
            
            'prompt': prompt,
            'negative': negative,
        }

        item.update({key: value for key, value in optional_fields.items() if key in table_columns})

        db_manager.set_source_file(source_file)

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
    async def get_items_by_path_endpoint(
        table_name: str,
        path: str = Query("")):       
        db_manager = DatabaseManager.get_instance()
        items, unique_subpaths = db_manager.get_items_by_path(table_name, path)
        return {"data": items, "unique_subpaths": unique_subpaths}


    @app.post("/sd_webui_ux/search_words_in_tables_columns")
    async def search_words_in_tables_columns_endpoint(payload: dict = Body(...)):       
        tables: str = payload.get("tables")
        columns: str = payload.get("columns")
        words: List[str] = payload.get("words", [])
        threshold: Optional[str] = payload.get("threshold")
        textarea: Optional[str] = payload.get("textarea")
        delimiter: Optional[str] = payload.get("delimiter")  # Optional delimiter

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


    @app.post("/sd_webui_ux/delete_item")
    async def delete_item_endpoint(payload: dict = Body(...)):
        table_name:str = payload.get('table_name')
        item_id:str = payload.get('item_id')

        if not table_name:
            raise HTTPException(status_code=422, detail="Table name is required")
        if not item_id:
            raise HTTPException(status_code=422, detail="Item ID is required")

        db_manager = DatabaseManager.get_instance()
        response = db_manager.delete_item(table_name, item_id)
        if "Error" in response["message"]:
            raise HTTPException(status_code=500, detail=response["message"])
        return response
    
    '''
    @app.get("/sd_webui_ux/images/{filename:path}")
    async def get_image(filename: str):
        file_path = filename

        if not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path)
    '''

    
# Modify the lambda to pass db_tables_pages in case we need to init db_tables_pages in another module
#script_callbacks.on_app_started(lambda _, app: api_uiux_db(_, app, db_tables_pages))





