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
    const ch_input = document.querySelector("#setting_sd_model_checkpoint .wrap .secondary-wrap input") ||
    document.querySelector(".gradio-dropdown.model_selection .wrap .secondary-wrap input");
    let hash_old_value = ch_input.value;
    let oldcard = document.querySelector(`#txt2img_checkpoints_cards .card[data-apply*="${hash_old_value}"]`);

    const ch_footer_selected = document.querySelector("#txt2img_checkpoints_main_footer .model-selected");
    const ch_preload = document.querySelector("#setting_sd_model_checkpoint .wrap") ||
    document.querySelector(".gradio-dropdown.model_selection .wrap");
    const ch_footer_preload = document.querySelector("#txt2img_checkpoints_main_footer .model-preloader");

    // Set up the initial state
    if (oldcard) {
        oldcard.classList.add("selected");
        ch_footer_selected.textContent = hash_old_value; // Initialize footer with old value
        console.log("Checkpoint name:", oldcard.getAttribute("data-name"), "<br>");
    }

    // Append the preload section
    ch_footer_preload.append(ch_preload);

    // Function to handle checkpoint selection
    const selectCard = (new_card, new_value) => {
        if (new_card && oldcard !== new_card) {
            oldcard?.classList.remove("selected");
            new_card.classList.add("selected");
            oldcard = new_card;
            ch_footer_selected.textContent = new_value;
            console.log("Checkpoint:", new_value);
        }
    };

    const combinedObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type === "attributes" && m.target === ch_input) {
                const new_hash_value = ch_input.value;
                const new_card = document.querySelector(`#txt2img_checkpoints_cards .card[data-apply*="${new_hash_value}"]`);
                selectCard(new_card, new_hash_value);
            }

            // Handle changes in the preloaded model
            const hash_target = document.querySelector('#sd_checkpoint_hash');
            const hash_value = hash_target?.textContent;
            const card = document.querySelector(`#txt2img_checkpoints_cards .card[data-apply*="${hash_value}"]`);
            selectCard(card, ch_input.value);
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

    let oldCards = document.querySelectorAll(`.extra-network-cards:not(#txt2img_checkpoints_cards) .card[data-apply]`);
    let matchingCards = [];

    oldCards.forEach(card => {
        let dataApplyValue = card.getAttribute('data-apply');
        matchedWords.forEach(word => {
            if (dataApplyValue.includes(word)) {
                matchingCards.push(card); // Add to matching cards
            }
        });
    });

    console.log(matchingCards);

}
