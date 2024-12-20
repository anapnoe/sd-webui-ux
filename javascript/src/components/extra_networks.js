import {VirtualScroll} from './uiux/virtual.js';
import {TreeView} from './uiux/tree_view.js';
import {DynamicForm} from './dynamic_forms.js';
import {DEFAULT_PATH, SD_VERSIONS_OPTIONS} from '../constants.js';
import {Spotlight} from "../spotlight/js/spotlight3.js";
import {updateInput, sendImageParamsTo} from "../utils/helpers.js";
import {setupInputObservers, setupCheckpointChangeObserver} from '../utils/observers.js';
import {requestGetData, requestPostData} from '../utils/api.js';
import {createVirtualItemExtraNetworks} from '../utils/renderers.js';

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


export async function setupExtraNetworkCheckpoints() {
    setupExtraNetwork('checkpoints', "checkpoint", "stable-diffusion/");
}

export async function setupExtraNetworkTextualinversion() {
    setupExtraNetwork('textual_inversion', "textualinversion", "embeddings/");
}

export async function setupExtraNetworkLora() {
    setupExtraNetwork('lora', "lora", "lora/");
}

export async function setupExtraNetworkHypernetworks() {
    setupExtraNetwork('hypernetworks', "hypernetwork", "hypernetworks/");
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

const selected_networks = {};

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

    selected_networks[`txt2img_${table}`] = [];
    selected_networks[`img2img_${table}`] = [];

    const limit = 100;
    const apiUrl = `/sd_webui_ux/get_items_from_db`;
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

    let imgRes = 'thumbnail';
    // Render: Item Node Renderer Overwrite
    vScroll.createItemElement = function(item, actualIndex) {
        return createVirtualItemExtraNetworks(item, imgRes, this.selected, '/sd_extra_networks/thumb?filename=');
    };

    // ExtraNetwork
    function applyExtraNetworkPrompts(target, itemData, id) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        let prompt = itemData.prompt?.replace("opts.extra_networks_default_multiplier", itemData.preferred_weight > 0 ? itemData.preferred_weight : opts.extra_networks_default_multiplier) || "";
        prompt += itemData.activation_text || "";
        const neg_prompt = itemData.negative_prompt || "";

        //console.log(target);

        if (target.classList.contains("copy-path")) {
            navigator.clipboard.writeText(itemData.filename);
        } else if (target.classList.contains("fullsize-button")) {
            vScroll.scrollToId(itemData.id);
            if (vScroll.isFullSize) {
                imgRes = 'thumbnail';
                vScroll.setFullSize(false);
                vScroll.setLayout('vertical');
                target.classList.remove('active');
            } else {
                imgRes = 'local_preview' || 'preview';
                vScroll.setFullSize(true);
                vScroll.setLayout('vertical');
                target.classList.add('active');
            }
        } else if (target.classList.contains("info-button")) {
            vScroll.setInfo(!vScroll.isInfo);
        } else if (target.classList.contains("fullScreen-button")) {
            vScroll.scrollToId(itemData.id);
            vScroll.setFullScreen(!vScroll.isFullScreen);
        } else if (target.classList.contains("show-meta")) {
            requestGetMetaData(itemData.type, itemData.name, vScroll, container);
        } else if (target.classList.contains("edit-meta")) {
            createUserMetaForm(itemData, itemData.id);
        } else if (target.classList.contains("send-params-button")) {
            const imgUrl = `/sd_extra_networks/thumb?filename=${encodeURIComponent(itemData.preview || itemData.local_preview)}`;
            sendImageParamsTo(imgUrl, `#pnginfo_send_${prompt_focused} button`);
        } else if (itemData.type === "Checkpoint") {
            if (vScroll.isFullSize) return;
            window.selectCheckpoint(itemData.name);
        } else if (itemData.type === "TextualInversion") {
            if (vScroll.isFullSize) return;
            window.cardClicked(prompt_focused, prompt, neg_prompt, true);
            selected_networks[`${prompt_focused}_textualinversion`].push({id: itemData.id, name: itemData.name, value: prompt});
        } else if (itemData.type === "LORA") {
            if (vScroll.isFullSize) return;
            window.cardClicked(prompt_focused, prompt, neg_prompt, false);
            selected_networks[`${prompt_focused}_lora`].push({id: itemData.id, name: itemData.name, value: `<lora:${prompt.split(':')[1]}`});
        } else if (itemData.type === "Hypernetwork") {
            if (vScroll.isFullSize) return;
            window.cardClicked(prompt_focused, prompt, neg_prompt, false);
            selected_networks[`${prompt_focused}_hypernetwork`].push({id: itemData.id, name: itemData.name, value: prompt});
        }
    }

    vScroll.clickHandler = function(e) {
        if (vScroll.dragged || vScroll.scrollDelta) return;
        const itemCard = e.target.closest('.item.card');
        const itemId = itemCard?.dataset.id;
        if (itemId) {
            const itemData = this.data.find(item => item.id.toString() === itemId);
            //console.log(itemId, e.target, this.data);
            if (itemData) {
                applyExtraNetworkPrompts(e.target, itemData, itemId);
            }
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
    const treeView = new TreeView(`#${netkey}_tree_view`, '/sd_webui_ux/get_items_by_path', table, base_path);
    treeView.initialize();

    treeView.createFileItem = function(tree, key) {
        const li = document.createElement('li');
        li.dataset.name = tree[key].name;
        li.dataset.id = tree[key].id;
        if (this.selected?.has(tree[key].name)) {
            li.classList.add('active');
        }
        li.innerHTML = `<summary class="tree-file">${tree[key].name}</summary>`;
        li.classList.add('li-file');

        const itemEditMeta = document.createElement('button');
        itemEditMeta.className = `edit-meta edit-button card-button`;

        const copyPath = document.createElement('button');
        copyPath.className = `copy-path copy-path-button card-button`;

        const itemActions = document.createElement('div');
        itemActions.className = `item-actions`;

        itemActions.appendChild(copyPath);

        if (tree[key].metadata_exists) {
            const itemShowMeta = document.createElement('button');
            itemShowMeta.className = `show-meta metadata-button card-button`;
            itemActions.appendChild(itemShowMeta);
        }

        itemActions.appendChild(itemEditMeta);

        li.appendChild(itemActions);
        return li;
    };

    treeView.onFolderClicked = function(target, path, active) {
        //console.log(path, active);
        //searchInput.value = active ? path : "";
        //updateInput(searchInput);
    };

    treeView.onFileClicked = function(target, itemData) {
        applyExtraNetworkPrompts(target, itemData, itemData.id);
    };

    refresh.addEventListener('click', (e) => {
        gradio_refresh.click();
        setTimeout(() => {
            apiParams.skip = 0;
            vScroll.updateParamsAndFetch(apiParams, 0);
            treeView.initialize();
        }, 1000);
    });

    // Highlight Selected Items
    function selectItems(e) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        const currNetwork = selected_networks[`${prompt_focused}_${table}`];
        setTimeout(() => {
            let txt_value = '';
            document.querySelectorAll(`#${prompt_focused}_prompt textarea, #${prompt_focused}_neg_prompt textarea`).forEach(textarea => {
                txt_value += textarea.value;
            });

            const cleanedNetwork = currNetwork.filter(network => {
                return network && network.value && txt_value.includes(network.value);
            });

            selected_networks[`${prompt_focused}_${table}`] = cleanedNetwork;

            const selectedNames = new Set(cleanedNetwork.map(network => network.name));
            vScroll.selected = treeView.selected = selectedNames;

            vScroll.renderItems();
            treeView.updateSelectedItems();

        }, 100);
    }

    function selectItemsFromDB(e) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        const currNetwork = selected_networks[`${prompt_focused}_${table}`];
        let txt_value = '';

        document.querySelectorAll(`#${prompt_focused}_prompt textarea, #${prompt_focused}_neg_prompt textarea`).forEach(textarea => {
            txt_value += ` ${textarea.value}`;
        });

        if (txt_value.length > 2) {

            function cleanPhrases(input) {
                return input.replace(/[()]+|:[0-9]+(.[0-9]+)?/g, '').trim();
            }

            const words = txt_value.trim().split(/[\s,.]+/);
            let cleaned_words = words.map(cleanPhrases).filter(Boolean);

            if (table === 'lora' || table === 'hypernetwork') {
                const tagnet = table === 'lora' ? 'lora' : 'hypernet';
                function netTagReset(input) {
                    if (input.includes(`${tagnet}:`)) {
                        const name = input.split(`${tagnet}:`)[1].split(':')[0];
                        return `<${tagnet}:${name}:opts.extra_networks_default_multiplier>`;
                    }
                    return '';
                }
                const tag_words = txt_value.trim().split('<');
                cleaned_words = tag_words.map(netTagReset).filter(Boolean); // Filter empty
            }

            if (cleaned_words.length > 0) {
                //console.log(cleaned_words);
                const url = '/sd_webui_ux/search_words_in_tables_columns';
                const params = {
                    tables: table,
                    columns: 'prompt',
                    words: cleaned_words
                };

                requestPostData(url, params, function(result) {
                    const data = result[table];
                    //console.log(data);
                    const cleanedNetwork = data.map(itemData => {
                        let data_prompt = itemData.prompt;
                        if (table === 'lora' || table === 'hypernetwork') {
                            const tagnet = table === 'lora' ? 'lora' : 'hypernet';
                            data_prompt = `<${tagnet}:${itemData.prompt.split(':')[1]}`;
                        }

                        return {
                            id: itemData.id,
                            name: itemData.name,
                            value: data_prompt
                        };
                    });

                    selected_networks[`${prompt_focused}_${table}`] = cleanedNetwork;

                    vScroll.selected = treeView.selected = new Set(cleanedNetwork.map(network => network.name));

                    vScroll.renderItems();
                    treeView.updateSelectedItems();
                });
            }

        } else {

            vScroll.selected = treeView.selected = new Set();
            vScroll.renderItems();
            treeView.updateSelectedItems();
        }
    }


    if (table !== 'checkpoint') {
        document.querySelectorAll('#txt2img_prompt textarea, #img2img_prompt textarea, #txt2img_neg_prompt textarea, #img2img_neg_prompt textarea').forEach(textarea => {
            textarea.addEventListener('input', selectItems);
            //textarea.addEventListener('focus', selectItems);
            textarea.addEventListener('focus', selectItemsFromDB);
        });
    } else {
        setupCheckpointChangeObserver(vScroll, treeView);
    }


    // User Metadata Form
    function createUserMetaForm(itemData, id) {

        const fields = {
            local_preview: {type: 'input', name: 'local_preview'},
            sd_version: {
                type: 'select', name: 'sd_version', label: 'SD Version', value: itemData.sd_version,
                options: SD_VERSIONS_OPTIONS
            },
            preferred_weight: {type: 'number', name: 'preferred_weight', label: 'Preferred Weight'},
            activation_text: {type: 'textarea', name: 'activation_text', label: "Activation Text", rows: 4},
            negative_prompt: {type: 'textarea', name: 'negative_prompt', label: "Negative Prompt", rows: 2},
            description: {type: 'textarea', name: 'description', label: "Description", rows: 2},
            tags: {type: 'textarea', name: 'tags', label: "Tags"},
            notes: {type: 'textarea', name: 'notes', label: 'Notes', rows: 2}
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
            thumbnail: {type: 'img', api: '/sd_extra_networks/thumb?filename=', showLabel: false},
            replace_preview: {type: 'button', label: 'Replace Preview', showLabel: false},
            browse_preview: {type: 'button', label: 'Browse Preview', showLabel: false},
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

            function removeExtension(filename) {
                const lastDotIndex = filename.lastIndexOf('.');
                if (lastDotIndex === -1) {
                    return filename;
                }
                return filename.substring(0, lastDotIndex);
            }

            function getPathAndFilename(filePath) {
                const lastSlashIndex = filePath.lastIndexOf('/');
                const path = filePath.substring(0, lastSlashIndex);
                const filename = filePath.substring(lastSlashIndex + 1);
                const lastDotIndex = filename.lastIndexOf('.');
                const filename_no_ext = filename.substring(0, lastDotIndex);

                return {
                    path: path,
                    filename: filename,
                    filename_no_ext: filename_no_ext
                };
            }

            let source_file;
            let upload_file;

            dynamicForm.beforeFormSubmit = function(fdata) {
                fdata.id = itemData.id;
                fdata.type = itemData.type;
                fdata.name = itemData.name;
                fdata.prompt = itemData.prompt;
                fdata.filename = itemData.filename;
                if (source_file) fdata.source_file = source_file;
                if (upload_file) fdata.file = upload_file;
                console.log(fdata);
                return fdata;
            };


            let local_preview_path_value = itemData.local_preview;

            dynamicForm.afterFormSubmit = function(data) {
                vScroll.hideDetail();
                //console.log(data);
                const lp = getPathAndFilename(local_preview_path_value);
                const timestamp = new Date().getTime();
                //data.thumbnail = `${lp.path}/thumbnails/${lp.filename_no_ext}.thumb.webp?t=${timestamp}`; // Append timestamp to the URL
                data.thumbnail = `${lp.path}/thumbnails/${lp.filename_no_ext}.thumb.webp`;
                data.timestamp = `&t=${timestamp}`;
                vScroll.updateDataById(data, id);
                //treeView.updateDataById(data, id);
                treeView.update();
            };

            const replace_local_preview = imgEl.querySelector('button.replace_preview');
            const thumb_preview = imgEl.querySelector('.thumbnail-image');
            replace_local_preview.addEventListener('click', (e) => {
                const prompt_focused = window.UIUX.FOCUS_PROMPT;
                const gallery_img = document.querySelector(`#${prompt_focused}_gallery [data-testid="detailed-image"]`);
                if (gallery_img) {
                    //const local_preview = formEl.querySelector('#local_preview_path input');
                    source_file = gallery_img.src.split('file=')[1].split('?')[0];
                    thumb_preview.style.filter = 'grayscale(1)';
                }
            });

            const browse_fileInput = document.createElement('input');
            browse_fileInput.type = 'file';
            browse_fileInput.accept = 'image/jpeg, image/png, image/webp, image/gif';
            browse_fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    upload_file = file;
                    thumb_preview.style.filter = 'grayscale(1)';
                }
            });

            const browse_preview = imgEl.querySelector('button.browse_preview');
            browse_preview.addEventListener('click', (e) => {
                browse_fileInput.click();
            });

        });

    }


}




