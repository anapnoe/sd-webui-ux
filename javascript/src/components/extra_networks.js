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

export async function setupExtraNetworksCheckpoints() {
    setupExtraNetwork('checkpoints', "checkpoint", "stable-diffusion/");
}

export async function setupExtraNetworksTextualinversion() {
    setupExtraNetwork('textual_inversion', "textualinversion", "embeddings/");
}

export async function setupExtraNetworksLora() {
    setupExtraNetwork('lora', "lora", "lora/");
}

export async function setupExtraNetworksHypernetworks() {
    setupExtraNetwork('hypernetworks', "hypernetwork", "hypernetworks/");
}

function extraNetworksCopyPath(path) {
    navigator.clipboard.writeText(path);
    console.log(path);
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

    // Render: Item Node Renderer Overwite
    vScroll.createItemElement = function(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item card';

        const imageUrl = item.thumbnail;
        if (imageUrl) {
            itemDiv.style.backgroundImage = `url(./sd_extra_networks/thumb?filename=${imageUrl})`;
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

    // User Metadata
    function createUserMetaForm(itemData, index) {

        const fields = {
            local_preview: {type: 'input'},
            sd_version: {type: 'select', options: ['SD1', 'SD2', 'SD3', 'SDXL', 'PONY', 'FLUX', 'Unknown']},
            preferred_weight: {type: 'slider'},
            activation_text: {type: 'textarea', rows: 2},
            negative_prompt: {type: 'textarea'},
            description: {type: 'textarea', rows: 4},
            notes: {type: 'textarea', rows: 2},
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

        const murl = `/sd_webui_ux/get_internal_metadata?type=${encodeURIComponent(itemData.type)}&name=${encodeURIComponent(itemData.name)}`;
        requestGetData(murl, function(metadata) {

            const train_tags_metadata = metadata;

            const url = '/sd_webui_ux/update_user_metadata';
            const formContainer = document.getElementById('formContainer');
            const dynamicForm = new DynamicForm(url, table, itemData, formContainer);
            const formEl = dynamicForm.createForm(fields);
            const tableEl = dynamicForm.createTable(table_data);
            const imgEl = dynamicForm.createHtmlElement(img_data);
            const train_tags_El = dynamicForm.createTagsElement(train_tags_metadata, "Train Tags");

            if (train_tags_El) {
                formEl.children[2]?.insertAdjacentElement('afterend', train_tags_El);
                let areaEl = formEl.querySelector('#activation_text');

                formEl.addEventListener('click', (e) => {
                    const textarea = e.target.closest('textarea');
                    if (textarea) areaEl = textarea;
                    const target = e.target.closest('button[type=button]');
                    if (target) {
                        const tagText = target.childNodes[0].textContent.trim();
                        const currentValue = areaEl.value;
                        if (currentValue.includes(tagText)) {
                            areaEl.value = currentValue
                                .split(',')
                                .map(tag => tag.trim())
                                .filter(tag => tag !== tagText)
                                .join(', ');
                        } else {
                            areaEl.value += (currentValue ? ', ' : '') + tagText;
                        }
                    }
                });
            }

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
                //console.log(data);
                vScroll.updateDataByIndex(data, index);
                treeView.initialize();
            };
        });

    }

    // User ExtraNetwork
    function applyExtraNetworkPrompts(target, itemData, index) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        let prompt = itemData.prompt?.replace("opts.extra_networks_default_multiplier", itemData.preferred_weight > 0 ? itemData.preferred_weight : opts.extra_networks_default_multiplier) || "";
        prompt += itemData.activation_text || "";
        const neg_prompt = itemData.negative_prompt || "";

        if (target.classList.contains("copy-path")) {
            extraNetworksCopyPath(itemData.filename);
        } else if (target.classList.contains("show-meta")) {
            requestGetMetaData(itemData.type, itemData.name, vScroll, container);
        } else if (target.classList.contains("edit-meta")) {
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


    // TreeView
    const treeView = new TreeView(`#${netkey}_tree_view`, '/sd_webui_ux/get_models_by_path', table, base_path);
    treeView.initialize();

    treeView.onFolderClicked = function(target, path, active) {
        //console.log(path, active);
        //searchInput.value = active ? path : "";
        //updateInput(searchInput);
    };

    treeView.onFileClicked = function(target, itemData) {
        applyExtraNetworkPrompts(target, itemData);
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




