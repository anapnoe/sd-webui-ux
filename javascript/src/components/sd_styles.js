import {VirtualScroll} from './uiux/virtual.js';
import {TreeView} from './uiux/tree_view.js';
import {DynamicForm} from './dynamic_forms.js';
import {DEFAULT_PATH, SD_VERSIONS_OPTIONS} from '../constants.js';
import {Spotlight} from "../spotlight/js/spotlight3.js";
import {updateInput, updateChange} from "../utils/helpers.js";
import {setupInputObservers, setupCheckpointChangeObserver} from '../utils/observers.js';
import {requestGetData, requestPostData} from '../utils/api.js';


export async function setupSdStyles() {
    setupSdStyle('styles', "styles", "styles_data/");
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
        const timestamp = item.timestamp || '';
        if (imageUrl) {
            itemDiv.style.backgroundImage = `url('/sd_styles/thumb/${encodeURIComponent(imageUrl)}${timestamp}')`;
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
            navigator.clipboard.writeText(itemData.filename);
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
        requestPostData('/sd_webui_ux/generate-thumbnails', {table_name: table}, function(data) {
            //console.log(data);
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

        if (txt_value.length > 2) {

            function cleanPhrases(input) {
                return input.replace(/[()]+|:[0-9]+(.[0-9]+)?/g, '').trim();
            }

            const words = txt_value.trim().split('. ');
            const cleaned_words = words.map(cleanPhrases).filter(Boolean); // Filter empty strings
            const words_dot = cleaned_words.map(word => '. ' + word);

            if (words_dot.length > 0) {
                //console.log(words_dot);
                const url = '/sd_webui_ux/search_words_in_tables_columns';
                const params = {
                    words: words_dot,
                    tables: table,
                    columns: 'prompt',
                    threshold: 1
                };

                requestPostData(url, params, function(result) {
                    const data = result[table];
                    console.log(data);
                    const cleanedNetwork = data.map(itemData => {
                        return {
                            id: itemData.id,
                            name: itemData.name,
                            value: itemData.prompt
                        };
                    });

                    selected_sd_styles[`${prompt_focused}_${table}`] = cleanedNetwork;
                    vScroll.selected = treeView.selected = new Set(cleanedNetwork.map(network => network.name));

                });
            }

        } else {
            vScroll.selected = treeView.selected = new Set();
        }

        vScroll.renderItems();
        treeView.updateSelectedItems();
    }


    //if (table === 'styles') {
    document.querySelectorAll('#txt2img_prompt textarea, #img2img_prompt textarea, #txt2img_neg_prompt textarea, #img2img_neg_prompt textarea').forEach(textarea => {
        textarea.addEventListener('input', selectItems);
        //textarea.addEventListener('focus', selectItems);
        textarea.addEventListener('focus', selectItemsFromDB);
    });
    //}

    // User Metadata Form
    function createUserMetaForm(itemData, id) {
        const styles_folders = treeView.subpaths;
        const styles_folders_options = new Set(styles_folders.map(folder => folder.relativePath));
        const styles_folders_options_array = Array.from(styles_folders_options);
        let styles_folders_select_options = [{value: 'None', textContent: 'None'}];
        let styles_folders_selected;

        styles_folders_options_array.forEach(option => {
            if (itemData.filename.includes(`${option}/`)) {
                styles_folders_selected = option;
            }
            styles_folders_select_options.push(
                {
                    value: option,
                    textContent: option,
                }
            );
        });

        const fields = {
            local_preview: {type: 'input', id: 'local_preview_path', name: 'local_preview', label: "Local Preview"},
            row: {
                type: 'row',
                draw: 'true',
                id: 'parent_folder_select_row',
                label: 'Parent Category / Filename',
                children: [
                    {
                        parent_folder: {
                            type: 'select',
                            id: 'parent_folder_select',
                            class: 'grow',
                            value: styles_folders_selected,
                            options: styles_folders_select_options
                        }
                    },
                    {
                        save_path: {type: 'input', id: 'parent_folder_save', class: 'grow', value: itemData.name, label: "Style Name"},
                    }
                ]
            },
            sd_version: {
                type: 'select', name: 'sd_version', label: "SD Version", value: itemData.sd_version,
                options: SD_VERSIONS_OPTIONS
            },
            prompt: {type: 'textarea', name: 'prompt', label: "Prompt", rows: 4},
            negative: {type: 'textarea', name: 'negative', label: "Negative Prompt", rows: 2},
            description: {type: 'textarea', name: 'description', label: "Description", rows: 2},
            tags: {type: 'textarea', name: 'tags', label: "Tags"}
        };

        const table_data = {
            filename: {type: 'filename', label: 'Filename'},
            filesize: {type: 'filesize', label: 'Filesize'},
            type: {type: 'text', label: 'Type'},
            hash: {type: 'text', label: 'Hash'},
            date_created: {type: 'date-format', label: 'Date Created'},
            date_modified: {type: 'date-format', label: 'Date Modified'},
        };

        const img_data = {
            thumbnail: {type: 'img', api: '/sd_styles/thumb/', showLabel: false},
            replace_preview: {type: 'button', label: 'Replace Preview', showLabel: false},
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

        const parent_folder_select = formEl.querySelector('#parent_folder_select');
        const parent_folder_select_label = formEl.querySelector('#parent_folder_select_row label');
        const parent_folder_save = formEl.querySelector('#parent_folder_save');
        const local_preview_path = formEl.querySelector('#local_preview_path input');

        const delete_button = formEl.querySelector('button.delete');

        let local_preview_path_value;


        const clearPath = (path) => path.replace(/\/{2,}/g, '/');

        const updateParentFolder = (e) => {
            const selectedPath = parent_folder_select.value !== 'None' ? parent_folder_select.value : '';
            const fileName = parent_folder_save.value;
            const relativePath = `${selectedPath}/${fileName}`;
            parent_folder_select_label.textContent = `Style will be saved: ${clearPath(relativePath)}.png`;
            local_preview_path_value = clearPath(`${styles_folders[0].basePath}/${relativePath}.png`);
            local_preview_path.value = local_preview_path_value;
        };

        parent_folder_select.addEventListener('change', updateParentFolder);
        parent_folder_save.addEventListener('input', updateParentFolder);
        updateParentFolder();

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

        dynamicForm.beforeFormSubmit = function(fdata) {
            fdata.name = getPathAndFilename(local_preview_path_value).filename_no_ext;
            fdata.filename = local_preview_path_value;
            fdata.type = 'Style';
            fdata.id = itemData.id;
            if (source_file) fdata.source_file = source_file;
            return fdata;
        };

        dynamicForm.afterFormSubmit = function(data) {
            vScroll.hideDetail();
            //console.log(data);
            const lp = getPathAndFilename(local_preview_path_value);
            const timestamp = new Date().getTime();
            data.thumbnail = `${lp.path}/thumbnails/${lp.filename_no_ext}.thumb.webp`;
            data.timestamp = `?t=${timestamp}`;
            data.local_preview = local_preview_path_value;
            vScroll.updateDataById(data, id);
            //treeView.updateDataById(data, id);
            treeView.update();
        };

        const replace_local_preview = imgEl.querySelector('button.replace_preview');
        replace_local_preview.addEventListener('click', (e) => {
            const prompt_focused = window.UIUX.FOCUS_PROMPT;
            const gallery_img = document.querySelector(`#${prompt_focused}_gallery [data-testid="detailed-image"]`);
            if (gallery_img) {
                const thumb_preview = imgEl.querySelector('.thumbnail-image');
                //const local_preview = formEl.querySelector('#local_preview_path input');
                source_file = gallery_img.src.split('file=')[1].split('?')[0];
                thumb_preview.style.filter = 'grayscale(1)';
            }
        });

        delete_button.addEventListener('click', (e) => {

            const url = '/sd_webui_ux/delete_item';
            const params = {
                table_name: table,
                item_id: itemData.id,
            };

            requestPostData(url, params, function(result) {
                console.log(result);
                vScroll.hideDetail();
                apiParams.skip = 0;
                vScroll.updateParamsAndFetch(apiParams, 0);
                treeView.update();

            });

        });
    }


}




