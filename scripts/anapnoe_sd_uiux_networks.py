import os
import sys
import logging
from pathlib import Path
import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared
from fastapi import FastAPI, HTTPException, Query, Body
from typing import Optional, List, Dict, Any

import launch
commit = launch.commit_hash()
tag = launch.git_tag()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if tag.startswith('f2.0.'): 
    from anapnoe.db_textual_inversion_forge import ExtraNetworksPageTextualInversion
    from anapnoe.db_lora_forge import ExtraNetworksPageLora 
else: 
    from anapnoe.db_textual_inversion import ExtraNetworksPageTextualInversion
    from anapnoe.db_lora import ExtraNetworksPageLora 

from anapnoe.db_checkpoints import ExtraNetworksPageCheckpoints
from anapnoe.db_hypernets import ExtraNetworksPageHypernetworks
from anapnoe.database_manager import DatabaseManager, api_uiux_db

logger = logging.getLogger(__name__)

basedir = scripts.basedir()
webui_dir = Path(basedir).parents[1]
scripts_folder = os.path.join(basedir, "scripts")
data_folder = os.path.join(basedir, "data")

DB_FILE = os.path.join(basedir, 'sd_webui_ux.db')
#DB_FILE = 'sd_models.db'
db_manager = DatabaseManager(DB_FILE)
DatabaseManager.set_instance(db_manager)

# Initialize the page instances once
db_tables_pages = {
    "Checkpoint": ExtraNetworksPageCheckpoints(),
    "TextualInversion": ExtraNetworksPageTextualInversion(),
    "Hypernetwork": ExtraNetworksPageHypernetworks(),
    "LORA": ExtraNetworksPageLora()
}

def extra_networks_insert_update_db(db_tables_pages):
    db_manager = DatabaseManager.get_instance()

    for type_name, page_instance in db_tables_pages.items():
        table_name = type_name.lower()
        page_instance.refresh()

        items = list(page_instance.list_items())
        if items:
            columns = {k: v[1] for k, v in items[0].items()}  # column type
            try:
                db_manager.create_table(table_name, columns)
                for item in items:
                    db_manager.insert_item(table_name, item)
            except Exception as e:
                logger.error(f"Error creating table or inserting items for {table_name}: {e}")

def extra_networks_init_refresh_db():
    logger.info("Initializing and refreshing the database")
    extra_networks_insert_update_db(db_tables_pages)

def check_and_use_db_extra_networks():
    #if shared.opts.uiux_enable_db_extra_networks is False:
    #    return
    return on_ui_tabs()


if not os.path.exists(DB_FILE): 
    extra_networks_init_refresh_db()

def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as anapnoe_sd_uiux_db_extra_networks:
        refresh_button = gr.Button("Refresh Database", elem_id="refresh_database")
        refresh_button.click(fn=extra_networks_init_refresh_db, inputs=[], outputs=[])

    return (anapnoe_sd_uiux_db_extra_networks, 'Extra Networks DB', 'anapnoe_sd_uiux_db_extra_networks'),

script_callbacks.on_app_started(lambda _, app: api_uiux_db(_, app, db_tables_pages))
script_callbacks.on_ui_tabs(check_and_use_db_extra_networks)

