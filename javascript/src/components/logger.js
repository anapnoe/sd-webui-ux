import {DEFAULT_ASSETS_PATH, fetchAndCacheVersionData, ANAPNOE_APP_VER, getLoggerUiUx, IS_BACKEND_OPTIMIZED} from '../constants.js';

let logFunction;
async function setupLogger() {

    (function(logger) {
        console.oldLog = console.log;
        console.oldWarn = console.warn;

        logFunction = function(type, originalFunction) {
            return function(...args) {
                const maxArgs = 10;
                const limitedArgs = args.slice(0, maxArgs);

                let output = "";
                let arg, i;

                output += `
                <div class="log-row"><span class="log-date">${new Date().toLocaleString().replace(',', '')}</span>`;
                for (i = 0; i < limitedArgs.length; i++) {
                    arg = limitedArgs[i];
                    const argstr = arg.toString().toLowerCase();
                    let acolor = "";
                    if (argstr.indexOf("remove") !== -1 || argstr.indexOf("error") !== -1) {
                        acolor += " log-remove";
                    } else if (argstr.indexOf("loading") !== -1 ||
                        argstr.indexOf("| ref") !== -1 ||
                        argstr.indexOf("initial") !== -1 ||
                        argstr.indexOf("optimiz") !== -1 ||
                        argstr.indexOf("python") !== -1 ||
                        argstr.indexOf("success") !== -1) {
                        acolor += " log-load";
                    } else if (argstr.indexOf("[") !== -1) {
                        acolor += " log-object";
                    }

                    if (arg.toString().indexOf(".css") !== -1 || arg.toString().indexOf(".html") !== -1) {
                        acolor += " log-url";
                    } else if (arg.toString().indexOf("\n") !== -1) {
                        output += "<br />";
                    }

                    output += `
                    <span class="log-${(typeof arg)} ${acolor}">`;
                    if (typeof arg === "object" && typeof JSON === "object" && typeof JSON.stringify === "function") {
                        output += JSON.stringify(arg);
                    } else {
                        output += arg;
                    }

                    output += " </span>";
                }
                logger.innerHTML += output + "</div>";
                originalFunction.apply(undefined, limitedArgs); // Pass limitedArgs to the original function
            };
        };

        // Replace console.log and console.warn
        console.log = logFunction('log', console.oldLog);
        console.warn = logFunction('warn', console.oldWarn);

    })(getLoggerUiUx());

    console.log(
        '\n', "╔═╗╔═╦╦═╗╔═╦═╦╦═╦═╗", '\n', "║╬╚╣║║║╬╚╣╬║║║║╬║╩╣", '\n', "╚══╩╩═╩══╣╔╩╩═╩═╩═╝", '\n', "─────────╚╝"
    );

    console.log(`Initialize Anapnoe UI/UX runtime engine version ${ANAPNOE_APP_VER}`);
    console.log(`UI/UX Backend Optimizations:`, IS_BACKEND_OPTIMIZED);
    console.log(navigator.userAgent);
    console.log(fetchAndCacheVersionData());

    //if (window.opts && Object.keys(window.opts).length) {
    console.log("Console log enabled: ", window.opts.uiux_enable_console_log);
    console.log("Dev Mode enabled: ", window.opts.uiux_enable_dev_mode);
    console.log("Theme editor enabled: ", window.opts.uiux_enable_theme_editor);
    console.log("Maximum resolution output: ", window.opts.uiux_max_resolution_output);
    console.log("Ignore overrides: ", window.opts.uiux_ignore_overrides);
    console.log("Show ticks for input range slider: ", window.opts.uiux_show_input_range_ticks);
    console.log("Default layout: ", window.opts.uiux_default_layout);
    console.log("Disable transitions: ", window.opts.uiux_disable_transitions);
    console.log("Aside labels: ", window.opts.uiux_show_labels_aside);
    console.log("Main labels: ", window.opts.uiux_show_labels_main);
    console.log("Tabs labels: ", window.opts.uiux_show_labels_tabs);
    console.log("Hide extra info for labels, checkboxes: ", window.opts.uiux_hide_extra_info);
    //}

    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    if (isFirefox) {
        console.log("Go to the Firefox about:config page, then search and toggle layout. css.has-selector. enabled");
    }

    if (!window.opts.uiux_enable_console_log) {
        console.log = function() {};
    }

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = `${DEFAULT_ASSETS_PATH}favicon.svg/`;

}

function toggleLogger(value) {
    if (value) {
        console.log = logFunction('log', console.oldLog);
        console.warn = logFunction('warn', console.oldWarn);
    } else {
        console.log = function() {};
    }
}


export {setupLogger, toggleLogger};
