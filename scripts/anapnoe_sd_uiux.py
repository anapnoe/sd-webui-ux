import io
import sys
import os
import subprocess
import atexit
from pathlib import Path
import gradio as gr

from dataclasses import dataclass

import modules.scripts as scripts
from modules import script_callbacks, shared
from modules.options import options_section, categories, OptionsCategory


# Create a new category
new_category_id = "anapnoe"
new_category_label = "Anapnoe UI-UX"

if new_category_id not in categories.mapping:
    current_mapping = categories.mapping
    categories.mapping = {new_category_id: OptionsCategory(new_category_id, new_category_label), **current_mapping}

# Print out the existing categories to verify
#for cat_id, category in categories.mapping.items():
#    print(f"ID: {cat_id}, Label: {category.label}")

basedir = scripts.basedir()
js_folder = os.path.join(basedir, "javascript")

mapping = [
    (info.infotext, k) for k, info in shared.opts.data_labels.items() if info.infotext
]

shared.options_templates.update(
    options_section(
        ("anapnoe-core", "User Interface", "anapnoe"),
        {
            "uiux_show_input_range_ticks": shared.OptionInfo(
                True, "Show ticks for input range slider"
            ),
            "uiux_no_slider_layout": shared.OptionInfo(False, "No input range sliders"),
            "uiux_disable_transitions": shared.OptionInfo(False, "Disable transitions"),
            "uiux_default_layout": shared.OptionInfo(
                "Auto", "Layout", gr.Radio, {"choices": ["Auto", "Desktop", "Mobile"]}
            ),
            "uiux_mobile_scale": shared.OptionInfo(
                0.7,
                "Mobile scale",
                gr.Slider,
                {"minimum": 0.5, "maximum": 1, "step": 0.05},
            ),
            "uiux_exnet_aspect_ratio_x": shared.OptionInfo(
                3,
                "AR_X",
                gr.Slider,
                {"minimum": 1, "maximum": 16, "step": 1},
            ),
            "uiux_exnet_aspect_ratio_y": shared.OptionInfo(
                4,
                "AR_Y",
                gr.Slider,
                {"minimum": 1, "maximum": 16, "step": 1},
            ),
            "uiux_exnet_fit_size": shared.OptionInfo(
                160,
                "Fit",
                gr.Slider,
                {"minimum": 100, "maximum": 240, "step": 10},
            ),
            "uiux_exnet_header_size": shared.OptionInfo(
                14,
                "Text",
                gr.Slider,
                {"minimum": 10, "maximum": 20, "step": 1},
            ),
            "uiux_exnet_image_tint": shared.OptionInfo(
                0,
                "Tint",
                gr.Slider,
                {"minimum": 0, "maximum": 1, "step": 0.1},
            ),

            "uiux_min_wrap_size": shared.OptionInfo(
                140,
                "Min Wrap Size",
                gr.Slider,
                {"minimum": 80, "maximum": 240, "step": 1},
            ),


            "uiux_show_labels_aside": shared.OptionInfo(
                False, "Show labels for aside tabs"
            ),
            "uiux_show_labels_main": shared.OptionInfo(
                False, "Show labels for main tabs"
            ),
            "uiux_show_labels_tabs": shared.OptionInfo(
                False, "Show labels for page tabs"
            ),
            "uiux_hide_extra_info": shared.OptionInfo(
                False, "Hide extra info for labels, checkboxes"
            )
        },
    )
)
shared.options_templates.update(
    options_section(
        ("anapnoe-ext", "Utils Extensions", "anapnoe"),
        {
            "uiux_enable_console_log": shared.OptionInfo(False, "Enable console log"),
            "uiux_enable_dev_mode": shared.OptionInfo(False, "Enable Development Mode (Needs Restart)"),
            "uiux_nodejs_path": shared.OptionInfo("C:/Program Files/nodejs/npm.cmd", "Dev mode set Nodejs path to compile from src (Needs Restart)"),
            "uiux_enable_theme_editor": shared.OptionInfo(True, "Enable Theme Editor (Needs Restart)"),
            "uiux_enable_event_delegation": shared.OptionInfo(False, "Enable Event Delegation for Extra Networks (Needs Restart)"),
            "uiux_max_resolution_output": shared.OptionInfo(
                2048, "Max resolution output for txt2img and img2img"
            ),
            "uiux_ignore_overrides": shared.OptionInfo(
                [],
                "Ignore Overrides",
                gr.CheckboxGroup,
                lambda: {"choices": list(mapping)},
            ),
        },
    )
)

rel_basedir = os.path.relpath(basedir, os.getcwd()).replace("\\", "/")
dev = "src" if shared.opts.uiux_enable_dev_mode else "dist"
js_code = f"""document.addEventListener('DOMContentLoaded', async() => {{
    const scriptExists = async(path) => {{
        try {{
            const response = await fetch(path, {{method: 'HEAD'}});
            return response.ok;
        }} catch {{
            return false;
        }}
    }};
    const loadScript = async() => {{
        const scriptPath = './file={rel_basedir}/javascript/{dev}/index.js';
        const exists = await scriptExists(scriptPath);
        if (exists) {{
            window.basePath = './file={rel_basedir}/';
            const script = document.createElement('script');
            script.type = 'module';
            script.src = './file={rel_basedir}/javascript/{dev}/index.js';
            document.head.appendChild(script);
            return;
        }}
        console.warn('No valid script path found');
    }};
    await loadScript();
}});"""

def create_js_file():
    js_file_path = os.path.join(js_folder, "anapnoe_sd_webui_ux.js")
    with open(js_file_path, 'w') as js_file:
        js_file.write(js_code)


class StreamToLogger(io.StringIO):
    def __init__(self, log_messages):
        super().__init__()
        self.log_messages = log_messages

    def write(self, message):
        super().write(message)
        if message.strip():
            self.log_messages.append(message.strip())
        # Also print to the original stdout (console)
        original_stdout.write(message)

    def flush(self):
        pass  # No need to implement this method

def test_function():
    print("-----------------------------------------------------")
    return ""

def check_and_create_dev():
    dev_mode_file = os.path.join(basedir, "dev.txt")
    if shared.opts.uiux_enable_dev_mode:
        if not os.path.exists(dev_mode_file):
            with open(dev_mode_file, 'w') as f:
                pass 
    else:
        if os.path.exists(dev_mode_file):
            os.remove(dev_mode_file)



def run_vite_build():
    try:
        # Call 'npm run build' 
        result = subprocess.run([shared.opts.uiux_nodejs_path, 'run', 'build'], check=True, capture_output=True, text=True, cwd=basedir) 
        print(result.stdout)
        
    except subprocess.CalledProcessError as e:
        print("Error during Vite build:")
        print(e.stderr)


def on_ui_tabs():
    #check_and_create_dev()
    create_js_file()
    log_messages = []
    
    with gr.Blocks(analytics_enabled=False) as anapnoe_sd_uiux_core:
        textbox = gr.Textbox(elm_id="pylogger", lines=10, label="Log Output", interactive=False)

        logger = StreamToLogger(log_messages)
        sys.stdout = logger  # Redirect stdout to our custom logger
        with gr.Row():
            run_button = gr.Button("Update Logs")
            vite_build = gr.Button("Vite build")
        
        def capture_logs():
            test_function()
            return "\n".join(log_messages)  # Return the concatenated log messages
        
        def run_vite_build_callback():
            run_vite_build()
            return "\n".join(log_messages)

        run_button.click(capture_logs, inputs=None, outputs=textbox)
        vite_build.click(run_vite_build_callback, inputs=None, outputs=textbox)

    return ((anapnoe_sd_uiux_core, "UI-UX Core", "anapnoe_sd_uiux_core"),)

# Save the original stdout so we can restore it later
original_stdout = sys.stdout
script_callbacks.on_ui_tabs(on_ui_tabs)

# Restore original stdout when the script ends
atexit.register(lambda: sys.stdout.close() and setattr(sys, 'stdout', original_stdout))
