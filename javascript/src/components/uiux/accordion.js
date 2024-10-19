import {getGradioApp, getAnapnoeApp} from '../../constants.js';
import {appendPortalContent} from './portal.js';
import {getSplitInstances} from './splitter.js';


export async function initAccordionComponents(contentDiv) {
    const splitInstances = getSplitInstances();

    await Promise.all(Array.from(contentDiv.querySelectorAll('.accordion-bar')).map(async(c) => {
        const acc = c.parentElement;
        const acc_split = acc.closest('.split-container');

        let ctrg = c;
        const atg = acc.getAttribute('iconTrigger');
        if (atg) {
            const icn = contentDiv.querySelector(atg);
            if (icn) {
                ctrg = icn;
                c.classList.add('pointer-events-none');
            }
        }

        if (acc.className.indexOf('accordion-vertical') !== -1 && acc_split.className.indexOf('split') !== -1) {
            acc.classList.add('expand');
            // const acc_gutter = acc_split.previousElementSibling;
            const acc_split_id = acc_split.parentElement.id;
            const split_instance = splitInstances[acc_split_id];
            acc_split.setAttribute('data-sizes', JSON.stringify(split_instance.getSizes()));

            ctrg?.addEventListener("click", () => {
                acc.classList.toggle('expand');
                // acc_gutter.classList.toggle('pointer-events-none');
                if (acc_split.className.indexOf('v-expand') !== -1) {
                    acc_split.classList.remove('v-expand');
                    split_instance.setSizes(JSON.parse(acc_split.getAttribute('data-sizes')));
                } else {
                    acc_split.classList.add('v-expand');
                    let sizes = split_instance.getSizes();
                    acc_split.setAttribute('data-sizes', JSON.stringify(sizes));

                    console.log(sizes);
                    sizes[sizes.length - 1] = 0;
                    sizes[sizes.length - 2] = 100;

                    const padding = parseFloat(window.getComputedStyle(c, null).getPropertyValue('padding-left')) * 2;
                    acc_split.style.minWidth = c.offsetWidth + padding + "px";

                    split_instance.setSizes(sizes);
                }
            });

        } else {
            ctrg?.addEventListener("click", () => {
                acc.classList.toggle('expand');
            });
        }
    }));

}
