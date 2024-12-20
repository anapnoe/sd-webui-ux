import os
from pathlib import Path
from modules import ui_extra_networks, sd_hijack, shared



class ExtraNetworksPageTextualInversion(ui_extra_networks.ExtraNetworksPage):
    def __init__(self):
        super().__init__('Textual Inversion')
        self.allow_negative_prompt = True

    def refresh(self):
        sd_hijack.model_hijack.embedding_db.load_textual_inversion_embeddings(force_reload=True)
    
    def find_preview_image(self, path):
        potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in ui_extra_networks.allowed_preview_extensions()], [])

        for file in potential_files:
            if self.lister.exists(file):
                return file

        return None

    def create_item(self, name, index=None, enable_filter=True):
        embedding = sd_hijack.model_hijack.embedding_db.word_embeddings.get(name)
        if embedding is None:
            return

        path, ext = os.path.splitext(embedding.filename)
        mtime, ctime = self.lister.mctime(embedding.filename)
        hash = embedding.hash if embedding.hash else None
        stats = os.stat(embedding.filename)
        preview_image = self.find_preview_image(path)
        preview_path = Path(preview_image).as_posix() if preview_image else ""

        return {
            "name": (name, "TEXT"),
            "filename": (embedding.filename, "TEXT"),
            "hash": (hash, "TEXT"),
            "preview": (preview_path, "TEXT"),
            "thumbnail": ("", "TEXT"),
            "description": (self.find_description(path), "TEXT"),
            "notes": ("", "TEXT"),
            "tags": ("", "TEXT"),
            "prompt": (embedding.name, "TEXT"),
            "local_preview": (f"{path}.{shared.opts.samples_format}", "TEXT"),
            "type": ("TextualInversion", "TEXT"),
            "metadata_exists": (False, "BOOLEAN"), 
            "sd_version": ("Unknown", "TEXT"),
            "filesize": (stats.st_size, "INTEGER"),
            "date_created": (int(mtime), "INTEGER"),
            "date_modified": (int(ctime), "INTEGER"),
            "allow_update": (False, "BOOLEAN")
        }
    

    def list_items(self):
        # instantiate a list to protect against concurrent modification
        names = list(sd_hijack.model_hijack.embedding_db.word_embeddings)
        for index, name in enumerate(names):
            item = self.create_item(name, index)
            if item is not None:
                yield item

    def allowed_directories_for_previews(self):
        return list(sd_hijack.model_hijack.embedding_db.embedding_dirs)

    def get_internal_metadata(self, name):
        return None
