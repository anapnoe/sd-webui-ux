import os
import sys
import importlib
from pathlib import Path

from modules import shared, ui_extra_networks

def import_module_from_path(module_name, paths):
    for path in paths:
        if os.path.isfile(os.path.join(path, f"{module_name}.py")):
            sys.path.insert(0, path)
            module = importlib.import_module(module_name)
            sys.path.pop(0)
            return module
    raise FileNotFoundError(f"Module file not found in specified paths: {paths}")


paths = ["extensions-builtin/LORA"]

try:
    network = import_module_from_path("network", paths)
    networks = import_module_from_path("networks", paths)
except FileNotFoundError as e:
    print(e)

class ExtraNetworksPageLora(ui_extra_networks.ExtraNetworksPage):
    def __init__(self):
        super().__init__('Lora')

    def refresh(self):
        networks.list_available_networks()
    
    def find_preview_image(self, path):
        potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in ui_extra_networks.allowed_preview_extensions()], [])

        for file in potential_files:
            if self.lister.exists(file):
                return file

        return None
    
    @staticmethod
    def add_types_to_item(item):
        return {
            "name": (item["name"], "TEXT"),
            "filename": (item["filename"], "TEXT"),
            "hash": (item["hash"], "TEXT"),
            "preview": (item["preview"], "TEXT"),
            "thumbnail": ("", "TEXT"),
            "description": (item["description"], "TEXT"),
            "notes": (item["notes"], "TEXT"),
            "tags": (item["tags"], "TEXT"),
            "local_preview": (item["local_preview"], "TEXT"),
            "metadata_exists": (item["metadata_exists"], "BOOLEAN"),
            "sd_version": (item["sd_version"], "TEXT"),
            "type": (item["type"], "TEXT"),
            "filesize": (item["filesize"], "INTEGER"),
            "date_created": (item["date_created"], "INTEGER"),
            "date_modified": (item["date_modified"], "INTEGER"),
            "prompt": (item["prompt"], "TEXT"),
            "negative_prompt": (item["negative_prompt"], "TEXT"),
            "activation_text": (item["activation_text"], "TEXT"),
            "preferred_weight": (item["preferred_weight"], "REAL"),
            "allow_update": (False, "BOOLEAN")
        }

    def create_item(self, name, index=None, enable_filter=True):
        lora_on_disk = networks.available_networks.get(name)
        if lora_on_disk is None:
            return

        path, ext = os.path.splitext(lora_on_disk.filename)
        mtime, ctime = self.lister.mctime(lora_on_disk.filename)

        alias = lora_on_disk.get_alias()
        hash = lora_on_disk.hash if lora_on_disk.hash else None
        stats = os.stat(lora_on_disk.filename)
        default_multiplier = "opts.extra_networks_default_multiplier"
        preview_image = self.find_preview_image(path)
        preview_path = Path(preview_image).as_posix() if preview_image else None
        
        item = { 
            "name": name, 
            "filename": lora_on_disk.filename, 
            "hash": hash, 
            "preview": preview_path or self.find_embedded_preview(path, name, lora_on_disk.metadata), 
            "description": self.find_description(path), 
            "notes": "", 
            "tags": "", 
            "local_preview": f"{path}.{shared.opts.samples_format}", 
            "metadata_exists": bool(lora_on_disk.metadata), 
            "sd_version": lora_on_disk.sd_version.name, 
            "type": "LORA", 
            "filesize": stats.st_size,
            "date_created": int(mtime), 
            "date_modified": int(ctime),
            "prompt" : f'<lora:{alias}:{default_multiplier}>',
        }

        self.read_user_metadata(item)
        
        item["negative_prompt"] = item["user_metadata"].get("negative text", "")
        item["activation_text"] = item["user_metadata"].get("activation text","")
        item["preferred_weight"] = item["user_metadata"].get("preferred weight", 0.0)

        sd_version = item["user_metadata"].get("sd version")
        if sd_version in network.SdVersion.__members__:
            item["sd_version"] = sd_version
            sd_version = network.SdVersion[sd_version]
        else:
            sd_version = lora_on_disk.sd_version

        return self.add_types_to_item(item)

    def list_items(self):
        # instantiate a list to protect against concurrent modification
        names = list(networks.available_networks)
        for index, name in enumerate(names):
            item = self.create_item(name, index)
            if item is not None:
                yield item

    def allowed_directories_for_previews(self):
        return [shared.cmd_opts.lora_dir, shared.cmd_opts.lyco_dir_backcompat]
    
    def get_internal_metadata(self, name):
        lora_on_disk = networks.available_networks.get(name)
        return lora_on_disk.metadata if lora_on_disk else None



