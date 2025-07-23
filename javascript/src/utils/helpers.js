import {getAnapnoeApp} from '../constants.js';

export function updateInput(inputElement) {
    if (inputElement) {
        const event = new Event('input', {bubbles: true, cancelable: true});
        inputElement.dispatchEvent(event);
    }
}

export function updateChange(inputElement) {
    if (inputElement) {
        const event = new Event('change', {bubbles: true, cancelable: true});
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


async function waitForPngInfoText(png_info_text, maxRetries = 4) {
    return new Promise((resolve) => {
        const check = (count) => {
            if (png_info_text.value != "" || count >= maxRetries) {
                resolve(true);
            } else {
                setTimeout(() => check(count + 1), 500);
            }
        };
        check(0);
    });
}


export async function sendImageParamsTo(src, btnid) {
    const root_dock = document.querySelector(`#root-dock-components`);
    const fileInput = document.querySelector('#pnginfo_image input[type="file"]');
    const btn = document.querySelector(`#pnginfo_send_buttons ${btnid}`);
    const tab_active = document.querySelector(`#main-nav .active`);
    const wtb = document.querySelector(`#workspaces_tabitem`);
    //console.warn("sendImageParamsTo", btnid, btn);

    const png_info_text = document.querySelector('[data-selector="#tab_pnginfo textarea"] textarea');
    if(png_info_text){
        png_info_text.value = "";
        updateInput(png_info_text);
    }

    try {
        const response = await fetch(src);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg');
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        updateChange(fileInput);

        const loaded = await waitForPngInfoText(png_info_text);
        if (loaded) {
            if(root_dock){
                wtb.classList.add("no-redraw");
                setTimeout(() => {
                    tab_active?.click();
                    wtb.classList.remove("no-redraw");
                }, 1000);
            }

            btn?.click();

        } else {
            console.error('PNG info not loaded');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

/*
export function sendImageParamsTo(src, btnid) {
    const btn = document.querySelector(`#pnginfo_send_buttons ${btnid}`);
    const fileInput = document.querySelector('#pnginfo_image input[type="file"]');
    const dataTransfer = new DataTransfer();
    fileInput.files = dataTransfer.files;

    fetch(src)
        .then(response => response.blob())
        .then(blob => {
            const file = new File([blob], 'image.jpg', {type: blob.type});
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            updateChange(fileInput);
            setTimeout(() => {
                btn.click();
            }, 1000);

        })
        .catch(error => console.error('Error fetching image:', error));
}
*/
export function detectHoverOnElements(selector){
    let timeout;
    document.querySelectorAll(selector).forEach((parent) => {

        parent.addEventListener('mouseenter', (e) => {
            clearTimeout(timeout);
            parent.classList.remove('init-view');
            timeout = setTimeout(() => {
                parent.classList.add('mouseenter');
            }, 500);
        });

        parent.addEventListener('mouseleave', (e) => {
            clearTimeout(timeout);
            parent.classList.remove('mouseenter');
        });
    });
}