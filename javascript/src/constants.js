import {replaceStylesheet} from "./components/extensions.js";
export const IS_BACKEND_OPTIMIZED = window.basePath.includes("builtin");

export const REPO_NAME = "anapnoe/stable-diffusion-webui-ux";
export const REPO_NAME_UPSTREAM = "AUTOMATIC1111/stable-diffusion-webui";

export const ANAPNOE_APP_ID = "#anapnoe_app";
export const ANAPNOE_APP_VER = "0.1.0";
export const DEFAULT_PATH = window.basePath;
export const DEFAULT_ASSETS_PATH = `${DEFAULT_PATH}assets/`;
export const DEFAULT_CSS_PATH = `${DEFAULT_ASSETS_PATH}css/`;
export const DEFAULT_LIBS_PATH = `${DEFAULT_PATH}javascript/libs/`;
export const DEFAULT_TEMPLATES_PATH = `${DEFAULT_ASSETS_PATH}templates/`;
export const DEFAULT_TEMPLATES_UIUX_GRADIO_3 = `${DEFAULT_TEMPLATES_PATH}uiux-gradio-3/`;
export const DEFAULT_TEMPLATES_FORGE_GRADIO_4 = `${DEFAULT_TEMPLATES_PATH}forge-gradio-4/`;

export const EXTENSION_TEMPLATE_MAP = {
    'template-deforum-params.html': 'deforum',
    'template-deforum-results.html': 'deforum',
    'template-stylez.html': 'enable_Stylez'
};

export const CSS_INCLUDES = [
    /*'style-gradio-4.css',*/
    /*
    'uiux-logger.css',
    'uiux-extentions.css',
    'uiux-extra-networks.css',
    'uiux-settings.css',
    'uiux-range.css',
    'uiux-gradio.css'
    */
    /*'style-v2.css',*/
    'uiux-icons.css',
    'uiux-theme-editor.css',
    'uiux-deforum.css',
    'uiux-iibrowser.css',
    'uiux-physton.css'
];

let cachedAnapnoeApp = null;
const getAnapnoeApp = () => {
    if (!cachedAnapnoeApp) {
        cachedAnapnoeApp = document.querySelector(ANAPNOE_APP_ID);
    }
    return cachedAnapnoeApp;
};
export {getAnapnoeApp};

let cachedAnapnoeTabContent = null;
const getAnapnoeTabContent = () => {
    if (!cachedAnapnoeTabContent) {
        cachedAnapnoeTabContent = document.getElementById('tab_anapnoe_sd_uiux_core');
    }
    return cachedAnapnoeTabContent;
};
export {getAnapnoeTabContent};

let cachedGradioApp = null;
const getGradioApp = () => {
    if (!cachedGradioApp) {
        cachedGradioApp = document.querySelector('gradio-app');
    }
    return cachedGradioApp;
};
export {getGradioApp};

let cachedLoggerUiUx = null;
const getLoggerUiUx = () => {
    if (!cachedLoggerUiUx) {
        cachedLoggerUiUx = document.getElementById('loggerUiUx');
    }
    return cachedLoggerUiUx;
};
export {getLoggerUiUx};

let cachedPopupUiUx = null;
const getPopupUiUx = () => {
    if (!cachedPopupUiUx) {
        cachedPopupUiUx = document.getElementById('loggerUiUx');
    }
    return cachedPopupUiUx;
};
export {getPopupUiUx};


export const VERSION_DATA = {};
let cachedVersion = null;

const fetchAndCacheVersionData = () => {
    if (!cachedVersion) {
        const versions = getGradioApp().querySelector(".versions");

        if (!versions) {
            console.error("Versions element not found");
            return;
        }

        cachedVersion = versions.innerHTML
            .replace(REPO_NAME_UPSTREAM, REPO_NAME)
            .replace(/\n/g, '')
            .split("• ");

        //const backendOptimizedItem = `backend_optimizations_enabled: ${IS_BACKEND_OPTIMIZED}`;
        //cachedVersion.push(backendOptimizedItem);

        cachedVersion.forEach(item => {
            const [key, value] = item.split(":").map(str => str.trim());
            if (key && value) {
                VERSION_DATA[key] = value;
            }
        });

        const baseVersion = VERSION_DATA.version.split(".")[0];
        const variant = baseVersion.includes("f") ? "forge" : "AUTOMATIC1111";
        const gradio_major = parseInt(VERSION_DATA.gradio, 10);
        VERSION_DATA["variant"] = variant;
        VERSION_DATA["gradio_major"] = gradio_major;
    }
    return cachedVersion;
};

export {fetchAndCacheVersionData};


let cacheDefaultTemplatePath = null;
const getDefaultTemplatesPath = () => {
    if (!cacheDefaultTemplatePath) {
        cacheDefaultTemplatePath = DEFAULT_TEMPLATES_UIUX_GRADIO_3;
        if (VERSION_DATA.gradio_major > 3 && VERSION_DATA.variant === "forge") {
            cacheDefaultTemplatePath = DEFAULT_TEMPLATES_FORGE_GRADIO_4;
        }
    }
    return cacheDefaultTemplatePath;
};
export {getDefaultTemplatesPath};



