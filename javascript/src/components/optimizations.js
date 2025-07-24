import {updateInput} from '../utils/helpers.js';
import {appendPopupContent} from './uiux/portal.js';
import {getGradioApp, getAnapnoeApp, getLoggerUiUx, IS_BACKEND_OPTIMIZED} from '../constants.js';
import {UIUX} from '../utils/module.js';

async function removeStyleAssets() {
    document.head.querySelectorAll(`
        [rel="stylesheet"][href*="/assets/"],
        [rel="stylesheet"][href*="theme.css"],
        [rel="stylesheet"][href*="index"]`).forEach((c) => {
        c.remove();
        console.log('Remove stylesheet', c.getAttribute('href'));
    });
    document.body.querySelectorAll(`
        [rel="stylesheet"][href*="file=style.css"]`).forEach((c) => {
        c.remove();
        console.log('Remove stylesheet', c.getAttribute('href'));
    });

    const styler = document.querySelectorAll('.styler, [class*="svelte"]:not(input)');
    const count = styler.length;
    let s = 0;
    styler.forEach((c) => {
        if (c.style.display !== 'none' && c.style.display !== 'block') {
            c.removeAttribute('style');
            s++;
        }

        [...c.classList].filter((c) => c.match(/^svelte.*/)).forEach((e) => c.classList.remove(e));
    });
    console.log('Remove inline styles from DOM', 'Total Selectors:', count, 'Removed Selectors:', s);
}

async function removeRedundantExtraNetworks() {
    //console.log("Starting optimizations for Extra Networks");
    if (!IS_BACKEND_OPTIMIZED) {
        const gradioApp = getGradioApp();
        console.log("Remove Extra Networks Instances");
        gradioApp.querySelector("#img2img_textual_inversion_cards_html")?.remove();
        gradioApp.querySelector("#img2img_checkpoints_cards_html")?.remove();
        gradioApp.querySelector("#img2img_hypernetworks_cards_html")?.remove();
        gradioApp.querySelector("#img2img_lora_cards_html")?.remove();

        gradioApp.querySelector("#txt2img_textual_inversion_cards_html")?.remove();
        gradioApp.querySelector("#txt2img_checkpoints_cards_html")?.remove();
        gradioApp.querySelector("#txt2img_hypernetworks_cards_html")?.remove();
        gradioApp.querySelector("#txt2img_lora_cards_html")?.remove();

        console.log("Remove element #img2img_textual_inversion_cards_html");
        console.log("Remove element #img2img_checkpoints_cards_html");
        console.log("Remove element #img2img_hypernetworks_cards_html");
        console.log("Remove element #img2img_lora_cards_html");

        console.log("Remove element #txt2img_textual_inversion_cards_html");
        console.log("Remove element #txt2img_checkpoints_cards_html");
        console.log("Remove element #txt2img_hypernetworks_cards_html");
        console.log("Remove element #txt2img_lora_cards_html");
    }
}

export {removeStyleAssets, removeRedundantExtraNetworks};
