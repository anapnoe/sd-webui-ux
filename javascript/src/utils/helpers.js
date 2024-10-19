import {getAnapnoeApp} from '../constants.js';

export function updateInput(inputElement) {
    // Implementation of how to update the input
    if (inputElement) {
        const event = new Event('input', {bubbles: true});
        inputElement.dispatchEvent(event);
    }
}

export function setupAnimations() {
    const anapnoeApp = getAnapnoeApp();

    anapnoeApp.addEventListener('animationend', (e) => {
        if (e.animationName === 'fade-out') {
            e.target.classList.add('hidden');
        }
    });

    anapnoeApp.addEventListener('animationstart', (e) => {
        const isDisabled = anapnoeApp.classList.contains('notransition');
        if (e.animationName === 'fade-out') {
            if (isDisabled) {
                e.target.classList.add('hidden');
            }
        } else if (e.animationName === 'fade-in') {
            e.target.classList.remove('hidden');
        }
    });
}

export function countInlineEventListeners(element) {
    let count = 0;

    // Function to check event listeners that may have been added via 'addEventListener'
    const checkEventListeners = (el) => {
        const attrs = Object.getOwnPropertyDescriptors(el);
        if (attrs && attrs.onclick) count++;
        for (const eventName of ['onblur', 'onchange', 'onclick', 'oncontextmenu', 'ondblclick',
            'onerror', 'onfocus', 'oninput', 'onkeydown', 'onkeypress',
            'onkeyup', 'onload', 'onmousedown', 'onmousemove',
            'onmouseout', 'onmouseover', 'onmouseup', 'onresize',
            'onscroll', 'onselect', 'onsubmit']) {
            if (el[eventName]) count++;
        }
    };

    // Recursive function to traverse the DOM
    const traverseChildren = (el) => {
        checkEventListeners(el);
        for (let child = el.firstElementChild; child; child = child.nextElementSibling) {
            traverseChildren(child);
        }
    };

    traverseChildren(element);
    return count;
}

const eventListenersMap = new WeakMap();
export function countEventListeners(element) {
    if (!(element instanceof Element)) {
        return 0;
    }
    let totalListeners = 0;
    const elementListeners = eventListenersMap.get(element);
    if (elementListeners) {
        for (const event in elementListeners) {
            totalListeners += elementListeners[event].size; // Count Set size
        }
    }

    for (const child of element.children) {
        totalListeners += countEventListeners(child);
    }

    return totalListeners;
}

(function() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (typeof options === 'undefined') {
            options = false; // Assign a default value if necessary
        }

        const elementListeners = eventListenersMap.get(this) || {};
        if (!elementListeners[type]) {
            elementListeners[type] = new Set(); // Use Set to prevent duplicates
        }
        elementListeners[type].add(listener);
        eventListenersMap.set(this, elementListeners);

        originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function(type, listener, options) {
        const elementListeners = eventListenersMap.get(this);
        if (elementListeners && elementListeners[type]) {
            elementListeners[type].delete(listener); // Remove the listener from the Set
            if (elementListeners[type].size === 0) {
                delete elementListeners[type]; // Optionally clean up the empty array
            }
        }
        originalRemoveEventListener.call(this, type, listener, options);
    };

    window.countEventListeners = countEventListeners;
}());
