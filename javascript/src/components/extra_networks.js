import {VirtualScroll} from './uiux/virtual.js';
import {TreeView} from './uiux/tree_view.js';
import {DynamicForm} from './dynamic_forms.js';
import {DEFAULT_PATH} from '../constants.js';
import {Spotlight} from "../spotlight/js/spotlight3.js";
import {updateInput, updateChange} from "../utils/helpers.js";
import {setupInputObservers} from '../utils/observers.js';

export async function refreshDirectory(directory) {

    const apiUrl = `/refresh/`;
    const requestData = {directory: directory};

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log(result.message); // Display success message
        } else {
            const error = await response.json();
            console.error('Error:', error.detail); // Display error message
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

export async function setupExtraNetworks() {
    setupExtraNetwork('checkpoints', "checkpoint", "stable-diffusion/");
    setupExtraNetwork('textual_inversion', "textualinversion", "embeddings/");
    setupExtraNetwork('lora', "lora", "lora/");
    setupExtraNetwork('hypernetworks', "hypernetwork", "hypernetworks/");
}

function extraNetworksCopyPath(path) {
    navigator.clipboard.writeText(path);
    console.log(path);
}


const extraPageUserMetadataEditors = {};

function extraNetworksEditMetadata(tabname, extraPage, cardname) {
    const id = tabname + '_' + extraPage + '_edit_user_metadata';
    let editor = extraPageUserMetadataEditors[id];
    if (!editor) {
        editor = {};
        editor.page = gradioApp().getElementById(id);
        editor.nameTextarea = gradioApp().querySelector("#" + id + "_name" + ' textarea');
        editor.button = gradioApp().querySelector("#" + id + "_button");
        extraPageUserMetadataEditors[id] = editor;
    }

    editor.nameTextarea.value = cardname;
    updateInput(editor.nameTextarea);
    editor.button.click();

    console.log(editor);

    return editor.page;
}

function extraNetworksRefreshSingleCard(page, tabname, name) {
    requestGet("./sd_extra_networks/get-single-card", {page: page, tabname: tabname, name: name}, function(data) {
        if (data && data.html) {
            var card = gradioApp().querySelector(`#${tabname}_${page.replace(" ", "_")}_cards > .card[data-name="${name}"]`);

            var newDiv = document.createElement('DIV');
            newDiv.innerHTML = data.html;
            var newCard = newDiv.firstElementChild;

            newCard.style.display = '';
            card.parentElement.insertBefore(newCard, card);
            card.parentElement.removeChild(card);
        }
    });
}

async function requestGetData(url, callback) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        callback(data);
    } catch (error) {
        console.error('Failed to fetch metadata:', error);
    }
}

async function requestPostData(url, params, callback) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        callback(data);
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

function detailView(container, elem) {
    const dcontainer = container.parentElement.querySelector('.ae-virtual-detail-content');
    dcontainer.innerHTML = '';
    dcontainer.appendChild(elem);
}

async function requestGetMetaData(type, name, vScroll, container) {
    const url = `/sd_webui_ux/get_internal_metadata?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`;
    requestGetData(url, function(metadata) {
        console.log(metadata);
        vScroll.showDetail();
        const parsed = window.extraNetworksFlattenMetadata(metadata);
        const tableEl = window.createVisualizationTable(parsed, 0);
        detailView(container, tableEl);
    });
}

function createUserMetadataForm(table_name, itemData, vScroll, container, apiParams) {
    // Create form element
    const form = document.createElement('form');
    form.setAttribute('id', 'userMetadataForm');
    form.classList.add('flexbox', 'padding', 'col', 'shrink');

    // Formatters
    const formatFileSize = (size) => {
        if (size >= 1073741824) {
            return (size / 1073741824).toFixed(2) + ' GB';
        } else if (size >= 1048576) {
            return (size / 1048576).toFixed(2) + ' MB';
        } else if (size >= 1024) {
            return (size / 1024).toFixed(2) + ' KB';
        } else {
            return size + ' bytes';
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();// + ' ' + date.toLocaleTimeString();
    };

    const formatFilename = (path) => {
        return path.replace(/\\/g, '/').split('/').pop();
    };

    // Editable fields
    const editableFields = {
        local_preview: 'input',
        sd_version: 'select',
        description: 'textarea',
        notes: 'textarea',
        tags: 'textarea'
    };

    // Non-editable fields
    const nonEditableLeftFields = {
        filename: 'filename',
        filesize: 'filesize',
        type: 'text',
        hash: 'text',
        date_created: 'date-format',
        date_modified: 'date-format',
    };

    const nonEditableRightFields = {
        thumbnail: 'img'
    };

    // Elements to a section
    function addElementToSection(section, field, type, value, labelText, isTable = false) {
        let row, labelCell, valueCell;
        if (isTable) {
            row = document.createElement('tr');
            labelCell = document.createElement('td');
            valueCell = document.createElement('td');
        } else {
            row = section;
            labelCell = document.createElement('label');
            valueCell = document.createElement('span');
        }

        labelCell.textContent = labelText;
        row.appendChild(labelCell);

        let valueContent;
        if (type === 'filename') {
            valueContent = document.createElement('span');
            valueContent.textContent = formatFilename(value);
        } else if (type === 'filesize') {
            valueContent = document.createElement('span');
            valueContent.textContent = formatFileSize(value);
        } else if (type === 'date-format') {
            valueContent = document.createElement('span');
            valueContent.textContent = formatDate(value);
        } else if (type === 'img') {
            row.removeChild(labelCell);
            valueContent = document.createElement('img');
            valueContent.setAttribute('src', 'file=' + value);
            valueContent.setAttribute('alt', field);
        } else {
            valueContent = document.createElement('span');
            valueContent.textContent = value || '';
        }

        if (valueContent) {
            valueContent.setAttribute('id', field);
            valueContent.setAttribute('name', field);
            valueCell.appendChild(valueContent);
        }

        row.appendChild(valueCell);
        if (row !== section) section.appendChild(row);
    }

    // Create non-editable
    const rowContainer = document.createElement('div');
    rowContainer.classList.add('non-editable-info', 'row', 'flexbox');

    const leftSection = document.createElement('div');
    leftSection.classList.add('non-editable-div', 'panel', 'shrink');
    for (const [field, type] of Object.entries(nonEditableRightFields)) {
        addElementToSection(leftSection, field, type, itemData[field], field.replace('_', ' ').toUpperCase());
    }
    rowContainer.appendChild(leftSection);

    const rightSection = document.createElement('table');
    rightSection.classList.add('non-editable-table', 'panel');
    for (const [field, type] of Object.entries(nonEditableLeftFields)) {
        addElementToSection(rightSection, field, type, itemData[field], field.replace('_', ' ').toUpperCase(), true);
    }
    rowContainer.appendChild(rightSection);

    form.appendChild(rowContainer);

    // Create editable
    for (const [field, type] of Object.entries(editableFields)) {
        const fieldContainer = document.createElement('div');
        fieldContainer.classList.add('panel', 'col', 'padding');
        const label = document.createElement('label');
        label.setAttribute('for', field);
        label.classList.add('flexbox');
        label.textContent = field.replace('_', ' ').toUpperCase();

        let input;
        if (type === 'textarea') {
            input = document.createElement('textarea');
            input.setAttribute('rows', 4);
        } else if (type === 'select') {
            input = document.createElement('select');
            const option = document.createElement('option');
            option.value = itemData[field];
            option.textContent = itemData[field];
            input.appendChild(option);
        } else {
            input = document.createElement('input');
            input.setAttribute('type', type);
        }

        input.setAttribute('id', field);
        input.setAttribute('name', field);
        input.value = itemData[field] || '';

        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);
        form.appendChild(fieldContainer);
    }


    const savePanel = document.createElement('div');
    savePanel.classList.add('panel', 'row', 'flex-end');
    const submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'submit');
    submitButton.textContent = 'Save';
    submitButton.classList.add('submit-button');
    savePanel.appendChild(submitButton);
    form.appendChild(savePanel);


    vScroll.showDetail();
    detailView(container, form);


    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(form);
        const fdata = {};
        for (const [key, value] of formData.entries()) {
            fdata[key] = value;
        }
        const url = '/sd_webui_ux/update_user_metadata';
        fdata.table_name = table_name;
        fdata.name = itemData.name;
        //console.log("Sending payload:", fdata);
        requestPostData(url, fdata, function(data) {
            //console.log(data);
            vScroll.hideDetail();
            apiParams.skip = 0;
            vScroll.updateParamsAndFetch(apiParams, 0);
        });
    });
}



export async function setupExtraNetwork(netkey, table, base_path) {

    const container = document.querySelector(`#${netkey}_cardholder`);
    const searchInput = document.querySelector(`#${netkey}_search`);
    const sortSelect = document.querySelector(`#${netkey}_sort`);
    const orderButton = document.querySelector(`#${netkey}_order`);
    const modelVerSelect = document.querySelector(`#${netkey}_sd_version`);
    const refresh = document.querySelector(`#${netkey}_refresh`);
    const rebuild_thumbs = document.querySelector(`#${netkey}_rebuild`);
    const searchClear = document.querySelector(`#${netkey}_clear`);
    //const treeViewContainer = document.querySelector(`#${netkey}_tree_view`);

    const gradio_refresh = document.querySelector("#refresh_database");

    const limit = 100;
    const apiUrl = `/sd_webui_ux/get_models_from_db`;
    const method = `GET`;

    const initApiParams = {
        table_name: table,
        skip: 0,
        limit: limit,
        sort_by: "name",
        order: "asc",
        search_term: "",
    };

    const itemKeys = {
        title: 'name',
        url: 'preview',
        dataPath: 'items'
    };

    const paramsMapping = {
        [`#${netkey}_search`]: 'search_term',
        [`#${netkey}_sort`]: 'sort_by',
        [`#${netkey}_search_in`]: 'search_columns',
        [`#${netkey}_sd_version`]: 'sd_version'
    };

    const modifyParams = (params) => {
        params.skip = 0;
        return params;
    };

    const vScroll = new VirtualScroll(container, [], 18, itemKeys, apiUrl, initApiParams, method);
    const apiParams = setupInputObservers(paramsMapping, initApiParams, vScroll, modifyParams);

    vScroll.setNextCursor = function(nextCursor) {
        if (nextCursor && this.data.length > 0) {
            this.params.skip = this.params.cursor = nextCursor;
        } else {
            delete this.params.cursor;
        }
    };

    //Render: Item Node Renderer Overwite
    vScroll.createItemElement = function(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item card';

        const imageUrl = item.thumbnail;
        if (imageUrl) {
            itemDiv.style.backgroundImage = `url(file=${imageUrl})`;
        }

        const itemTitle = document.createElement('span');
        itemTitle.textContent = item.name;
        itemTitle.className = 'title';

        const itemEditMeta = document.createElement('button');
        itemEditMeta.className = `edit-meta edit-button card-button`;

        const copyPath = document.createElement('button');
        copyPath.className = `copy-path copy-path-button card-button`;

        const itemActions = document.createElement('div');
        itemActions.className = `item-actions`;

        itemActions.appendChild(copyPath);

        if (item.metadata_exists) {
            const itemShowMeta = document.createElement('button');
            itemShowMeta.className = `show-meta metadata-button card-button`;
            itemActions.appendChild(itemShowMeta);
        }

        itemActions.appendChild(itemEditMeta);

        itemDiv.appendChild(itemActions);
        itemDiv.appendChild(itemTitle);

        return itemDiv;
    };

    function createUserMetaForm(itemData, index) {

        const fields = {
            local_preview: {type: 'input'},
            sd_version: {type: 'select', options: ['SD1', 'SD2', 'SD3', 'SDXL', 'PONY', 'FLUX', 'Unknown']},
            description: {type: 'textarea'},
            notes: {type: 'textarea'},
            tags: {type: 'textarea'}
        };

        const table_data = {
            filename: {type: 'filename'},
            filesize: {type: 'filesize'},
            type: {type: 'text'},
            hash: {type: 'text'},
            date_created: {type: 'date-format'},
            date_modified: {type: 'date-format'},
        };

        const img_data = {
            thumbnail: {type: 'img', showLabel: false},
            replace_preview: {type: 'button', showLabel: false},
        };


        const url = '/sd_webui_ux/update_user_metadata';
        const formContainer = document.getElementById('formContainer');
        const dynamicForm = new DynamicForm(url, table, itemData, formContainer);
        const formEl = dynamicForm.createForm(fields);
        const tableEl = dynamicForm.createTable(table_data);
        const imgEl = dynamicForm.createHtmlElement(img_data);

        const rowContainer = document.createElement('div');
        rowContainer.classList.add('non-editable-info', 'flexbox', 'padding', 'shrink');

        rowContainer.appendChild(imgEl);
        rowContainer.appendChild(tableEl);

        vScroll.showDetail();
        const dcontainer = container.parentElement.querySelector('.ae-virtual-detail-content');
        dcontainer.innerHTML = '';
        dcontainer.appendChild(rowContainer);
        dcontainer.appendChild(formEl);

        dynamicForm.afterFormSubmit = function(data) {
            vScroll.hideDetail();
            console.log(data);
            vScroll.updateDataByIndex(data, index);
            //apiParams.skip = 0;
            //vScroll.updateParamsAndFetch(apiParams, 0);
            //treeView.initialize();
        };
        //detailView(container, formEl);

    }


    function applyExtraNetworkPrompts(target, itemData, index) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        const prompt = itemData.prompt?.replace("opts.extra_networks_default_multiplier", opts.extra_networks_default_multiplier) || "";
        const neg_prompt = itemData.negative_prompt || "";

        if (target.classList.contains("copy-path")) {
            extraNetworksCopyPath(itemData.filename);
        } else if (target.classList.contains("show-meta")) {
            requestGetMetaData(itemData.type, itemData.name, vScroll, container);
        } else if (target.classList.contains("edit-meta")) {
            //createUserMetadataForm(table_name, itemData, vScroll, container, apiParams);
            createUserMetaForm(itemData, index);

        } else if (itemData.type === "Checkpoint") {
            window.selectCheckpoint(itemData.name);
        } else if (itemData.type === "TextualInversion") {
            window.cardClicked(prompt_focused, prompt, neg_prompt, true);
        } else if (itemData.type === "LORA" || itemData.type === "Hypernetwork") {
            window.cardClicked(prompt_focused, prompt, neg_prompt, false);
        }
    }


    vScroll.clickHandler = function(e) {
        const {target: target, currentTarget: ctarget} = e;
        const index = target.closest('.item.card').dataset.index;
        const itemData = this.data[index];
        if (itemData) {
            applyExtraNetworkPrompts(target, itemData, index);
            console.log(itemData);
        }
        e.stopPropagation();
    };

    rebuild_thumbs.addEventListener('click', (e) => {
        /*
        requestPostData('/sd_webui_ux/generate-thumbnail', {table_name: table, file_id: parseInt(fileId)}, (metadata) => {
            document.getElementById('status').innerText = metadata.message;
        });
        */

        requestPostData('/sd_webui_ux/generate-thumbnails', {table_name: table}, function(data) {
            console.log(data);
            //gradio_refresh.click();
            setTimeout(() => {
                apiParams.skip = 0;
                vScroll.updateParamsAndFetch(apiParams, 0);
            }, 1000);
        });
    });

    orderButton.addEventListener('click', (e) => {
        const val = orderButton.classList.contains("active");
        apiParams.skip = 0;
        apiParams.order = val ? "desc" : "asc";
        vScroll.updateParamsAndFetch(apiParams, 0);
    });

    searchClear.addEventListener('click', (e) => {
        searchInput.value = "";
        updateInput(searchInput);
    });

    vScroll.updateParamsAndFetch(apiParams, 0);


    const treeView = new TreeView(`#${netkey}_tree_view`, '/sd_webui_ux/get_models_by_path', table, base_path);
    treeView.initialize();

    treeView.onFolderClicked = function(target, path, active) {
        //console.log(path, active);
        //searchInput.value = active ? path : "";
        //updateInput(searchInput);
    };

    treeView.onFileClicked = function(target, itemData) {
        applyExtraNetworkPrompts(target, itemData);
        //console.log(itemData);
    };

    refresh.addEventListener('click', (e) => {
        gradio_refresh.click();
        setTimeout(() => {
            apiParams.skip = 0;
            vScroll.updateParamsAndFetch(apiParams, 0);
            treeView.initialize();
        }, 1000);
    });


}




