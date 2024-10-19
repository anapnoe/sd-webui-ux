import {getDefaultTemplatesPath, VERSION_DATA, EXTENSION_TEMPLATE_MAP, getAnapnoeTabContent, IS_BACKEND_OPTIMIZED} from '../constants.js';

export async function getNestedTemplates(container) {
    const nestedData = [];
    container.querySelectorAll('.template:not([status])').forEach((el) => {
        const obj = {};
        const url = el.getAttribute('url');
        obj.url = url || getDefaultTemplatesPath(); // Set URL
        const key = el.getAttribute('key');
        obj.key = key || undefined; // Set key if available
        const template = el.getAttribute('template') || el.id;
        if (template) {
            if (!IS_BACKEND_OPTIMIZED && template.includes("about")) {
                obj.template = `${template}-extension.html`;
            } else {
                obj.template = `${template}.html`;
            }
        } else {
            console.warn('Template not found on element:', el);
            return; // Skip this iteration if there is no template
        }

        obj.id = el.id; // Set ID
        obj.extensionEnabled = isExtensionEnabled(obj.template); // Check if the extension checkbox is checked
        nestedData.push(obj);
    });
    return nestedData;
}


function isExtensionEnabled(templateName) {
    const extensionKey = EXTENSION_TEMPLATE_MAP[templateName];
    if (!extensionKey) {
        return false; // Return false if it's not an extension
    }
    //const checkbox = document.querySelector(`#extensions input[name="${extensionKey}"]`);
    //return checkbox ? checkbox.checked : false;
    return !!document.head.querySelector(`script[type="text/javascript"][src*="${extensionKey}"]`);
}

export async function loadCurrentTemplate(data, i) {
    const curr_data = data[i];
    const next = i < data.length;

    if (!curr_data) {
    // console.error("No current data for index:", i);
        return; // Safeguard if curr_data is undefined
    }

    let target;

    const isExtension = curr_data.template in EXTENSION_TEMPLATE_MAP;

    if (isExtension && !curr_data.extensionEnabled) {
        console.log(`Skipping loading for extension template ${curr_data.template} (extension disabled)`);
        await loadCurrentTemplate(data, i + 1);
        return;
    }

    if (next) {
        if (curr_data?.parent) {
            target = curr_data.parent;
        } else if (curr_data?.id) {
            target = document.querySelector(`#${curr_data.id}`);
        }

        if (target) {
            const url = `${curr_data.url}${curr_data.template}`;
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const responseText = await response.text();
                    const tempDiv = document.createElement('div');

                    // Handle key substitution
                    if (curr_data.key) {
                        const filtered = responseText.replace(/\s*\{\{.*?\}\}\s*/g, curr_data.key);
                        tempDiv.innerHTML = filtered;
                    } else {
                        tempDiv.innerHTML = responseText;
                    }

                    const nestedData = await getNestedTemplates(tempDiv);
                    if (nestedData.length > 0) {
                        data = data.concat(nestedData); // Append nested data
                    }

                    console.log('Template loaded', url);
                    target.setAttribute('status', 'true');
                    target.append(tempDiv.firstElementChild);
                    await loadCurrentTemplate(data, i + 1);
                } else if (response.status === 404) {
                    console.error('404 template:', url);
                    target.setAttribute('status', 'error');
                    await loadCurrentTemplate(data, i + 1);
                }
            } catch (error) {
                console.error('Error loading template:', error);
                target.setAttribute('status', 'error');
                await loadCurrentTemplate(data, i + 1);
            }
        }
    } else {
        console.log('Template files merged successfully');
    }
}

export async function loadTemplates() {

    console.log('Loading Templates', VERSION_DATA.gradio);
    const data = [
        {
            url: getDefaultTemplatesPath(),
            template: 'template-app-root.html',
            parent: getAnapnoeTabContent(),
        },
    ];

    await loadCurrentTemplate(data, 0); // Start loading templates
}
