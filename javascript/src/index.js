import {getGradioApp, getAnapnoeApp, getAnapnoeTabContent, IS_BACKEND_OPTIMIZED, CSS_INCLUDES, DEFAULT_ASSETS_PATH, VERSION_DATA} from './constants.js';
import {setupLogger} from './components/logger.js';
import {loadTemplates} from './components/templates.js';
import {setupAnimations, detectHoverOnElements, countEventListeners} from './utils/helpers.js';
import {initUiUxComponents} from './components/components.js';
import {removeRedundantExtraNetworks, removeStyleAssets} from './components/optimizations.js';
import {showContributors, showMembers} from './utils/api_external.js';
import {switchMobile} from './utils/mobile.js';
import {uiuxOptionSettings} from './components/settings.js';
import {localStorageWrapper, onLocalStorageChange} from './utils/storage.js';
import {setupGenerateObservers, setupCheckpointChangeObserver} from './utils/observers.js';
import {createTabsForExtensions, injectStylesToIframe, injectStylesAfterUIUX, replaceStylesheet} from './components/extensions.js';
import {setupThemeEditor} from './components/theme_editor.js';
import {UIUX} from './utils/module.js';
import {setupCivitaiExplorerImages, setupCivitaiExplorerModels} from './components/civitai_explorer.js';
import {setupExtraNetworkCheckpoints, setupExtraNetworkTextualinversion, setupExtraNetworkLora, setupExtraNetworkHypernetworks} from './components/extra_networks.js';
import {setupSdStyles} from './components/sd_styles.js';
import {setupSdOutputImages} from './components/sd_output_images.js';
function onUiUxReady(content_div) {

    const logger_screen = document.querySelector("#logger_screen");
    if (logger_screen) {
        const asideconsole = document.querySelector("#container-console-log");
        asideconsole.append(getLoggerUiUx());
        logger_screen.remove();
    }

    console.log("Finishing optimizations for Extra Networks");

    setupGenerateObservers();
    uiuxOptionSettings();
    showContributors();
    showMembers();
    switchMobile();
    //setupCheckpointChangeObserver();

    document.querySelectorAll("#txt2img_styles_edit_button, #img2img_styles_edit_button").forEach((elm) => {
        elm.addEventListener("click", function(e) {
            window.popup_trigger.click();
            //appendPopupContent();
        });
    });


    function setFocusPrompt(id) {
        UIUX.FOCUS_PROMPT = id.includes("txt2img") ? "txt2img" : "img2img";
    }

    document.querySelectorAll("#txt2img_prompt textarea, #img2img_prompt textarea, #txt2img_neg_prompt textarea, #img2img_neg_prompt textarea").forEach(elm => {
        elm.addEventListener("focus", (e) => {
            const closestId = e.target.closest(".gradio-textbox").id;
            setFocusPrompt(closestId);
        });
    });

    /*
    document.querySelectorAll("#txt2img_nav, #img2img_nav").forEach(button => {
        button.addEventListener("click", (e) => {
            const closestId = e.target.id;
            setFocusPrompt(closestId);
        });
    });
    */

    document.querySelectorAll("#about_tabitem img").forEach((img) => {
        const originalSrc = img.getAttribute('data-src');
        if (originalSrc) {
            img.src = originalSrc.replace("file=extensions/sd-webui-ux/assets/", `${DEFAULT_ASSETS_PATH}`);
        }
    });

    window.UIUX = UIUX;

    localStorageWrapper.setItem('UiUxComplete', "true");

    if (window.opts.uiux_enable_theme_editor) {
        setupThemeEditor();
    }

    if (window.opts.uiux_enable_civitai_explorer) {
        const caiexp = document.querySelector("#civitai_explorer_nav");
        caiexp.classList.remove("hidden");
        const civitai_nav_images = document.querySelector("#civitai_nav_images");
        const civitai_nav_models = document.querySelector("#civitai_nav_models");
        civitai_nav_images.addEventListener('click', () => {
            setupCivitaiExplorerImages();
        }, {once: true});
        civitai_nav_models.addEventListener('click', () => {
            setupCivitaiExplorerModels();
        }, {once: true});
    }

    const textual_inversion_nav = document.querySelector("#textual_inversion_nav");
    const lora_nav = document.querySelector("#lora_nav");
    const hypernetwork_nav = document.querySelector("#hypernetwork_nav");

    setTimeout(() => {
        setupExtraNetworkCheckpoints();
    }, 500);

    textual_inversion_nav.addEventListener('click', () => {
        setupExtraNetworkTextualinversion();
    }, {once: true});
    lora_nav.addEventListener('click', () => {
        setupExtraNetworkLora();
    }, {once: true});
    hypernetwork_nav.addEventListener('click', () => {
        setupExtraNetworkHypernetworks();
    }, {once: true});

    if (window.opts.uiux_enable_sd_styles) {
        const sd_styles_nav = document.querySelector("#sd_styles_nav");
        sd_styles_nav.classList.remove("hidden");
        sd_styles_nav.addEventListener('click', () => {
            setupSdStyles();
        }, {once: true});
    }

    if (window.opts.uiux_enable_sd_output_images) {
        const sd_output_images_nav = document.querySelector("#sd_output_images_nav");
        sd_output_images_nav.classList.remove("hidden");
        sd_output_images_nav.addEventListener('click', () => {
            setupSdOutputImages();
        }, {once: true});
    }

    detectHoverOnElements(".layout-extra-networks");

    if (!IS_BACKEND_OPTIMIZED) {
        document.querySelector("#github-project-link").href = "https://github.com/anapnoe/sd-webui-ux"
    }

    const totalListeners = countEventListeners(document.body);
    //console.warn(`Total event listeners: ${totalListeners}`);

}


async function initApp() {

    const anapnoeApp = getAnapnoeApp();
    const gradioApp = getGradioApp();

    await createTabsForExtensions();
    gradioApp.insertAdjacentElement('afterbegin', anapnoeApp);

    const stopListening = onLocalStorageChange((key, value) => {
        if (key === 'UiUxReady' && value === "true") {
            onUiUxReady(anapnoeApp);
            stopListening();
        }
    }, 'UiUxReady'); // Get the initial value of 'UiUxReady'

    (async() => {
        await initUiUxComponents(anapnoeApp);
    })();

    setupAnimations();
    setTimeout(() => {
        const iibrowserStylesToInject = ["user.css", "uiux-iibrowser.css"];
        injectStylesToIframe("#infinite_image_browsing_container_wrapper iframe", iibrowserStylesToInject);
    }, 3000);
}

async function run() {
    try {
        setupLogger();
        console.log('Starting DOM Optimizations');
        removeRedundantExtraNetworks();
        removeStyleAssets();
        console.log('Finishing DOM Optimizations');

        //if (!IS_BACKEND_OPTIMIZED) {
        injectStylesAfterUIUX(CSS_INCLUDES);
        //}

        if (VERSION_DATA.gradio_major > 3) {
            replaceStylesheet("style.css", "style-gradio-4.css", document.body);
        }

        (async() => {
            await loadTemplates();
            await initApp();
        })();
    } catch (error) {
        console.error("Error in run sequence:", error);
    }
}

function observeGradioInit() {
    localStorage.setItem('UiUxReady', "false");
    localStorage.setItem('UiUxComplete', "false");

    if (!document.getElementById("logger_screen")) {
        const tempDiv = document.createElement('div');
        tempDiv.id = "logger_screen";
        tempDiv.style = `position: fixed; inset: 0; background-color: black; z-index: 99999; display: flex; flex-direction: column; overflow:auto;`;
        const logger = document.createElement('div');
        logger.id = "loggerUiUx";
        tempDiv.append(logger);
        document.body.append(tempDiv);
    }

    const observer = new MutationObserver(async() => {
        const block = getAnapnoeTabContent();
        if (block && window.opts && Object.keys(window.opts).length) {
            observer.disconnect();
            try {
                await run(); // Call the run function
            } catch (error) {
                console.error("Error running the function:", error);
            }
        }
    });

    const target = getGradioApp();
    if (target) {
        observer.observe(target, {childList: true, subtree: true});
    } else {
        console.error("getGradioApp() did not return a valid target for observation");
    }
}

observeGradioInit();
