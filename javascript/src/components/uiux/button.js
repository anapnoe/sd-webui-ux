import {getGradioApp, getAnapnoeApp} from '../../constants.js';
import {appendPortalContent} from './portal.js';

export async function initButtonComponents(contentDiv) {
    //const anapnoeApp = getAnapnoeApp();
    function callToAction(el, tids, pid) {
        const acc_bar = el.closest(".accordion-bar");
        if (acc_bar) {
            const acc = acc_bar.parentElement;
            if (acc.className.indexOf('expand') === -1) {
                let ctrg = acc_bar;
                const atg = acc.getAttribute('iconTrigger');
                if (atg) {
                    const icn = contentDiv.querySelector(atg);
                    if (icn) {
                        ctrg = icn;
                    }
                }
                ctrg.click();
            }
        }
    }

    await Promise.all(Array.from(contentDiv.querySelectorAll('.ae-button')).map(async(el) => {
        const toggle = el.getAttribute("toggle");
        const active = el.getAttribute("active");
        const input = el.querySelector('input');

        if (input) {
            if (input.checked === true && !active) {
                input.click();
            } else if (input.checked === false && active) {
                input.click();
            }
        }

        if (active) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }

        if (toggle) {
            el.addEventListener('click', (e) => {
                const input = el.querySelector('input');
                if (input) {
                    input.click();
                    if (input.checked === true) {
                        el.classList.add('active');
                    } else if (input.checked === false) {
                        el.classList.remove('active');
                    }
                } else {
                    el.classList.toggle('active');
                }
            });
        }

    }));

}

