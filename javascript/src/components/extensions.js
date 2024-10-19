import {DEFAULT_PATH, DEFAULT_CSS_PATH} from "../constants.js";

async function createDynamicTabButton(id, name, targetSelector) {
    const buttonContainer = document.querySelector(targetSelector);

    const buttonTemplate = `
        <button tabItemId="#split-app, #${id}_tabitem" 
                tabGroup="main_group" 
                data-click="#tabs" 
                onclick="mainTabs(this, '#${id}')" 
                class="xtabs-tab">
            <div class="icon-letters">${name.slice(0, 2)}</div>
            <span>${name}</span>
        </button>`;

    const temp = document.createElement('div');
    temp.innerHTML = buttonTemplate;
    const button = temp.firstElementChild;

    buttonContainer.append(button);
}

async function createDynamicTabView(id) {
    const viewContainer = document.querySelector(`#split-left`);

    const viewTemplate = `
        <div id="${id}_tabitem" class="xtabs-item other">
            <div data-parent-selector="gradio-app" data-selector="#${id} > div" class="portal"></div>
        </div>`;

    const temp = document.createElement('div');
    temp.innerHTML = viewTemplate;
    const view = temp.firstElementChild;

    viewContainer.append(view);
}

async function createTabsForExtensions() {
    let excludedTabs = [
        "tab_txt2img",
        "tab_img2img",
        "tab_extras",
        "tab_pnginfo",
        "tab_train",
        "tab_modelmerger",
        "tab_settings",
        "tab_extensions",
        "tab_deforum_interface",
        "tab_infinite-image-browsing",
        "tab_anapnoe_dock",
        "tab_anapnoe_sd_uiux_core",
        "tab_space",
    ];

    /*
    if(!IS_BACKEND_OPTIMIZED){
        excludedTabs = excludedTabs.filter(tab => tab !== "tab_anapnoe_sd_uiux_core");
    }
    */

    const tabs = document.querySelectorAll(`#tabs > .tabitem`);

    for (const tab of tabs) {
        const cid = tab.id;
        const nid = cid.split('tab_')[1];

        if (!excludedTabs.includes(cid) && !cid.startsWith("tab_ui_theme")) {
            await Promise.all([
                createDynamicTabButton(cid, nid, '#other_extensions'),
                createDynamicTabView(cid)
            ]);
        }
    }
}

function normalizePath(path) {
    return path.replace(/\\/g, '/');
}

function unNormalizePath(path) {
    // escape twice
    return path.replace(/\//g, '\\\\');
}

function injectStylesToIframe(iframeSelector, styles) {
    const iframe = document.querySelector(iframeSelector);
    if (iframe) {
        const injectStyles = (iframeDoc) => {
            styles.forEach(style => {
                const styleLink = document.querySelector(`link[rel="stylesheet"][href*="${style}"]`);
                if (styleLink) {
                    const clonedStyle = styleLink.cloneNode();
                    iframeDoc.appendChild(clonedStyle);
                }
            });
        };

        if (iframe.contentDocument.readyState === 'complete') {
            injectStyles(iframe.contentDocument.head);
        } else {
            iframe.addEventListener("load", (ev) => {
                injectStyles(ev.target.contentDocument.head);
            }, {once: true}); // `{ once: true }` to ensure the listener is removed
        }
    }
}

function injectStylesTo(styles, element, referenceElement) {
    for (const style of styles) {
        const existingStyle = element.querySelector(`link[rel="stylesheet"][href*="${DEFAULT_CSS_PATH}${style}"]`);

        if (!existingStyle) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${DEFAULT_CSS_PATH}${style}`;
            link.onload = () => {
                console.log(`Stylesheet ${style} loaded successfully.`);
            };
            link.onerror = () => {
                console.error(`Error loading stylesheet ${style}.`);
            };

            if (referenceElement) {
                element.insertBefore(link, referenceElement.nextSibling); // Insert after the reference element
            } else {
                element.appendChild(link); // Append at the end if no reference element
            }
        }
    }
}

function injectStylesToHead(styles) {
    const head = document.head;
    injectStylesTo(styles, head);
}

function injectStylesAfterUIUX(styles) {
    const body = document.body;
    const existingStyle = body.querySelector('link[rel="stylesheet"][href*="sd-webui-ux"]');

    if (existingStyle) {
        injectStylesTo(styles, body, existingStyle);
    } else {
        injectStylesTo(styles, body);
        console.warn('The sd-webui-ux/style.css is not found in the body.');
    }
}


function replaceStylesheet(oldStyleName, newStyleName, element) {
    //const unpath = unNormalizePath(DEFAULT_PATH);
    //const existingStyle = element.querySelector(`link[rel="stylesheet"][href*="${unpath}${oldStyleName}"]`) || element.querySelector(`link[rel="stylesheet"][href*="${DEFAULT_PATH}${oldStyleName}"]`);
    const existingStyles = Array.from(element.querySelectorAll(`link[rel="stylesheet"][href*="${oldStyleName}"]`));
    const existingStyle = existingStyles.find(link => link.href.includes(`sd-webui-ux`) && link.href.includes(oldStyleName));
    if (existingStyle) {
        injectStylesTo([newStyleName], element, existingStyle);
        existingStyle.parentNode.removeChild(existingStyle);
        console.log(`Removed existing stylesheet: ${oldStyleName}`);
    } else {
        console.warn(`No existing stylesheet found: ${oldStyleName}`);
    }

}

export {createTabsForExtensions, injectStylesToIframe, injectStylesToHead, injectStylesAfterUIUX, replaceStylesheet};
