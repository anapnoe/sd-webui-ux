import os

from modules import shared, ui_extra_networks
from modules.ui_extra_networks import quote_js
from modules.hashes import sha256_from_cache


class ExtraNetworksPageHypernetworks(ui_extra_networks.ExtraNetworksPage):
    def __init__(self):
        super().__init__('Hypernetworks')

    def refresh(self):
        shared.reload_hypernetworks()

    def create_item(self, name, index=None, enable_filter=True):
        full_path = shared.hypernetworks.get(name)
        if full_path is None:
            return

        path, ext = os.path.splitext(full_path)
        mtime, ctime = self.lister.mctime(full_path)
        sha256 = sha256_from_cache(full_path, f'hypernet/{name}')
        #shorthash = sha256[0:10] if sha256 else None
        hash = sha256 if sha256 else None
        stats = os.stat(full_path)

        return {
            "name": (name, "TEXT"),
            "filename": (full_path, "TEXT"),
            "hash": (hash, "TEXT"),
            "preview": (self.find_preview(path), "TEXT"),
            "thumbnail": ("", "TEXT"),
            "description": (self.find_description(path), "TEXT"),
            "notes": ("", "TEXT"),
            "tags": ("", "TEXT"),
            "prompt": (f'<hypernet:{name}:opts.extra_networks_default_multiplier>', "TEXT"),
            "local_preview": (f"{path}.preview.{shared.opts.samples_format}", "TEXT"),
            "type": ("Hypernetwork", "TEXT"),
            "metadata_exists": (False, "BOOLEAN"), 
            "sd_version": ("Unknown", "TEXT"),
            "filesize": (stats.st_size, "INTEGER"),
            "date_created": (int(mtime), "INTEGER"),
            "date_modified": (int(ctime), "INTEGER"),
            "allow_update": (False, "BOOLEAN")
        }

    def list_items(self):
        # instantiate a list to protect against concurrent modification
        names = list(shared.hypernetworks)
        for index, name in enumerate(names):
            item = self.create_item(name, index)
            if item is not None:
                yield item

    def allowed_directories_for_previews(self):
        return [shared.cmd_opts.hypernetwork_dir]

    def get_internal_metadata(self, name):
        return None
