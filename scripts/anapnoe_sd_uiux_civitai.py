
import os
import sys
from pathlib import Path
from typing import List, Optional 

from fastapi import FastAPI, Request, Response, Body
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks, shared

import asyncio
import requests
import json
import httpx

from modules.api import api
from modules.api.api import Api 

basedir = scripts.basedir()
webui_dir = Path(basedir).parents[1]
scripts_folder = os.path.join(basedir, "scripts")
data_folder = os.path.join(basedir, "data")

CIVIT_API_URL = "https://civitai.com/api/v1" 
MAX_RETRIES = 3
INITIAL_DELAY = 0.5

async def fetch_civitai_data(endpoint: str, params: dict):
    delay = INITIAL_DELAY
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(f"{CIVIT_API_URL}/{endpoint}", params=params)
                r.raise_for_status()
                return r.json(), len(r.content)
        
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            if attempt == MAX_RETRIES:
                return {"error": str(e)}, None
            
            await asyncio.sleep(delay)
            delay *= 2  # Exponential backoff

async def handle_request(request: Request, endpoint: str):
    try:
        request_data = await request.json()
        params = {k: v for k, v in request_data.items() if v is not None}
        
        result, content_length = await fetch_civitai_data(endpoint, params)
        headers = {"Content-Length": str(content_length)} if content_length else {}
        
        return JSONResponse(result, headers=headers)
    
    except json.JSONDecodeError:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": f"Internal error: {str(e)}"}, status_code=500)
    

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

