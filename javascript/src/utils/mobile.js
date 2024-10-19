import {getAnapnoeApp} from '../constants.js';

const detectMobile = () => (window.innerWidth <= 768);

const applyDefaultLayout = (isMobile) => {
    const anapnoe_app = getAnapnoeApp(); // Use cached reference
    anapnoe_app.querySelectorAll('[mobile]').forEach((tabItem) => {
        if (isMobile) {
            if (tabItem.childElementCount === 0) {
                const mobile_attr = tabItem.getAttribute('mobile');
                if (mobile_attr) {
                    const mobile_target = anapnoe_app.querySelector(mobile_attr);
                    if (mobile_target) {
                        tabItem.setAttribute('mobile-restore', `#${mobile_target.parentElement.id}`);
                        tabItem.append(mobile_target);
                    }
                }
            }
        } else if (tabItem.childElementCount > 0) {
            const mobile_restore_attr = tabItem.getAttribute('mobile-restore');
            if (mobile_restore_attr) {
                const mobile_restore_target = anapnoe_app.querySelector(mobile_restore_attr);
                if (mobile_restore_target) {
                    mobile_restore_target.append(tabItem.firstElementChild);
                }
            }
        }
    });

    if (isMobile) {
        anapnoe_app.querySelector('.accordion-vertical.expand #mask-icon-acc-arrow')?.click();
        anapnoe_app.classList.add('default-mobile');
    } else {
        anapnoe_app.classList.remove('default-mobile');
    }
};

export const switchMobile = () => {
    const anapnoe_app = getAnapnoeApp(); // Use cached reference
    const optslayout = window.opts.uiux_default_layout;

    anapnoe_app.classList.add(`default-${optslayout.toLowerCase()}`);

    if (optslayout === 'Auto') {
        window.addEventListener('resize', (event) => {
            const isMobile = detectMobile();
            applyDefaultLayout(isMobile);
        });
        applyDefaultLayout(detectMobile());
    } else if (optslayout === 'Mobile') {
        applyDefaultLayout(true);
    } else {
        applyDefaultLayout(false);
    }
};
