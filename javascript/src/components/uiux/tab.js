import {getGradioApp, getAnapnoeApp} from '../../constants.js';
import {appendPortalContent} from './portal.js';

export async function initTabComponents(contentDiv) {
    const anapnoeApp = getAnapnoeApp();

    await Promise.all(Array.from(contentDiv.querySelectorAll('.xtabs-tab')).map(async(el) => {
        el.addEventListener('click', () => {
            const tabParent = el.parentElement;
            const tgroup = el.getAttribute("tabGroup");
            const pid = el.getAttribute("data-click");
            const toggle = el.getAttribute("toggle");
            const isActive = el.classList.contains("active");

            function hideActive(tab) {
                tab.classList.remove('active');
                const tids = tab.getAttribute("tabItemId");
                anapnoeApp.querySelectorAll(tids).forEach((tabItem) => {
                    tabItem.classList.remove('fade-in');
                    tabItem.classList.add('fade-out');
                });
            }
            if (!toggle || toggle && isActive) {
                if (tgroup) {
                    anapnoeApp.querySelectorAll(`[tabGroup="${tgroup}"]`)
                        .forEach((tab) => {
                            if (tab.classList.contains('active')) {
                                hideActive(tab);
                            }
                        });
                } else if (tabParent) {
                    const tabs = [].slice.call(tabParent.children);
                    tabs.forEach((tab) => {
                        if (tab.classList.contains('active')) {
                            hideActive(tab);
                        }
                    });
                }
            }

            if (!toggle || toggle && !isActive) {
                const tids = el.getAttribute("tabItemId");
                anapnoeApp.querySelectorAll(tids).forEach((tabItem) => {
                    tabItem.classList.remove('fade-out');
                    tabItem.classList.add('fade-in');
                    tabItem.querySelectorAll(`.portal.dynamic`).forEach((dpEl, index, array) => {
                        appendPortalContent(dpEl, document, 0, index, array.length);
                    });
                    // console.log('tab', tids, tabItem);
                });

                el.classList.add('active');
                callToAction(el, tids, pid);
            }

        });

        const active = el.getAttribute("active");
        if (!active) {
            const tids = el.getAttribute("tabItemId");
            anapnoeApp.querySelectorAll(tids).forEach((tabItem) => {
                tabItem.classList.remove('fade-in');
                tabItem.classList.add('fade-out');
            });
        }
    }));

    await Promise.all(Array.from(contentDiv.querySelectorAll('.xtabs-tab[active]')).map(async(el) => {
        el.classList.add('active');
        const tids = el.getAttribute("tabItemId");
        const pid = el.getAttribute("data-click");
        anapnoeApp.querySelectorAll(tids).forEach((tabItem) => {
            tabItem.classList.remove('fade-out');
            tabItem.classList.add('fade-in');
        });
        callToAction(el, tids, pid);
        // console.log('tab', tids, el);
    }));

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

}
