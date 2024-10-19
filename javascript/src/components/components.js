import {getGradioApp, getAnapnoeApp, getLoggerUiUx} from '../constants.js';
import {initSplitComponents, getSplitInstances} from './uiux/splitter.js';
import {initPortalComponents} from './uiux/portal.js';
import {initTabComponents} from './uiux/tab.js';
import {initButtonComponents} from './uiux/button.js';
import {initAccordionComponents} from './uiux/accordion.js';


export async function initUiUxComponents(contentDiv) {

    await initSplitComponents(contentDiv);
    await initPortalComponents(contentDiv);
    await initAccordionComponents(contentDiv);
    await initTabComponents(contentDiv);
    await initButtonComponents(contentDiv);

    const asideconsole = document.querySelector("#container-console-log");
    asideconsole.append(getLoggerUiUx());
    document.querySelector("#logger_screen")?.remove();
}
