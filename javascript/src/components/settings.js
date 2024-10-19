import {getGradioApp, getAnapnoeApp} from '../constants.js';
import {updateInput} from '../utils/helpers.js';
import {toggleLogger} from './logger.js';

export function uiuxOptionSettings() {
    const anapnoeApp = getAnapnoeApp();
    const gradioApp = getGradioApp();

    if (!anapnoeApp || !gradioApp) {
        console.warn(`Required elements not found: ${!anapnoeApp ? 'anapnoeApp' : ''} ${!gradioApp ? 'gradioApp' : ''}`);
        return; // Exit if elements are not found
    }

    const comp_mobile_scale_range = gradioApp.querySelector('#setting_uiux_mobile_scale input[type=range]');
    comp_mobile_scale_range.classList.add('hidden');
    const comp_mobile_scale = gradioApp.querySelector('#setting_uiux_mobile_scale input[type=number]');

    function uiux_mobile_scale(value) {
        const viewport = document.head.querySelector('meta[name="viewport"]');
        viewport.setAttribute('content', `width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=${value}`);
    }

    comp_mobile_scale.addEventListener('change', (e) => {
        comp_mobile_scale.value = e.target.value;
        updateInput(comp_mobile_scale);
        uiux_mobile_scale(e.target.value);
    });

    uiux_mobile_scale(window.opts.uiux_mobile_scale);

    // Set max resolution output
    function sdMaxOutputResolution(value) {
        gradioApp.querySelectorAll('[id$="2img_width"] input,[id$="2img_height"] input').forEach((elem) => {
            elem.max = value;
        });
    }

    gradioApp.querySelector('#setting_uiux_max_resolution_output').addEventListener('input', (e) => {
        let intvalue = parseInt(e.target.value);
        intvalue = Math.min(Math.max(intvalue, 512), 16384);
        sdMaxOutputResolution(intvalue);
    });
    sdMaxOutputResolution(window.opts.uiux_max_resolution_output);

    // Function to calculate spacing and apply styles
    function applyStylesToSliders(sliders) {
        sliders.forEach((elem) => {
            const spacing = (elem.step / (elem.max - elem.min)) * 100.0;
            const tsp = `max(3px, calc(${spacing}% - 1px))`;
            const fsp = `max(4px, calc(${spacing}% + 0px))`;
            elem.style.setProperty(
                '--ae-slider-bg-overlay',
                `repeating-linear-gradient(90deg, transparent, transparent ${tsp}, var(--ae-input-border-color) ${tsp}, var(--ae-input-border-color) ${fsp})`,
            );
        });
    }

    // Main function to show input range ticks
    function uiux_show_input_range_ticks(value, interactive) {
        const rangeSelectors = "input[type='range']";
        const sliders = gradioApp.querySelectorAll(rangeSelectors);

        if (value) {
            applyStylesToSliders(sliders);
        } else if (interactive) {
            sliders.forEach((elem) => {
                elem.style.setProperty('--ae-slider-bg-overlay', 'transparent');
            });
        }
    }

    const toggleCheckbox = gradioApp.querySelector('#setting_uiux_show_input_range_ticks input');
    toggleCheckbox.addEventListener('click', (e) => {
        uiux_show_input_range_ticks(e.target.checked, true);
    });

    uiux_show_input_range_ticks(window.opts.uiux_show_input_range_ticks);

    // Remove Overrides Function
    function removeOverrides() {
        const checkedOverrides = Array.from(gradioApp.querySelectorAll('#setting_uiux_ignore_overrides input:checked'))
            .map((elem) => elem.nextElementSibling.innerHTML); // Create an array of checked override names

        const overrideTokens = gradioApp.querySelectorAll("[id$='2img_override_settings'] .token");

        overrideTokens.forEach((token) => {
            const [tokenName, tokenValue] = token.querySelector('span').textContent.split(':').map((s) => s.trim());

            if (checkedOverrides.includes(tokenName)) {
                gradioApp.querySelector("[id$='2img_override_settings']").classList.add('show');
                token.querySelector('.token-remove')?.click();
            }
        });
    }

    // Event listener for ignoring overrides
    gradioApp.querySelector('#setting_uiux_ignore_overrides').addEventListener('click', () => {
        setTimeout(removeOverrides, 100); // Delay the execution to allow UI updates
    });

    // Mutation observer for handling attribute changes
    const overridesObserverClass = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                setTimeout(removeOverrides, 1000);
            }
        });
    });

    // Mutation observer for handling added nodes
    const overridesObserverNodes = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                setTimeout(removeOverrides, 1000);
            }
        });
    });

    // Observe mutations on specific UI elements
    const elementsToObserve = document.querySelectorAll('#txt2img_override_settings .wrap-inner, #img2img_override_settings .wrap_inner');
    elementsToObserve.forEach((elem) => overridesObserverNodes.observe(elem, {childList: true}));

    const navElements = document.querySelectorAll('#txt2img_nav, #img2img_nav');
    navElements.forEach((elem) => overridesObserverClass.observe(elem, {attributes: true}));

    // General function to handle class toggling
    function uiux_toggle_class(settingKey, className) {
        const input = gradioApp.querySelector(`${settingKey} input`);
        if (input) {
            const key = settingKey.split('#setting_')[1];
            const value = window.opts[key];
            anapnoeApp.classList.toggle(className, value);
            localStorage.setItem(key, value);
            input.addEventListener('click', (e) => {
                localStorage.setItem(key, e.target.checked);
                anapnoeApp.classList.toggle(className, e.target.checked);
                // lazy move this in a dedicated func
                if (key === "uiux_enable_console_log") {
                    toggleLogger(e.target.checked);
                }
            });
        }
    }

    const toggleSettings = [
        {key: '#setting_uiux_no_slider_layout', className: 'no-slider-layout'},
        {key: '#setting_uiux_show_labels_aside', className: 'aside-labels'},
        {key: '#setting_uiux_show_labels_main', className: 'main-labels'},
        {key: '#setting_uiux_show_labels_tabs', className: 'tab-labels'},
        {key: '#setting_uiux_hide_extra_info', className: 'no-extra-info'},
        {key: '#setting_uiux_disable_transitions', className: 'notransition'},
        {key: '#setting_uiux_enable_console_log', className: 'debug-log'},
    ];

    for (const {key, className} of toggleSettings) {
        uiux_toggle_class(key, className);
    }

    // General function to handle css vars
    function uiux_var_opts_update(key, val) {
        anapnoeApp.style.setProperty(key, val);
    }

    const settingsId = [
        '#setting_uiux_exnet_fit_size',
        '#setting_uiux_exnet_aspect_ratio_x',
        '#setting_uiux_exnet_aspect_ratio_y',
        '#setting_uiux_exnet_header_size',
        '#setting_uiux_min_wrap_size',
        '#setting_uiux_exnet_image_tint',
    ];

    for (const id of settingsId) {
        const n = document.querySelector(`${id} input[type=number]`);
        const r = document.querySelector(`${id} input[type=range]`);

        if (r) {
            r.classList.add('hidden');
        }

        if (n) {
            const name = id.split('#setting_')[1];
            const key = `--ae-${name}`;
            const value = window.opts[name];
            uiux_var_opts_update(key, value);
            n.addEventListener('change', (event) => {
                updateInput(n);
                uiux_var_opts_update(key, event.target.value);
            });
        }
    }
}
