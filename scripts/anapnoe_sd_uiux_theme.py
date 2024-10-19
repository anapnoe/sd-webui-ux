import os
from pathlib import Path
import gradio as gr
import modules.scripts as scripts
from modules import script_callbacks
import importlib.util
from modules import shared

basedir = scripts.basedir()
webui_dir = Path(basedir).parents[1]
scripts_folder = os.path.join(basedir, "scripts")
themes_folder = os.path.join(basedir, "themes")
webui_style_path = os.path.join(webui_dir, "user.css")

def check_and_create_user_css():
    if not os.path.exists(webui_style_path):
        theme_css_path = os.path.join(themes_folder, 'ae_v1_alpha.css')
        if os.path.exists(theme_css_path):
            with open(theme_css_path, 'r', encoding='utf-8') as theme_file:
                theme_css_content = theme_file.read()
            style_data = ":root{" + theme_css_content + "}/*BREAKPOINT_CSS_CONTENT*//*BREAKPOINT_CSS_CONTENT*/"
            with open(webui_style_path, 'w', encoding='utf-8') as user_css_file:
                user_css_file.write(style_data)

def get_files(folder, file_filter=None, split=False):
    if file_filter is None:
        file_filter = []
    file_list = [
        file_name if not split else os.path.splitext(file_name)[0]
        for file_name in os.listdir(folder)
        if os.path.isfile(os.path.join(folder, file_name)) and file_name not in file_filter
    ]
    return file_list

def dynamic_load_ui_tabs():
    ui_theme_v2_path = os.path.join(scripts_folder, 'ui_theme_v2.py')
    if os.path.exists(ui_theme_v2_path):
        spec = importlib.util.spec_from_file_location("ui_theme_v2", ui_theme_v2_path)
        ui_theme_v2_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ui_theme_v2_module)

        if hasattr(ui_theme_v2_module, 'on_ui_tabs'):
            return ui_theme_v2_module.on_ui_tabs

    return on_ui_tabs

def check_and_use_theme_v2():
    ui_theme_v2_path = os.path.join(scripts_folder, 'ui_theme_v2.py')
    if os.path.exists(ui_theme_v2_path) or shared.opts.uiux_enable_theme_editor is False:
        return  # Do not execute on_ui_tabs if ui_theme_v2.py is present
    # If ui_theme_v2.py is not present, call the on_ui_tabs function to create UI
    return on_ui_tabs()

def on_ui_tabs():
    check_and_create_user_css()
    with gr.Blocks(analytics_enabled=False) as ui_theme:
        with gr.Row():
            with gr.Column():
                with gr.Row():
                    themes_dropdown = gr.Dropdown(
                        label="Themes",
                        elem_id="themes_drop_down",
                        interactive=True,
                        choices=get_files(themes_folder, [".css", ".txt"]),
                        type="value"
                    )
                    save_as_filename = gr.Text(label="Save / Save as")
                with gr.Row():
                    gr.Button(elem_id="theme_reset_btn", value="Reset", variant="primary") 
                    save_button = gr.Button(value="Save", variant="primary")

        with gr.Row(elem_id="theme_hidden"):
            vars_text = gr.Textbox(label="Vars", elem_id="theme_vars", show_label=True, lines=7, interactive=False, visible=True)
            css_text = gr.Textbox(label="Css", elem_id="theme_css", show_label=True, lines=7, interactive=False, visible=True)

        with gr.Accordion(label="Theme Color adjustments", open=True, elem_classes="no-drag"):
            with gr.Row():
                with gr.Column(elem_id="ui_theme_hsv"):
                    gr.Slider(elem_id="theme_hue", label='Hue', minimum=0, maximum=360, step=1)
                    gr.Slider(elem_id="theme_sat", label='Saturation', minimum=-100, maximum=100, step=1, value=0, interactive=True)
                    gr.Slider(elem_id="theme_brt", label='Lightness', minimum=-50, maximum=50, step=1, value=0, interactive=True)
                gr.Button(elem_id="theme_invert_btn", value="Invert", variant="primary")

        with gr.Column(elem_id="ui_theme_settings"):
            with gr.Accordion(label="Main", open=False, elem_classes="no-drag"):
                gr.ColorPicker(elem_id="--ae-main-bg-color", interactive=True, label="Background color")
                gr.ColorPicker(elem_id="--ae-primary-color", label="Primary color")
                gr.ColorPicker(elem_id="--ae-secondary-color", label="Secondary color")

            with gr.Accordion(label="Spacing", open=False, elem_classes="no-drag"):
                gr.Slider(elem_id="--ae-gap-size-val", label='Gap size', minimum=0, maximum=8, step=1)

            with gr.Accordion(label="Panel", open=False, elem_classes="no-drag"):
                gr.ColorPicker(elem_id="--ae-panel-bg-color", label="Panel background color")
                gr.ColorPicker(elem_id="--ae-panel-border-color", label="Panel border color")
                gr.Slider(elem_id="--ae-panel-padding", label='Panel padding', minimum=0, maximum=10, step=1)
                gr.Slider(elem_id="--ae-border-radius", label='Panel border radius', minimum=0, maximum=8, step=1)
                gr.Slider(elem_id="--ae-border-size", label='Panel border size', minimum=0, maximum=4, step=1)

            with gr.Accordion(label="Component", open=False, elem_classes="no-drag"):
                gr.Slider(elem_id="--ae-input-height", label='Component size', minimum=28, maximum=45, step=1)
                gr.Slider(elem_id="--ae-input-slider-height", label='Slider height', minimum=0.1, maximum=1, step=0.1)
                gr.Slider(elem_id="--ae-input-padding", label='Padding', minimum=0, maximum=10, step=1)
                gr.Slider(elem_id="--ae-input-font-size", label='Font size', minimum=10, maximum=16, step=1)
                gr.Slider(elem_id="--ae-input-line-height", label='Line height', minimum=10, maximum=40, step=1)
                gr.Slider(elem_id="--ae-input-border-size", label='Border size', minimum=0, maximum=4, step=1)
                gr.Slider(elem_id="--ae-input-border-radius", label='Border radius', minimum=0, maximum=8, step=1)
                gr.ColorPicker(elem_id="--ae-input-bg-color", label="Input background color")
                gr.ColorPicker(elem_id="--ae-input-border-color", label="Input border color")
                gr.ColorPicker(elem_id="--ae-input-text-color", label="Input text color")
                gr.ColorPicker(elem_id="--ae-input-placeholder-color", label="Input placeholder color")
                gr.ColorPicker(elem_id="--ae-label-color", label="Label color")
                gr.ColorPicker(elem_id="--ae-secondary-label-color", label="Secondary label color")
                gr.ColorPicker(elem_id="--ae-input-hover-text-color", label="Input hover text color")

            with gr.Accordion(label="Group", open=False, elem_classes="no-drag"):
                gr.ColorPicker(elem_id="--ae-group-bg-color", label="Group background color")
                gr.ColorPicker(elem_id="--ae-group-border-color", label="Group border color")
                gr.Slider(elem_id="--ae-group-padding", label='Group padding', minimum=0, maximum=10, step=1)
                gr.Slider(elem_id="--ae-group-radius", label='Group border radius', minimum=0, maximum=8, step=1)
                gr.Slider(elem_id="--ae-group-border-size", label='Group border size', minimum=0, maximum=4, step=1)
                gr.Slider(elem_id="--ae-group-gap", label='Group gap size', minimum=0, maximum=8, step=1)

        def save_theme(vars_text, css_text, filename):
            style_data = ":root{" + vars_text + "}" + css_text
            with open(os.path.join(themes_folder, f"{filename}.css"), 'w', encoding="utf-8") as file:
                file.write(vars_text)
            with open(webui_style_path, 'w', encoding="utf-8") as file:
                file.write(style_data)
            themes_dropdown.choices = get_files(themes_folder, [".css", ".txt"])
            return gr.update(choices=themes_dropdown.choices, value=f"{filename}.css")

        def open_theme(filename):
            with open(os.path.join(themes_folder, filename), 'r') as file:
                vars_text = file.read()
            no_ext = filename.rsplit('.', 1)[0]
            return [vars_text, no_ext]

        save_button.click(
            fn=save_theme,
            inputs=[vars_text, css_text, save_as_filename],
            outputs=themes_dropdown
        )

        themes_dropdown.change(
            fn=open_theme,
            inputs=[themes_dropdown],
            outputs=[vars_text, save_as_filename]
        )

    return (ui_theme, 'Theme', 'ui_theme'),

script_callbacks.on_ui_tabs(check_and_use_theme_v2)
