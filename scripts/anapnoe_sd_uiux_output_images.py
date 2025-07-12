import os
import sys
import logging
from pathlib import Path
import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
import json

from anapnoe.db_output_images import OutputImagesFolderProcessor, api_uiux_output_image
from anapnoe.database_manager import DatabaseManager, api_uiux_db

logger = logging.getLogger(__name__)

basedir = scripts.basedir()
webuidir = Path(basedir).parents[1]
imagesdir = os.path.join(webuidir, "outputs")
#DB_FILE = os.path.join(basedir, 'sd_webui_ux_images.db')
DB_FILE = os.path.join(basedir, 'sd_webui_ux.db')

# Initialize once
db_tables_pages = {
    "Images": OutputImagesFolderProcessor(imagesdir)
}

def images_import_update_db(db_tables_pages, refresh=False):
    db_manager = DatabaseManager.get_instance()
    success = True
    total_processed = 0
    total_items = sum(len(list(page.get_images_and_data())) for page in db_tables_pages.values())
    
    # Initial progress update
    yield json.dumps({
        "status": "starting",
        "total": total_items,
        "processed": 0,
        "progress": 0.0
    }) + "\n"
    
    for type_name, page_instance in db_tables_pages.items():
        table_name = type_name.lower()
        items = list(page_instance.get_images_and_data())
        if not items:
            continue

        if not db_manager.table_exists(table_name):
            try:
                columns = {k: v[1] for k, v in items[0].items()}
                db_manager.create_table(table_name, columns)
            except Exception as e:
                logger.error(f"Error creating table {table_name}: {e}")
                success = False
                continue

        if refresh:
            for idx, item in enumerate(items, 1):
                try:
                    db_manager.import_item(type_name.lower(), item)
                    total_processed += 1
                    progress = (total_processed / total_items) * 100
                    
                    yield json.dumps({
                        "status": "processing",
                        "current_table": table_name,
                        "processed": total_processed,
                        "total": total_items,
                        "progress": progress
                    }) + "\n"
                    
                except Exception as e:
                    logger.error(f"Error on {item.get('name')}: {e}")
                    success = False

    yield json.dumps({
        "status": "complete",
        "success": success,
        "processed": total_processed,
        "total": total_items,
        "progress": 100.0
    }) + "\n"

'''
def images_import_refresh_db():
    success, total_processed = images_import_update_db(db_tables_pages, refresh=True)

    conn = DatabaseManager.get_instance().connect()
    conn.execute("PRAGMA wal_checkpoint(FULL)")
    conn.close()
    
    return {
        "success": success,
        "processed": total_processed if success else 0
    }
'''

def check_and_use_db_output_images():
    if shared.opts.uiux_enable_sd_output_images is False:
        return
    return on_ui_tabs()

#fix this we don't need to update on every restart
if os.path.exists(DB_FILE): 
    images_import_update_db(db_tables_pages, False)

def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as anapnoe_sd_uiux_db_output_images:
        refresh_button_output_images = gr.Button("Refresh Database", elem_id="refresh_output_images_database")
        #refresh_button_output_images.click(fn=images_import_refresh_db, inputs=[], outputs=[])

    return (anapnoe_sd_uiux_db_output_images, 'Output Images DB', 'anapnoe_sd_uiux_db_output_images'),

    
def api_uiux_import_update_table(_: gr.Blocks, app: FastAPI):
    @app.post("/sd_webui_ux/import_update_table")
    async def import_update_db_endpoint(payload: dict = Body(...)):
        table_name: str = payload.get('table_name')
        if not table_name:
            raise HTTPException(status_code=422, detail="Table name is required")
        
        return StreamingResponse(
            images_import_update_db(db_tables_pages, True),
            media_type="application/x-ndjson"  # Newline-delimited JSON
        )

#script_callbacks.on_app_started(lambda _, app: api_uiux_output_image(_, app, db_tables_pages))
script_callbacks.on_app_started(api_uiux_output_image)
script_callbacks.on_app_started(api_uiux_import_update_table)
script_callbacks.on_ui_tabs(check_and_use_db_output_images)

