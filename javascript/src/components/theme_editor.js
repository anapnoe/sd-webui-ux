import {getGradioApp} from "../constants.js";

function hexToRgb(color) {
    // Check if the color string starts with a '#' and remove it
    let hex = color.startsWith("#") ? color.slice(1) : color;
    let a = 1; // Default alpha value

    // If the hex is 8 characters long, it includes alpha
    if (hex.length === 8) {
        a = parseInt(hex.slice(6, 8), 16) / 255; // Get the alpha value from the last two chars
        hex = hex.slice(0, 6); // Remove the alpha from hex
    } else if (hex.length === 3) {
        hex = hex.split("").map((c) => c + c).join(""); // Convert 3-digit hex to 6-digit
    }

    // Validate hex length
    if (hex.length !== 6) {
        throw new Error("Invalid HEX color.");
    }

    // Convert hex to RGB
    const rgb = hex.match(/.{2}/g).map((col) => parseInt(col, 16));
    rgb.push(a); // Add alpha to the RGB array
    return rgb;
}

function rgbToHsl(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const add = max + min;

    const hue = min === max ?
        0 :
        r === max ?
            (60 * (g - b) / diff + 360) % 360 :
            g === max ?
                60 * (b - r) / diff + 120 :
                60 * (r - g) / diff + 240;

    const lum = 0.5 * add;
    const sat = lum === 0 ?
        0 :
        lum === 1 ?
            1 :
            lum <= 0.5 ?
                diff / add :
                diff / (2 - add);

    // Check for alpha channel. If not present, default to 1
    const alpha = rgb.length === 4 ? rgb[3] : 1;

    return [
        Math.round(hue),
        Math.round(sat * 100),
        Math.round(lum * 100),
        alpha,
    ];
}

function hexToHsl(color) {
    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb);
    return `hsl(${hsl[0]}deg ${hsl[1]}% ${hsl[2]}% / ${hsl[3]})`;
}

function hslToHex(h, s, l, a = 1) {
    l /= 100;
    const alphaHex = ((a * 255) | 1 << 8).toString(16).slice(1); // Convert alpha to hex
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - (s * Math.min(l, 1 - l)) / 100 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * Math.max(0, Math.min(color, 1)))
            .toString(16)
            .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}${alphaHex}`;
}

function hsl2rgb(h, s, l, a = 1) {
    const alpha = a;
    const f = (n) => {
        const k = (n + h / 30) % 12;
        return l - (s / 100 * Math.min(l, 1 - l)) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [f(0) * 255, f(8) * 255, f(4) * 255, alpha];
}

function invertColor(hex) {
    if (hex.startsWith("#")) {
        hex = hex.slice(1); // Remove '#' character
    }

    let a = 1; // Default alpha if not provided
    // If there is an alpha in the hex string (8 characters long)
    if (hex.length === 8) {
        a = parseInt(hex.slice(6, 8), 16) / 255;
        hex = hex.slice(0, 6); // Remove the alpha from hex
    }

    if (hex.length === 3) {
        hex = hex.split("").map((c) => c + c).join(""); // Convert 3-digit hex to 6-digit
    }

    if (hex.length !== 6) {
        throw new Error("Invalid HEX color.");
    }

    const r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16);
    const g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16);
    const b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);

    return `#${padZero(r)}${padZero(g)}${padZero(b)}${padZero(Math.round(a * 255).toString(16))}`;
}

function padZero(str, len = 2) {
    const zeros = new Array(len).join("0");
    return (zeros + str).slice(-len);
}

function getValsWrappedIn(str, c1, c2) {
    const rg = new RegExp(`(?<=\\${c1})(.*?)(?=\\${c2})`, "g");
    return str.match(rg);
}

const styleobj = {};
const hslobj = {};
let isColorsInv;
let hsloffset = [0, 0, 0, 0];

const toColorArray = (colStr) =>
    colStr.match(/[\d.]+/g).map(Number);

function updateColorHSV(el, key, keyVal, ohsl) {
    let hsl;

    if (keyVal.includes("#")) {
        let hexColor = keyVal.replace(/\s+/g, "");
        if (isColorsInv) {
            hexColor = invertColor(hexColor);
            styleobj[key] = hexColor;
        }
        hsl = rgbToHsl(hexToRgb(hexColor));
    } else if (keyVal.includes("hsl") || keyVal.includes("rgb")) {
        hsl = keyVal.includes("rgb") ? rgbToHsl(toColorArray(keyVal)) : toColorArray(keyVal);
        if (isColorsInv) {
            const invertedHex = hslToHex(hsl[0], hsl[1], hsl[2], hsl[3]);
            styleobj[key] = invertColor(invertedHex);
            hsl = rgbToHsl(hexToRgb(styleobj[key]));
        }
    }

    //console.log(hsl, el, key, keyVal, ohsl);

    const h = ((Number(hsl[0]) || 0) + (Number(ohsl[0]) || 0)) % 360;
    const s = Math.min(Math.max((Number(hsl[1]) || 0) + (Number(ohsl[1]) || 0), 0), 100);
    const l = Math.min(Math.max((Number(hsl[2]) || 0) + (Number(ohsl[2]) || 0), 0), 100);
    const a = Math.min(Math.max((Number(hsl[3]) || 1) + (Number(ohsl[3]) || 0), 0), 1);
    const hex = hslToHex(h, s, l, a).slice(0, -2);

    el.value = hex;

    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function offsetColorsHSV(ohsl) {
    let inner_styles = "";

    for (const key in styleobj) {
        const keyVal = styleobj[key];
        if (key != "" && keyVal && keyVal.length > 0) {
            const el = document.body.querySelector(`#${key} input`) || document.body.querySelector(`#${key} textarea`);
            if (el) {
                const inputType = el.type || 'text';
                if (inputType === "color") {
                    const hslVal = updateColorHSV(el, key, keyVal, ohsl);
                    inner_styles += `${key}:${hslVal};`;
                } else {
                    inner_styles += `${key}:${styleobj[key]};`;
                }
            }
        }
    }

    isColorsInv = false;
    const preview_styles = document.body.querySelector("#preview-styles");
    preview_styles.innerHTML = `:root {${inner_styles}}`;
    preview_styles.innerHTML += `@media only screen and (max-width: 860px) { :root { --ae-outside-gap-size: var(--ae-mobile-outside-gap-size); --ae-inside-padding-size: var(--ae-mobile-inside-padding-size); } }`;

    const vars_textarea = document.body.querySelector("#theme_vars textarea");
    vars_textarea.value = inner_styles;
    window.updateInput(vars_textarea);
}

function updateTheme(vars) {
    let inner_styles = "";

    for (let i = 0; i < vars.length - 1; i++) {
        const [id, val] = vars[i].split(":").map((v) => v.trim());
        const cid = id.replace(/\s+/g, "");
        styleobj[cid] = val;
        inner_styles += `${cid}:${val};`;
        const elem = document.body.querySelectorAll(`#${cid} input, #${cid} textarea`);
        elem.forEach((el) => {
            const inputType = el.type || 'text';
            if (inputType === "color") {
                if (val.includes("hsl") || val.includes("rgb")) {
                    let hsl;
                    if (val.includes("rgb")) {
                        hsl = rgbToHsl(toColorArray(val));
                    } else {
                        hsl = toColorArray(val);
                    }
                    el.value = hslToHex(hsl[0], hsl[1], hsl[2], hsl[3]).slice(0, -2);
                } else {
                    el.value = val;
                }
            } else if (inputType === "number" || inputType === "range") {
                el.value = parseFloat(val) || 0;
            } else if (inputType === "textarea" || inputType === "text") {
                el.value = val;
            }
        });
    }

    const preview_styles = document.body.querySelector("#preview-styles");

    if (preview_styles) {
        preview_styles.innerHTML = `:root {${inner_styles}}`;
        preview_styles.innerHTML += `@media only screen and (max-width: 860px) { :root { --ae-outside-gap-size: var(--ae-mobile-outside-gap-size); --ae-inside-padding-size: var(--ae-mobile-inside-padding-size); } }`;
    } else {
        const style = document.createElement("style");
        style.id = "preview-styles";
        style.innerHTML = `:root {${inner_styles}}`;
        style.innerHTML += `@media only screen and (max-width: 860px) { :root { --ae-outside-gap-size: var(--ae-mobile-outside-gap-size); --ae-inside-padding-size: var(--ae-mobile-inside-padding-size); } }`;
        document.body.appendChild(style);
    }

    const vars_textarea = document.body.querySelector("#theme_vars textarea");
    const css_textarea = document.body.querySelector("#theme_css textarea");
    vars_textarea.value = inner_styles;
    window.updateInput(vars_textarea);
    window.updateInput(css_textarea);
}

function applyTheme() {
    console.log("apply");
}

function initTheme(styles) {

    const css_styles = styles.split("/*BREAKPOINT_CSS_CONTENT*/");
    let init_css_vars = css_styles[0].split("}")[0].split("{")[1].replace(/\n|\r/g, "");
    init_css_vars = init_css_vars.replace(/;+/, ";").trim();
    const init_vars = init_css_vars.split(";");

    const vars_textarea = document.body.querySelector("#theme_vars textarea");
    const css_textarea = document.body.querySelector("#theme_css textarea");
    vars_textarea.value = init_css_vars;
    window.updateInput(vars_textarea);
    const additional_styles = css_styles[1] !== undefined ? css_styles[1] : "";
    css_textarea.value = `/*BREAKPOINT_CSS_CONTENT*/${additional_styles}/*BREAKPOINT_CSS_CONTENT*/`;
    updateTheme(init_vars);

    const preview_styles = document.body.querySelector("#preview-styles");
    if (!preview_styles) {
        const style = document.createElement("style");
        style.id = "preview-styles";
        style.innerHTML = styles;
        document.body.appendChild(style);
    }

    let intervalChange;
    function updateStyles(elem) {
        let val = elem.value, parentEl = elem.parentElement, inputType = elem.type || 'text';

        if (inputType === "range" || inputType === "number") {
            parentEl = elem.closest(".gradio-slider") || elem.closest(".gradio-number");
            val += parentEl.id.indexOf("angle") !== -1 ? "deg" : (parentEl.id.indexOf("slider-height") === -1 ? "px" : "");
            styleobj[parentEl.id] = val;
        } else if (inputType === "color") {
            parentEl = elem.closest(".gradio-colorpicker");
            //styleobj[parentEl.id] = updateColorHSV(elem, parentEl.id, val, hsloffset);
            styleobj[parentEl.id] = val;
        } else if (inputType === "textarea") {
            parentEl = elem.closest(".gradio-textbox");
            val.length > 0 ? styleobj[parentEl.id] = val : delete styleobj[parentEl.id];
        } else if (inputType === "text") {
            parentEl = elem.closest(".gradio-dropdown");
            if (parentEl) styleobj[parentEl.id] = val;
        }

        if (intervalChange != null) clearInterval(intervalChange);
        intervalChange = setTimeout(() => {
            let inner_styles = Object.entries(styleobj).map(([key, value]) => `${key}:${value};`).join('');
            vars_textarea.value = inner_styles;
            preview_styles.innerHTML = `:root {${inner_styles}}@media only screen and (max-width: 860px) { :root { --ae-outside-gap-size: var(--ae-mobile-outside-gap-size); --ae-inside-padding-size: var(--ae-mobile-inside-padding-size); } }`;
            window.updateInput(vars_textarea);
            offsetColorsHSV(hsloffset);
        }, 1000);
    }

    // Attach input event listener
    document.body
        .querySelectorAll("#ui_theme_settings input, #ui_theme_settings textarea")
        .forEach((elem) => {
            elem.addEventListener("input", (e) => {
                updateStyles(e.currentTarget);
            });
        });

    // Set up MutationObserver to listen for dropdown changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.matches('ul')) {
                    //window.alert(mutation.target.querySelector(".secondary-wrap input").value);
                    updateStyles(mutation.target.querySelector(".secondary-wrap input"));
                }
            });
        });
    });

    document.body
        .querySelectorAll("#ui_theme_settings .gradio-dropdown")
        .forEach((elem) => {
            observer.observe(elem, {childList: true, subtree: true});
        });

    const reset_btn = document.getElementById("theme_reset_btn");
    reset_btn.addEventListener("click", (e) => {
        e.preventDefault();
        document.body
            .querySelectorAll("#ui_theme_hsv input")
            .forEach((elem) => {
                elem.value = 0;
            });
        hsloffset = [0, 0, 0];
        updateTheme(init_vars);
    });

    let intervalCheck;
    function dropDownOnChange() {
        if (init_css_vars !== vars_textarea.value) {
            clearInterval(intervalCheck);
            init_css_vars = vars_textarea.value.replace(/\n|\r/g, "");
            init_css_vars = init_css_vars.split(":root{")[0];
            vars_textarea.value = init_css_vars;
            const vars = init_css_vars.split(";");
            updateTheme(vars);
        }
    }

    const drop_down = document.body.querySelector("#themes_drop_down input");
    drop_down.addEventListener("click", (e) => {
        if (intervalCheck !== null) clearInterval(intervalCheck);
        vars_textarea.value = init_css_vars;
        intervalCheck = setInterval(dropDownOnChange, 500);
    });

    document.body
        .querySelectorAll("#theme_hue input, #theme_sat input, #theme_brt input")
        .forEach((elem, index) => {
            elem.addEventListener("change", (e) => {
                e.preventDefault();
                hsloffset[Math.floor(index / 2)] = e.currentTarget.value;
                offsetColorsHSV(hsloffset);
            });
        });

    const inv_btn = document.getElementById("theme_invert_btn");
    inv_btn.addEventListener("click", (e) => {
        e.preventDefault();
        isColorsInv = !isColorsInv;
        offsetColorsHSV(hsloffset);
    });
}

function getRulesInitTheme(css) {
    const rootRules = Array.from(css.sheet.cssRules).filter((cssRule) => {
        return cssRule instanceof CSSStyleRule && cssRule.selectorText === ":root";
    });
    const rootCssText = rootRules[0]?.cssText; // Using optional chaining to be safe
    if (rootCssText) {
        initTheme(rootCssText);
    }
}

export function setupThemeEditor() {
    const css = document.querySelector('[rel="stylesheet"][href*="user"]');
    const block = getGradioApp().querySelector('[id^="tab_ui_theme"]');

    if (block && css) {
        getRulesInitTheme(css);
        return;
    }

    const observer = new MutationObserver(() => {
        const css = document.querySelector('[rel="stylesheet"][href*="user"]');
        const block = getGradioApp().querySelector('[id^="tab_ui_theme"]');

        if (block) {
            if (css) {
                observer.disconnect();
                setTimeout(() => {
                    getRulesInitTheme(css);
                }, 500);
            } else {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = './file=user.css';
                document.head.appendChild(link);
            }
        }
    });

    observer.observe(getGradioApp(), {
        childList: true,
        subtree: true,
    });
}
