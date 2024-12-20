import os
from pathlib import Path

from modules import shared, ui_extra_networks, sd_models, sd_vae, sysinfo

class ExtraNetworksPageCheckpoints(ui_extra_networks.ExtraNetworksPage):
    def __init__(self):
        super().__init__('Checkpoints')
        self.allow_prompt = False

    def refresh(self):
        shared.refresh_checkpoints()

    def find_preview_image(self, path):
        potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in ui_extra_networks.allowed_preview_extensions()], [])

        for file in potential_files:
            if self.lister.exists(file):
                return file

        return None

    def create_item(self, name, index=None, enable_filter=True):
        checkpoint: sd_models.CheckpointInfo = sd_models.checkpoint_aliases.get(name)
        if checkpoint is None:
            return

        path, ext = os.path.splitext(checkpoint.filename)
        mtime, ctime = self.lister.mctime(checkpoint.filename)
        hash = checkpoint.sha256 if checkpoint.sha256 else None
        stats = os.stat(checkpoint.filename)
        preview_image = self.find_preview_image(path)
        preview_path = Path(preview_image).as_posix() if preview_image else ""

        return {
            "name": (checkpoint.name_for_extra, "TEXT"),
            "filename": (checkpoint.filename, "TEXT"),
            "hash": (hash, "TEXT"),
            "preview": (preview_path, "TEXT"),
            "thumbnail": ("", "TEXT"),
            "description": (self.find_description(path), "TEXT"),
            "notes": ("", "TEXT"),
            "tags": ("", "TEXT"),         
            "local_preview": (f"{path}.{shared.opts.samples_format}", "TEXT"),
            "metadata_exists": (bool(checkpoint.metadata), "BOOLEAN"),
            "sd_version": ("Unknown", "TEXT"),
            "vae": ("None", "TEXT"),
            "type": ("Checkpoint", "TEXT"),
            "filesize": (stats.st_size, "INTEGER"),
            "date_created": (int(mtime), "INTEGER"),
            "date_modified": (int(ctime), "INTEGER"),
            "allow_update": (False, "BOOLEAN")
        }

    def list_items(self):
        # instantiate a list to protect against concurrent modification
        names = list(sd_models.checkpoints_list)
        for index, name in enumerate(names):
            item = self.create_item(name, index)
            if item is not None:
                yield item

    def allowed_directories_for_previews(self):
        return [v for v in [shared.cmd_opts.ckpt_dir, sd_models.model_path] if v is not None]
    
    def get_internal_metadata(self, name):
        checkpoint: sd_models.CheckpointInfo = sd_models.checkpoint_aliases.get(name)
        return checkpoint.metadata if checkpoint else None

    def get_available_VAE_list(self):
        choices=["Automatic", "None"] + list(sd_vae.vae_dict)
        return choices
        
