import {VERSION_DATA} from "../constants.js";

export function setupGenerateObservers() {
    const keys = ['#txt2img', '#img2img', '#deforum'];
    keys.forEach((key) => {
        const tgb = document.querySelector(`${key}_generate`);
        if (tgb) {
            document.querySelector(`${key}_nav`)?.classList.remove('hidden');

            const tib = document.querySelector(`${key}_interrupt`);
            const ti = tib.closest('.portal');
            const tg = tgb.closest('.ae-button');
            const ts = document.querySelector(`${key}_skip`).closest('.portal');
            const loop = document.querySelector(`${key}_loop`);



            tib.addEventListener('click', () => {
                loop?.classList.add('stop');
            });


            const gen_observer = new MutationObserver((mutations) => {
                mutations.forEach((m) => {
                    if (tib.style.display === 'none') {
                        const progress = document.querySelector(`.progressDiv .progress`);
                        if (progress) {
                            ti.classList.remove('disable');
                            setTimeout(() => tib.click(), 500);
                        }
                        if (loop) {
                            if (loop.className.indexOf('stop') !== -1 || loop.className.indexOf('active') === -1) {
                                loop.classList.remove('stop');
                                ti.classList.add('disable');
                                ts?.classList.add('disable');
                                tg.classList.remove('active');
                            } else if (loop.className.indexOf('active') !== -1) {
                                tgb.click();
                            }
                        } else {
                            ti.classList.add('disable');
                            tg.classList.remove('active');
                        }
                    } else {
                        ti.classList.remove('disable');
                        ts?.classList.remove('disable');
                        tg.classList.add('active');
                    }
                });
            });

            gen_observer.observe(tib, {attributes: true, attributeFilter: ['style']});
        }
    });
}
/*
export function setupCheckpointChangeObserver(vScroll, treeView) {

    const ch_input = document.querySelector("#setting_sd_model_checkpoint .wrap .secondary-wrap input") || document.querySelector(".gradio-dropdown.model_selection .wrap .secondary-wrap input");
    const ch_preload = document.querySelector("#setting_sd_model_checkpoint .wrap") || document.querySelector(".gradio-dropdown.model_selection .wrap");

    const ch_footer_selected = document.querySelector("#checkpoints_main_footer_db .model-selected");
    const ch_footer_preload = document.querySelector("#checkpoints_main_footer_db .model-preloader");
    ch_footer_preload.append(ch_preload);

    let hash_value = "";

    const selectCard = (value) => {
        if (hash_value !== value) {
            const name = value.split('.').slice(0, -1).join();
            vScroll.selected = new Set([name]);
            vScroll.renderItems();

            if (treeView) {
                treeView.selected = vScroll.selected;
                treeView.updateSelectedItems();
            }
            
            ch_footer_selected.textContent = value;
            console.log("Checkpoint:", value, name);
            hash_value = value;
        }
    };

    selectCard(ch_input.value);

    const combinedObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            setTimeout(() => selectCard(ch_input.value), 1000);
        });
    });

    // Observe both the input and the preloaded model in one line
    combinedObserver.observe(ch_input, {attributes: true});
    combinedObserver.observe(ch_preload, {childList: true, subtree: true});
}
*/

export function setupCheckpointChangeObserver(vScroll) {
    const ch_input = document.querySelector("#setting_sd_model_checkpoint .wrap .secondary-wrap input") || 
                     document.querySelector(".gradio-dropdown.model_selection .wrap .secondary-wrap input");
    const ch_preload = document.querySelector("#setting_sd_model_checkpoint .wrap") || 
                       document.querySelector(".gradio-dropdown.model_selection .wrap");

    const ch_footer_selected = document.querySelector("#checkpoints_main_footer_db .model-selected");
    const ch_footer_preload = document.querySelector("#checkpoints_main_footer_db .model-preloader");
    ch_footer_preload.append(ch_preload);

    let hash_value = "";
    let observer = null;
    let treeViewCallback = null;

    const selectCard = (value) => {
        if (hash_value !== value) {
            const name = value.split('.').slice(0, -1).join('.');
            vScroll.selected = new Set([name]);
            vScroll.forceRenderItems();

            if (typeof treeViewCallback === 'function') {
                treeViewCallback(vScroll.selected);
            }

            ch_footer_selected.textContent = value;
            console.log("Checkpoint:", value, name);
            hash_value = value;
        }
    };

    selectCard(ch_input.value);

    const setupObserver = () => {
        if (observer) return;
        observer = new MutationObserver(() => {
            setTimeout(() => selectCard(ch_input.value), 1000);
        });
        
        observer.observe(ch_input, { attributes: true });
        observer.observe(ch_preload, { childList: true, subtree: true });
    };

    setupObserver();

    return {
        setTreeViewCallback(callback) {
            treeViewCallback = callback;
            selectCard(hash_value);
        },
        destroy() {
            if (observer) observer.disconnect();
        }
    };
}


export function setupExtraNetworksAddToPromptObserver() {
    //do some work here
    const ch_input = document.querySelector("#txt2img_prompt textarea");
    let old_value = ch_input.value;

    const regexPattern = /<lora:([^:]+):\d+>/g;
    let matchedWords = [];
    let match;

    while ((match = regexPattern.exec(old_value)) !== null) {
        matchedWords.push(match[1]); // match[1] gives us the text
    }

    let oldCards = document.querySelectorAll(`.extra-network-cards:not(#txt2img_checkpoints_cards) .card[data-apply]`) || document.querySelector(`#txt2img_checkpoints_cards .card[onclick*="${value}"]`);
    let matchingCards = [];

    oldCards.forEach(card => {
        let dataApplyValue = card.getAttribute('data-apply') || card.getAttribute('onclick');
        matchedWords.forEach(word => {
            if (dataApplyValue.includes(word)) {
                matchingCards.push(card); // Add to matching cards
            }
        });
    });

    //console.log(matchingCards);

}

export function setupInputObservers(paramsMapping, apiParams, vScroll, modifyParamsCallback = null) {
    Object.keys(paramsMapping).forEach((inputId) => {
        const inputElement = document.querySelector(`${inputId}`);
        if (inputElement) {
            const paramKey = paramsMapping[inputId];
            const eventType = (inputElement.tagName === 'SELECT' && inputElement.multiple) ? 'change' :
                (inputElement.tagName === 'SELECT' ||
                (inputElement.type === 'checkbox' || inputElement.type === 'radio') ||
                (inputElement.type !== 'range' && inputElement.type !== 'color' && inputElement.type !== 'text')) ? 'change' : 'input';

            const updateParams = () => {
                let paramValue;
                if (inputElement.tagName === 'SELECT' && inputElement.multiple) {
                    paramValue = Array.from(inputElement.selectedOptions).map(option => option.value);
                    apiParams[paramKey] = paramValue;
                } else if (inputElement.type === 'checkbox' || inputElement.type === 'radio') {
                    paramValue = inputElement.checked;
                } else {
                    paramValue = inputElement.value;
                }
                // Apply the callback if provided
                const modifiedParams = modifyParamsCallback ? modifyParamsCallback({[paramKey]: paramValue}) : {[paramKey]: paramValue};
                vScroll.updateParamsAndFetch(modifiedParams, 1000);
            };

            inputElement.addEventListener(eventType, updateParams);
            // Initialize apiParams with the current values of the inputs
            //updateParams();
        } else {
            console.warn(`Input element with id ${inputId} not found.`);
        }
    });
    return apiParams;
}
