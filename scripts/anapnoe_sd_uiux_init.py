import os
import sys
import logging
from pathlib import Path
import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared, ui_extra_networks
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
from anapnoe.db_output_images import OutputImagesFolderProcessor
from anapnoe.db_styles import StylesFolderProcessor
from anapnoe.database_manager import DatabaseManager

logger = logging.getLogger(__name__)

basedir = scripts.basedir()
webuidir = Path(basedir).parents[1]
scriptsdir = os.path.join(basedir, "scripts")

imagesdir = os.path.join(webuidir, "outputs")
stylesdir = os.path.join(basedir, "styles_data")

DB_FILE = os.path.join(basedir, 'sd_webui_ux.db')
db_manager = DatabaseManager(DB_FILE)
DatabaseManager.set_instance(db_manager)

def initialize_tables():
    db_manager = DatabaseManager.get_instance()
    
    tables_to_register = [
        ("checkpoint", ExtraNetworksPageCheckpoints()),
        ("textualinversion", ExtraNetworksPageTextualInversion()),
        ("hypernetwork", ExtraNetworksPageHypernetworks()),
        ("lora", ExtraNetworksPageLora())
    ]

    if shared.opts.uiux_enable_sd_output_images:
        tables_to_register.append(("images", OutputImagesFolderProcessor(imagesdir)))
        
    if shared.opts.uiux_enable_sd_styles:
        tables_to_register.append(("styles", StylesFolderProcessor(stylesdir)))

    for table_name, processor in tables_to_register:
        db_manager.register_table_type(table_name, processor)

    missing_tables = []

    for table_name, _ in tables_to_register:
        if not db_manager.table_exists(table_name):
            missing_tables.append(table_name)

    if missing_tables:
        logger.info(f"Found {len(missing_tables)} missing tables: {', '.join(missing_tables)}")
        generator = db_manager.import_tables_generator(missing_tables, refresh=False)
        for _ in generator: 
            pass
    else:
        logger.debug("All tables already exist in database")

initialize_tables()

def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as anapnoe_sd_uiux_db:
        refresh_button = gr.Button("Refresh Database", elem_id="refresh_database")
        refresh_button.click(fn=initialize_tables, inputs=[], outputs=[])

    return (anapnoe_sd_uiux_db, 'Init DB', 'anapnoe_sd_uiux_db'),

script_callbacks.on_ui_tabs(on_ui_tabs)
