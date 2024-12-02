import os
import json
import hashlib
from pathlib import Path

import logging
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from starlette.responses import FileResponse

import gradio as gr

class StylesFolderProcessor:
    _instance = None

    allowed_dirs = set()

    def __init__(self, styles_folder):
        self.styles_folder = styles_folder
        self.register_page()
        StylesFolderProcessor._instance = self 

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise Exception("StylesFolderProcessor instance not initialized.")
        return cls._instance

    def allowed_directories_for_previews(self):
        return [self.styles_folder]  # Allow the styles folder

    def register_page(self):
        self.allowed_dirs.update(self.allowed_directories_for_previews())

    def calculate_sha256(self, filepath):
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def get_images_and_data(self):
        items = []
        for root, dirs, files in os.walk(self.styles_folder):
            if 'thumbnails' in dirs:
                dirs.remove('thumbnails')
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    image_path = os.path.join(root, file)
                    json_path = os.path.splitext(image_path)[0] + '.json'
                    item_data = self.create_item(image_path, json_path)
                    if item_data:
                        items.append(item_data)
        return items

    def create_item(self, image_path, json_path):
        stats = os.stat(image_path)
        mtime = int(stats.st_mtime)
        ctime = int(stats.st_ctime)
        filesize = stats.st_size

        # SHA256 hash 
        hash_sha256 = self.calculate_sha256(image_path)

        # Initialize values and types
        item = {
            "name": (os.path.splitext(os.path.basename(image_path))[0], "TEXT"),
            "filename": (image_path, "TEXT"),
            "hash": (hash_sha256, "TEXT"),
            "thumbnail": ("", "TEXT"),
            "description": ("", "TEXT"),
            "tags": ("", "TEXT"),
            "prompt": ("", "TEXT"),
            "negative": ("", "TEXT"),
            "extra": ("", "TEXT"),
            "local_preview": (image_path, "TEXT"),
            "sd_version": ("Unknown", "TEXT"),
            "type": ("Style", "TEXT"), 
            "filesize": (filesize, "INTEGER"),
            "date_created": (mtime, "INTEGER"),
            "date_modified": (ctime, "INTEGER"),
            "allow_update": (False, "BOOLEAN")
        }

        # Check JSON metadata
        if os.path.exists(json_path):
            with open(json_path, 'r') as json_file:
                try:
                    json_data = json.load(json_file)
                    item["description"] = (json_data.get("description", ""), "TEXT")
                    item["prompt"] = (json_data.get("prompt", ""), "TEXT")
                    item["negative"] = (json_data.get("negative", ""), "TEXT")
                    item["extra"] = (json_data.get("extra", ""), "TEXT")
                except json.JSONDecodeError:
                    print(f"Error decoding JSON from {json_path}")

        return item
    

    def fetch_file(self, filename: str):
        # Normalize resolve path
        filename_path = Path(filename).resolve()

        if not filename_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Normalize allowed_dirs
        normalized_allowed_dirs = [Path(allowed_dir).resolve() for allowed_dir in self.allowed_dirs]

        if not any(filename_path.is_relative_to(allowed_dir) for allowed_dir in normalized_allowed_dirs):
            raise HTTPException(status_code=403, detail="Access denied to this file.")

        ext = filename_path.suffix.lower()[1:]
        if ext not in ['webp', 'png', 'jpg', 'jpeg', 'gif']: 
            raise HTTPException(status_code=403, detail="File type not allowed.")

        return FileResponse(str(filename_path), headers={"Accept-Ranges": "bytes"})
        

    #def add_pages_to_demo(self, app: FastAPI):
    #    app.add_api_route("/sd_styles/thumb/{filename}", self.fetch_file, methods=["GET"])


def api_uiux_style(_: gr.Blocks, app: FastAPI):
    styles_processor = StylesFolderProcessor.get_instance()

    @app.get("/sd_styles/thumb/{filename:path}")
    async def get_image(filename: str, timestamp: str = None):
        return styles_processor.fetch_file(filename)


'''
def api_uiux_style(_: gr.Blocks, app: FastAPI):

    @app.get("/sd_styles/thumb/{filename:path}")
    async def get_image(filename: str):

        if not os.path.isfile(filename):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(filename)


try:
    import modules.script_callbacks as script_callbacks
    script_callbacks.on_app_started(api_uiux_style)
except Exception:
    logger.warn("Unable to mount Styles API.")

'''
