import {getGradioApp, getAnapnoeApp} from '../../constants.js';
import {localStorageWrapper} from '../../utils/storage.js';

let total = 0;

function createDynamicStyles(targetElem, parentElem) {
    const lastCells = targetElem.querySelectorAll('td:last-child');
    const styleElem = document.createElement('style');
    let max = 1.0;
    let styles = ''; // Holds generated styles

    lastCells.forEach((td, index) => {
        const floatValue = parseFloat(td.textContent.trim());
        td.id = `td_${index}`;

        if (!isNaN(floatValue)) {
            let value;
            if (index === 0) {
                max = floatValue;
                value = 100;
            } else {
                value = (floatValue / max) * 100; // Percentage calculation
            }
            styles += `#td_${index}::before { min-width: ${value}%; }`;
        }
    });

    styleElem.textContent = styles;
    parentElem.appendChild(styleElem);
}

export function appendPopupContent() {
    const content_div = document.querySelector('#popup_tabitem');
    content_div.querySelectorAll(`.portal`).forEach((el, index, array) => {
        appendPortalContent(el, content_div, 0, index, array.length);
    });
}

function removePortalContent(parentElem, selector) {
    const elementsToRemove = parentElem.querySelectorAll(`${selector}, style`);
    elementsToRemove.forEach(elem => {
        parentElem.removeChild(elem);
    });
}


function appendPortalComponent(parentElem, targetElem) {
    const appendIndex = parentElem.getAttribute('append-index');
    const children = Array.from(parentElem.children);
    children.forEach(child => {
        if (child !== targetElem) {
            if (targetElem.className.includes('gradio-accordion')) {
                if (appendIndex) {
                    const idx = parseInt(appendIndex, 10);
                    let beforeElement = targetElem.children[2].children[idx];
                    targetElem.children[2].insertBefore(child, beforeElement);
                } else {
                    targetElem.children[2].append(child);
                }
            } else {
                targetElem.append(child);
            }
        }
    });
}

export async function appendPortalContent(parentElem, contentDiv, count = 0, index, length, isInit = false) {
    // Get the data attributes
    const selector = parentElem.getAttribute("data-selector");
    const parentSelector = parentElem.getAttribute("data-parent-selector");
    let targetElem;

    const mcount = count % 2;
    if (mcount === 0) {
        targetElem = document.querySelector(`${parentSelector} ${selector}`);
    } else {
        targetElem = contentDiv.querySelector(`${selector}`);
    }

    if (targetElem && parentElem) {
        // Handle removal of old elements if dynamic
        if (parentElem.classList.contains("dynamic")) {
            removePortalContent(parentElem, selector);

            // Handle special case for popup tables
            if (selector.includes("popup-table")) {
                createDynamicStyles(targetElem, parentElem);
            }
        }

        parentElem.append(targetElem);
        isInit ? total++ : 0;
        console.log("register | Ref", index, parentSelector, selector);

        const droppable = parentElem.getAttribute('droppable');
        if (droppable) {
            appendPortalComponent(parentElem, targetElem);
        }

        const buttonSelector = parentElem.getAttribute("show-button");
        if (buttonSelector) {
            document.querySelector(buttonSelector)?.classList.remove("hidden");
        }

    } else if (count < 2) {
        // Retry logic with delay
        const timeout = parentElem.getAttribute("data-timeout");
        const delay = timeout ? parseInt(timeout) : 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(count + 1, "retry | ", delay, " | Ref", index, parentSelector, selector);
        await appendPortalContent(parentElem, contentDiv, count + 1, index, length, isInit);
    } else {

        if (!parentElem.classList.contains("dynamic")) {
            console.warn("dynamic | Ref", index, parentSelector, selector);
        } else {
            console.error("error | Ref", index, parentSelector, selector);
            //console.trace("Function call stack leading to appendPortalContent");
        }

        isInit ? total++ : 0;
    }

    // Check if all components are initialized
    //console.log(total, length);
    if (total === length && isInit && localStorageWrapper.getItem('UiUxReady') === "false") {
        console.log("Runtime components initialized");
        localStorageWrapper.setItem('UiUxReady', "true");
    }

}


export async function initPortalComponents(contentDiv) {

    await Promise.all(Array.from(contentDiv.querySelectorAll('.portal:not(.dynamic)')).map(async(el, index, array) => {
        appendPortalContent(el, contentDiv, 0, index, array.length, true);
    }));
}


