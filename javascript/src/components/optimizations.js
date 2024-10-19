import {updateInput, countEventListeners, countInlineEventListeners} from '../utils/helpers.js';
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

function removeInlineEventListener(el) {
    const onclick_data = el.getAttribute('data-apply');
    const match = onclick_data ? onclick_data.match(/^(\w+)\s*\(.*\)$/) : null;

    if (match && typeof window[match[1]] === 'function') {
        el.removeEventListener('click', window[match[1]]);
        // console.log("Removed event listener for function: ", match[1]);
        const nameOrPath = el.getAttribute('data-name') || el.getAttribute('data-path') || el.closest('.card')?.getAttribute('data-name');
        if (nameOrPath) {
            console.log('Remove EventListener', `${nameOrPath} - ${match[1]} - ${el.getAttribute('title') || ''}`);
        }
    }
}

function callDataApplyFunction(el, event) {
    const data_apply = el.getAttribute('data-apply');
    if (data_apply) {
        const match = data_apply.match(/^(\w+)\s*\((.*)\)$/);
        if (match && typeof window[match[1]] === 'function') {
            const args = match[2].split(',').map((arg) => arg.trim().replace(/['"]/g, '')); // Process arguments
            // Insert the event as the first argument
            args.unshift(event);
            window[match[1]].apply(null, args); // Call the function with arguments
        }
    }
}


function handleExtraNetworksClick(e) {
    const {target: ctarget, currentTarget: net} = e;
    //console.log(ctarget.classList);
    if (ctarget.classList.contains('card') || ctarget.classList.contains('card-button') || ctarget.classList.contains('tree-list-content')) {

        let data_apply = ctarget.getAttribute('data-apply') || ctarget.getAttribute('onClick');
        if (data_apply) {
            ctarget.setAttribute('data-apply', data_apply);
            ctarget.removeAttribute('onClick');
        }


        ctarget.setAttribute('onClick', data_apply);
        ctarget.click();
        removeInlineEventListener(ctarget);
        ctarget.removeAttribute('onClick');

        if (ctarget.classList.contains('card-button')) {
            //window.popup_trigger.click();
            appendPopupContent();
        }

        if (ctarget.classList.contains('tree-list-content-dir')) {
            const search_field = net.closest('.layout-extra-networks')?.querySelector('.search_extra_networks');
            if (search_field && ctarget.getAttribute('data-path')) {
                search_field.value = ctarget.getAttribute('data-path');
                updateInput(search_field);
            }
        }

        e.stopImmediatePropagation();
    }
}

async function optimizeExtraNetworksCards(net) {

    if (window.opts.uiux_enable_event_delegation || IS_BACKEND_OPTIMIZED) {
        const ielb = countInlineEventListeners(net);
        console.log('Starting Optimizations for', net.id);
        if (!IS_BACKEND_OPTIMIZED) {
            net.querySelectorAll('.card, .card-button, .tree-list-content').forEach((el) => {
                const onclick_data = el.getAttribute('onClick') || el.getAttribute('data-apply');
                if (onclick_data) {
                    el.setAttribute('data-apply', onclick_data);
                    el.removeAttribute('onClick');
                    removeInlineEventListener(el);
                }
            });
        }
        console.log('Total Inline Event Listeners Before:', ielb, 'After:', 0);
        console.log('Attaching Event Listener using Event Delegation', net.id);
        net.removeEventListener('click', handleExtraNetworksClick);
        net.addEventListener('click', handleExtraNetworksClick);
    }

}

async function optimizeExtraNetworksSearchSort() {
    const gradioApp = getGradioApp();

    const applyFilter = function(e) {
        const search_term = e.target.value.toLowerCase();
        const cards = e.target.getAttribute('data-target');
        // console.log(search_term, cards)
        gradioApp.querySelectorAll(cards).forEach((elem) => {
            const text = elem.getAttribute('data-sort-path').toLowerCase();
            let visible = text.indexOf(search_term) !== -1;
            if (search_term.length < 2) {
                visible = true;
            }
            elem.style.display = visible ? '' : 'none';
        });
    };

    document.querySelectorAll('.search_extra_networks').forEach((el) => {
        el.addEventListener('input', applyFilter);
    });

    function applySort(el, sortKey) {
        function comparator(cardA, cardB) {
            const a = cardA.getAttribute(sortKey);
            const b = cardB.getAttribute(sortKey);
            if (!isNaN(a) && !isNaN(b)) {
                return parseInt(a) - parseInt(b);
            }
            return (a < b ? -1 : (a > b ? 1 : 0));
        }

        const cards_selector = el.getAttribute('data-target');
        const cards = gradioApp.querySelectorAll(cards_selector);
        const cards_parent = cards[0].parentElement;
        const cardsArray = Array.from(cards);
        const sorted = cardsArray.sort(comparator);

        const reverse_button = el.nextElementSibling; // closest(".reverse-order");
        const reverse = reverse_button.className.indexOf('active') !== -1;
        if (reverse) {
            sorted.reverse();
        }
        sorted.forEach((e) => cards_parent.appendChild(e));
    }

    document.querySelectorAll('.extra_networks_order_by').forEach((el) => {
        el.addEventListener('change', function(e) {
            applySort(e.target, this.value);
            // console.log('You selected: ', this.value);
        });

        el.nextElementSibling.addEventListener('click', (e) => {
            applySort(el, el.value);
            console.log('You selected: ', el.value);
        });
    });
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

        console.log("Remove element #img2img_textual_inversion_cards_html");
        console.log("Remove element #img2img_checkpoints_cards_html");
        console.log("Remove element #img2img_hypernetworks_cards_html");
        console.log("Remove element #img2img_lora_cards_html");
    }
}

export {removeStyleAssets, optimizeExtraNetworksCards, optimizeExtraNetworksSearchSort, removeRedundantExtraNetworks};
