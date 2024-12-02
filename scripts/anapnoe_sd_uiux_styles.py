import os
import sys
import logging
from pathlib import Path
import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared
from fastapi import FastAPI, HTTPException, Query, Body
from typing import Optional, List, Dict, Any

from anapnoe.db_styles import StylesFolderProcessor, api_uiux_style
from anapnoe.database_manager import DatabaseManager, api_uiux_db

logger = logging.getLogger(__name__)

basedir = scripts.basedir()
stylesdir = os.path.join(basedir, "styles_data")
DB_FILE = os.path.join(basedir, 'sd_webui_ux.db')

# Initialize once
db_tables_pages = {
    "Styles": StylesFolderProcessor(stylesdir)
}


def styles_import_update_db(db_tables_pages, refresh=False):
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


def styles_import_refresh_db():
    logger.info("Initializing and refreshing styles database")
    styles_import_update_db(db_tables_pages, True)

def check_and_use_db_styles():
    if shared.opts.uiux_enable_sd_styles is False:
        return
    return on_ui_tabs()

#fix this we don't need to update on every restart
if os.path.exists(DB_FILE): 
    styles_import_update_db(db_tables_pages)

def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as anapnoe_sd_uiux_db_styles:
        refresh_button_styles = gr.Button("Refresh Database", elem_id="refresh_styles_database")
        refresh_button_styles.click(fn=styles_import_refresh_db, inputs=[], outputs=[])

    return (anapnoe_sd_uiux_db_styles, 'Styles DB', 'anapnoe_sd_uiux_db_styles'),

#script_callbacks.on_app_started(lambda _, app: api_uiux_style(_, app, db_tables_pages))
script_callbacks.on_app_started(api_uiux_style)
script_callbacks.on_ui_tabs(check_and_use_db_styles)

