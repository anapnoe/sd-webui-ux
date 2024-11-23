import {VirtualScroll} from './uiux/virtual.js';
import {TreeView} from './uiux/tree_view.js';
import {DynamicForm} from './dynamic_forms.js';
import {DEFAULT_PATH} from '../constants.js';
import {Spotlight} from "../spotlight/js/spotlight3.js";
import {updateInput, updateChange} from "../utils/helpers.js";
import {setupInputObservers, setupCheckpointChangeObserver} from '../utils/observers.js';


export async function setupSdStyles() {
    setupSdStyle('styles', "styles", "styles_data/");
}


function sdStylesCopyPath(path) {
    navigator.clipboard.writeText(path);
    console.log(path);
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

const selected_sd_styles = {};

export async function setupSdStyle(netkey, table, base_path) {

    const container = document.querySelector(`#${netkey}_cardholder`);
    const searchInput = document.querySelector(`#${netkey}_search`);
    const sortSelect = document.querySelector(`#${netkey}_sort`);
    const orderButton = document.querySelector(`#${netkey}_order`);
    const modelVerSelect = document.querySelector(`#${netkey}_sd_version`);
    const refresh = document.querySelector(`#${netkey}_refresh`);
    const rebuild_thumbs = document.querySelector(`#${netkey}_rebuild`);
    const searchClear = document.querySelector(`#${netkey}_clear`);

    const gradio_refresh = document.querySelector("#refresh_styles_database");

    selected_sd_styles[`txt2img_${table}`] = [];
    selected_sd_styles[`img2img_${table}`] = [];

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

    // Render: Item Node Renderer Overwrite
    vScroll.createItemElement = function(item, actualIndex) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item card';

        if (this.selected?.has(item.name)) {
            itemDiv.classList.add('active');
        } else {
            itemDiv.classList.remove('active');
        }

        const imageUrl = item.thumbnail;
        if (imageUrl) {       
            itemDiv.style.backgroundImage = `url('./file=${imageUrl}')`;
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
        itemActions.appendChild(itemEditMeta);

        itemDiv.appendChild(itemActions);
        itemDiv.appendChild(itemTitle);

        return itemDiv;
    };

    // Styles
    function applySdStylesPrompts(target, itemData, id) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        const prompt = itemData.prompt || "";
        const neg_prompt = itemData.negative || "";

        //console.log(target);

        if (target.classList.contains("copy-path")) {
            sdStylesCopyPath(itemData.filename);
        } else if (target.classList.contains("edit-meta")) {
            createUserMetaForm(itemData, itemData.id);
        } else if (itemData.type === "Style") {
            window.cardClicked(prompt_focused, prompt, neg_prompt, true);
            selected_sd_styles[`${prompt_focused}_styles`].push({id: itemData.id, name: itemData.name, value: prompt});
        } 
    }

    vScroll.clickHandler = function(e) {
        const {target, currentTarget: ctarget} = e;
        const itemId = target.closest('.item.card').dataset.id;
        const itemData = this.data.find(item => item.id.toString() === itemId);
        //console.log(itemId, target, this.data);
        if (itemData) {
            applySdStylesPrompts(target, itemData, itemId);
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
        applySdStylesPrompts(target, itemData, itemData.id);
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
        const currNetwork = selected_sd_styles[`${prompt_focused}_${table}`];
        setTimeout(() => {
            let txt_value = '';
            document.querySelectorAll(`#${prompt_focused}_prompt textarea, #${prompt_focused}_neg_prompt textarea`).forEach(textarea => {
                txt_value += textarea.value;
            });

            const cleanedNetwork = currNetwork.filter(network => {
                return network && network.value && txt_value.includes(network.value);
            });

            selected_sd_styles[`${prompt_focused}_${table}`] = cleanedNetwork;

            const selectedNames = new Set(cleanedNetwork.map(network => network.name));
            vScroll.selected = treeView.selected = selectedNames;

            vScroll.renderItems();
            treeView.updateSelectedItems();

        }, 100);
    }


    function selectItemsFromDB(e) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        const currNetwork = selected_sd_styles[`${prompt_focused}_${table}`];
        let txt_value = '';

        //document.querySelectorAll(`#${prompt_focused}_prompt textarea, #${prompt_focused}_neg_prompt textarea`).forEach(textarea => {
        //    txt_value += ` ${textarea.value}`;
        //});

        document.querySelectorAll(`#${prompt_focused}_prompt textarea`).forEach(textarea => {
            txt_value += `${textarea.value}`;
        });

        if(txt_value.length > 2){
            
            function cleanPhrases(input) {
                return input.replace(/[()]+|:[0-9]+(.[0-9]+)?/g, '').trim();
            }
            
            const words = txt_value.trim().split('. ');
            const cleaned_words = words.map(cleanPhrases).filter(Boolean); // Filter empty strings
            const words_dot = cleaned_words.map(word => '. ' + word);

            if(words_dot.length > 0){
                //console.log(words_dot);
                const url = '/sd_webui_ux/search_words_in_tables_columns';
                const params = {
                    words: words_dot,
                    tables: table, 
                    columns: 'prompt',
                    threshold: 1
                }

                requestPostData(url, params, function(result) {
                    const data = result[table]
                    console.log(data);
                    const cleanedNetwork = data.map(itemData => {
                        return {
                            id: itemData.id,
                            name: itemData.name,
                            value: itemData.prompt         
                        }
                    });
                
                    selected_sd_styles[`${prompt_focused}_${table}`] = cleanedNetwork;
                    vScroll.selected = treeView.selected = new Set(cleanedNetwork.map(network => network.name));
                
                });
            }
         
        }else{
            vScroll.selected = treeView.selected = new Set();
        }

        vScroll.renderItems();
        treeView.updateSelectedItems();
    }


    if (table === 'styles') {
        document.querySelectorAll('#txt2img_prompt textarea, #img2img_prompt textarea, #txt2img_neg_prompt textarea, #img2img_neg_prompt textarea').forEach(textarea => {
            textarea.addEventListener('input', selectItems);
            //textarea.addEventListener('focus', selectItems);
            textarea.addEventListener('focus', selectItemsFromDB);
        });
    } 

    // User Metadata Form
    function createUserMetaForm(itemData, id) {

        const fields = {
            local_preview: {type: 'input'},
            sd_version: {type: 'select', options: ['SD1', 'SD2', 'SD3', 'SDXL', 'PONY', 'FLUX', 'Unknown']},
            prompt: {type: 'textarea', rows: 4},
            negative: {type: 'textarea', rows: 2},
            description: {type: 'textarea', rows: 2},
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
            replace_preview: {type: 'button',  label:'Replace Preview', showLabel: false},
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


        dynamicForm.afterFormSubmit = function(data) {
            vScroll.hideDetail();
            console.log(data);
            const lp = getPathAndFilename(itemData.filename);
            const timestamp = new Date().getTime(); // Get the current timestamp
            data.thumbnail = `${lp.path}/thumbnails/${lp.filename_no_ext}.thumb.webp?t=${timestamp}`; // Append timestamp to the URL
            vScroll.updateDataById(data, id);
            treeView.updateDataById(data, id);
        };
        
        const replace_local_preview = imgEl.querySelector('button.replace_preview');
        replace_local_preview.addEventListener('click', (e) => {
            const prompt_focused = window.UIUX.FOCUS_PROMPT;
            const gallery_img = document.querySelector(`#${prompt_focused}_gallery [data-testid="detailed-image"]`);
            if(gallery_img){
                const local_preview = formEl.querySelector('#local_preview');
                local_preview.value = gallery_img.src.split('file=')[1].split('?')[0];
            }
        });

      

    }


}




