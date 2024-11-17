import os
import sys
from pathlib import Path
from typing import List, Optional 

from fastapi import FastAPI, Request, Response, Body
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared

import requests
import json

from modules.api import api
from modules.api.api import Api 


basedir = scripts.basedir()
webui_dir = Path(basedir).parents[1]
scripts_folder = os.path.join(basedir, "scripts")
data_folder = os.path.join(basedir, "data")

CIVIT_API_URL = "https://civitai.com/api/v1"

def fetch_civitai_data(endpoint: str, query_params: dict = None):
    try:
        url = f"{CIVIT_API_URL}/{endpoint}"
        response = requests.get(url, params=query_params)
        response.raise_for_status()
        data = response.json()
        return data, len(response.content)
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}, None

async def handle_request(request: Request, endpoint: str):
    try:
        request_data = await request.json()
        query_params = {
            "limit": request_data.get("limit"),
            "page": request_data.get("page"),
            "cursor": request_data.get("cursor"),
            "query": request_data.get("query"),
            "tag": request_data.get("tag"),
            "username": request_data.get("username"),
            "types": request_data.get("types"),
            "sort": request_data.get("sort"),
            "period": request_data.get("period"),
            "nsfw": request_data.get("nsfw"),
        }
        query_params = {k: v for k, v in request_data.items() if v is not None}
        #print(f"Constructed query params: {query_params}")

        result, content_length = fetch_civitai_data(endpoint, query_params)
        if content_length:
            headers = {"Content-Length": str(content_length)}
        else:
            headers = {}
        return JSONResponse(content=result, headers=headers)
    except json.JSONDecodeError as e:
        return JSONResponse(content={"error": "Invalid JSON"}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": "Internal Server Error"}, status_code=500)
    
def api_uiux_civitai(_: gr.Blocks, app: FastAPI):
    '''
    @app.middleware("http")
    async def prevent_gzip_middleware(request: Request, call_next):
        if request.url.path.startswith("/sd_webui_ux/civitai_proxy/"):
            request.scope['headers'] = [(k, v) for k, v in request.scope['headers'] if k.lower() != b'accept-encoding']
        response = await call_next(request)
        return response
    '''
    
    @app.post("/sd_webui_ux/civitai_proxy/models")
    async def handle_models_request(request: Request):
        return await handle_request(request, "models")

    @app.post("/sd_webui_ux/civitai_proxy/images")
    async def handle_images_request(request: Request):
        return await handle_request(request, "images")

    @app.post("/sd_webui_ux/civitai_proxy/creators")
    async def handle_creators_request(request: Request):
        return await handle_request(request, "creators")

    @app.post("/sd_webui_ux/civitai_proxy/tags")
    async def handle_tags_request(request: Request):
        return await handle_request(request, "tags")

script_callbacks.on_app_started(api_uiux_civitai)

def check_and_use_civitai():
    if shared.opts.uiux_enable_civitai_explorer is False:
        return
    return on_ui_tabs()

def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as anapnoe_sd_uiux_civitai:
        pass

    return (anapnoe_sd_uiux_civitai, 'CivitAI Explorer', 'anapnoe_sd_uiux_civitai'),

script_callbacks.on_ui_tabs(check_and_use_civitai)

