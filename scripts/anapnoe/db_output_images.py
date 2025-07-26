import os
import json
import hashlib
from pathlib import Path
from PIL import Image
import piexif

import logging
logger = logging.getLogger(__name__)

from modules import script_callbacks
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from starlette.responses import FileResponse

from modules.images import read_info_from_image

import gradio as gr

class OutputImagesFolderProcessor:
    _instance = None
    _api_registered = False

    allowed_dirs = set()

    def __init__(self, images_folder):
        #if OutputImagesFolderProcessor._instance:
        #    raise RuntimeError("Singleton violation")
        self.images_folder = images_folder
        self.register_page()
        OutputImagesFolderProcessor._instance = self 
        self.register_api()

    def register_api(self):
        if not self._api_registered:
            script_callbacks.on_app_started(lambda _, app: self.api_uiux_output_image(app))
            self._api_registered = True

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            raise Exception("OutputImagesFolderProcessor instance not initialized.")
        return cls._instance

    def allowed_directories_for_previews(self):
        return [self.images_folder] 

    def register_page(self):
        self.allowed_dirs.update(self.allowed_directories_for_previews())

    def calculate_sha256(self, filepath):
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def refresh(self):
        pass
    
    def list_items(self):
        items = []
        for root, dirs, files in os.walk(self.images_folder):
            if 'thumbnails' in dirs:
                dirs.remove('thumbnails')
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    image_path = os.path.join(root, file)
                    item_data = self.create_item(image_path)
                    if item_data:
                        items.append(item_data)
        return items

    def create_item(self, image_path):
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
            "type": ("Image", "TEXT"), 
            "filesize": (filesize, "INTEGER"),
            "date_created": (mtime, "INTEGER"),
            "date_modified": (ctime, "INTEGER"),
            "allow_update": (False, "BOOLEAN")
        }

        # Read image info
        try:
            image = Image.open(image_path)
            geninfo, pnginfo = read_info_from_image(image)
            if geninfo:
                #print(geninfo)
                extra = prompt = negative = ''
                prompt_parts = geninfo.split("Negative prompt:")
                if len(prompt_parts) > 1:
                    prompt = prompt_parts[0]
                    negative = prompt_parts[1]
                    extra_parts = negative.split("Steps:")
                    if len(extra_parts) > 1:
                        extra = "Steps:"+extra_parts[1]
                        negative = extra_parts[0]
                else:
                    extra_parts = geninfo.split("Steps:")
                    if len(extra_parts) > 1:
                        extra = "Steps:"+extra_parts[1]
                        prompt = extra_parts[0]

                item["prompt"] = (prompt, "TEXT")
                item["negative"] = (negative, "TEXT")
                item["extra"] = (extra, "TEXT")

        except Exception as e:
            logger.error(f"Error reading image info: {e}")

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
        

    def api_uiux_output_image(_: gr.Blocks, app: FastAPI):
        images_processor = OutputImagesFolderProcessor.get_instance()

        @app.get("/sd_image/thumb/{filename:path}")
        async def get_image(filename: str, t: str = None):
            return images_processor.fetch_file(filename)
    

