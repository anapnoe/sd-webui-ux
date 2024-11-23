import os
import json
import hashlib

class StylesFolderProcessor:
    def __init__(self, styles_folder):
        self.styles_folder = styles_folder

    def calculate_sha256(self, filepath):
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            # Read and update hash string value in blocks of 4K
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def get_images_and_data(self):
        items = []
        for root, dirs, files in os.walk(self.styles_folder):
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

                    prompt = json_data.get("prompt", "")
                    if "{prompt}" in prompt:
                        prompt = prompt.replace("{prompt}, ", "")
                    item["prompt"] = (". " + prompt, "TEXT")

                    item["negative"] = (json_data.get("negative", ""), "TEXT")
                    item["extra"] = (json_data.get("extra", ""), "TEXT")
                except json.JSONDecodeError:
                    print(f"Error decoding JSON from {json_path}")

        return item


