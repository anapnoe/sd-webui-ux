import os
import sys
import logging
from pathlib import Path
import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared
from fastapi import FastAPI, HTTPException, Query, Body
from typing import Optional, List, Dict, Any

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

    for type_name, page_instance in db_tables_pages.items():
        table_name = type_name.lower()
        items = list(page_instance.get_images_and_data())
        if items:
            
            columns = {k: v[1] for k, v in items[0].items()}  # column type

            if not db_manager.table_exists(table_name):
                try:
                    db_manager.create_table(table_name, columns)
                    refresh = True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {e}")
                    continue  # Skip to next

            if refresh:
                for item in items:
                    try:
                        db_manager.import_item(table_name, item)  # Import item
                    except Exception as e:
                        logger.error(f"Error importing item into {table_name}: {e}")


def images_import_refresh_db():
    logger.info("Initializing and refreshing images database")
    images_import_update_db(db_tables_pages, True)

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
        refresh_button_output_images.click(fn=images_import_refresh_db, inputs=[], outputs=[])

    return (anapnoe_sd_uiux_db_output_images, 'Styles DB', 'anapnoe_sd_uiux_db_output_images'),

#script_callbacks.on_app_started(lambda _, app: api_uiux_output_image(_, app, db_tables_pages))
script_callbacks.on_app_started(api_uiux_output_image)
script_callbacks.on_ui_tabs(check_and_use_db_output_images)

