import {getGradioApp, getAnapnoeApp} from '../../constants.js';
import {appendPortalContent} from './portal.js';
import {optimizeExtraNetworksCards} from '../optimizations.js';

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

        //maybe move this alsewhere
        const adc = el.getAttribute("data-click");
        if (adc) {
            el.addEventListener('click', (e) => {
                if (el.classList.contains("refresh-extra-networks")) {
                    const id = el.closest(".layout")?.id;
                    const ckey = id.split("layout_")[1];
                    const cpane = document.querySelector(`#${ckey}_pane > div`);
                    const elementsToAppend = [
                        document.querySelector(`#${ckey}_dirs`),
                        document.querySelector(`#${ckey}_tree`),
                        document.querySelector(`#${ckey}_cards`)
                    ];

                    elementsToAppend.forEach(element => {
                        if (element) {
                            /*
                            element.querySelectorAll("[data-apply]").forEach((ca) => {
                                const data_apply = ca.getAttribute("data-apply");
                                ca.setAttribute("onClick", data_apply);
                                ca.removeAttribute("data-apply");
                            });
                            */
                            cpane.append(element);
                        }
                    });

                    const btn_refresh_internal = document.querySelector(`#${ckey}_extra_refresh_internal`);
                    btn_refresh_internal.dispatchEvent(new Event("click"));

                    setTimeout(() => {
                        const asd = document.querySelector(`#${ckey}_aside_split`);
                        asd.querySelectorAll(`.portal`).forEach((elm, index, array) => {
                            appendPortalContent(elm, asd, 0, index, array.length);
                        });

                        // setupExtraNetworksForTab('txt2img');
                        optimizeExtraNetworksCards(asd);
                    }, 1000);
                }

                setTimeout(() => {
                    document.querySelectorAll(adc).forEach((el) => {
                        el.click();
                    });
                }, 500);

            });
        }
    }));

}

