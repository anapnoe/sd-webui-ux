import {REPO_NAME} from '../constants.js';

// Create a wrapper for localStorage
const localStorageWrapper = {
    setItem: function(key, value) {
        localStorage.setItem(key, value);
        this.notifyChange(key, value);
    },
    getItem: function(key) {
        return localStorage.getItem(key);
    },
    removeItem: function(key) {
        localStorage.removeItem(key);
        this.notifyChange(key, null);
    },
    notifyChange: function(key, value) {
        // Custom event to notify changes
        const event = new CustomEvent('localStorageChange', {detail: {key, value}});
        window.dispatchEvent(event);
    }
};

// Function to listen for localStorage changes
function onLocalStorageChange(callback, keyToCheck) {
    const currentValue = localStorageWrapper.getItem(keyToCheck);
    callback(keyToCheck, currentValue);

    const listener = (event) => {
        callback(event.detail.key, event.detail.value);
    };

    window.addEventListener('localStorageChange', listener);

    return () => {
        window.removeEventListener('localStorageChange', listener);
    };
}

export {onLocalStorageChange, localStorageWrapper};
