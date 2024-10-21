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

export function setupCheckpointChangeObserver() {

    const ch_input = document.querySelector("#setting_sd_model_checkpoint .wrap .secondary-wrap input") || document.querySelector(".gradio-dropdown.model_selection .wrap .secondary-wrap input");
    const ch_preload = document.querySelector("#setting_sd_model_checkpoint .wrap") || document.querySelector(".gradio-dropdown.model_selection .wrap");

    const ch_footer_selected = document.querySelector("#txt2img_checkpoints_main_footer .model-selected");
    const ch_footer_preload = document.querySelector("#txt2img_checkpoints_main_footer .model-preloader");
    ch_footer_preload.append(ch_preload);

    let hash_value;
    // Function to handle checkpoint selection
    const selectCard = (value) => {
        if (hash_value !== value) {
            console.log("Checkpoint:", value);
            const oldcard = document.querySelector(`#txt2img_checkpoints_cards .card.selected`);
            oldcard?.classList.remove("selected");

            const new_card = document.querySelector(`#txt2img_checkpoints_cards .card[data-apply*="${value}"]`) || document.querySelector(`#txt2img_checkpoints_cards .card[onclick*="${value}"]`);
            new_card?.classList.add("selected");

            ch_footer_selected.textContent = value;
            console.log("Checkpoint:", value);

            hash_value = value;
        }
    };

    selectCard(ch_input.value);

    const combinedObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            //if (m.type === "attributes" && m.target === ch_input) {
            //    selectCard(ch_input.value);
            //}
            setTimeout(() => selectCard(ch_input.value), 1000);
        });
    });

    // Observe both the input and the preloaded model in one line
    combinedObserver.observe(ch_input, {attributes: true});
    combinedObserver.observe(ch_preload, {childList: true, subtree: true});
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
