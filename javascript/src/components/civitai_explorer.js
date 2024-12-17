import {VirtualScroll} from './uiux/virtual.js';
import {DEFAULT_PATH} from '../constants.js';
import {Spotlight} from "../spotlight/js/spotlight3.js";
import {updateInput, sendImageParamsTo} from "../utils/helpers.js";
import {setupInputObservers} from '../utils/observers.js';
import {createVirtualItemCivitImages, createVirtualItemCivitModels, createVirtualItemCivitModelsDetail} from '../utils/renderers.js';

export function setupCivitaiExplorerTestData() {

    const container = document.querySelector('#civitai_cardholder');
    const searchInput = document.querySelector('#civit_search textarea');

    // Sample data
    //const data = Array.from({length: 1000}, (_, i) => ({
    //    username: `item ${i + 1}`,
    //    url: `https://via.placeholder.com/150?text=Item+${i + 1}`,
    //}));

    //const data = Array.from({length: 1000}, (_, i) => ({
    //    name: `item ${i + 1}`,
    //    preview: `https://via.placeholder.com/150?text=Item+${i + 1}`,
    //}));

    const virtualScroll = new VirtualScroll(container, data, 12);

}

export async function setupCivitaiExplorer() {
    setupCivitaiExplorerImages();
    setupCivitaiExplorerModels();
}


export async function setupCivitaiExplorerImages() {

    const container = document.querySelector('#civitai_cardholder_images');
    const searchInput = document.querySelector('#civit_search_images');
    const searchClear = document.querySelector('#civit_search_images_clear');


    const limit = 100;
    const apiUrl = `/sd_webui_ux/civitai_proxy/images`;

    const paramsMapping = {
        "#civit_nsfw_images": 'nsfw',
        "#civit_sort_images": 'sort',
        "#civit_period_images": 'period',
        "#civit_search_images": 'username'
    };

    const initApiParams = {
        limit: limit,
        page: 1,
    };

    const itemKeys = {
        title: 'username',
        url: 'url',
        dataPath: 'items'
    };

    const vScroll = new VirtualScroll(container, [], 18, itemKeys, apiUrl, initApiParams);
    const apiParams = setupInputObservers(paramsMapping, initApiParams, vScroll);

    vScroll.createItemElement = function(item, actualIndex) {
        return createVirtualItemCivitImages(item);
    };

    function handleCivitImages(target, itemData, item_id) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        if (target.classList.contains("copy-path")) {
            navigator.clipboard.writeText(itemData.filename);
        } else if (target.classList.contains("fullsize-button")) {
            vScroll.scrollToId(itemData.id);
            if (vScroll.isFullSize) {
                vScroll.setFullSize(false);
                vScroll.setLayout('vertical');
                target.classList.remove('active');
            } else {
                vScroll.setFullSize(true);
                vScroll.setLayout('vertical');
                target.classList.add('active');
            }
        } else if (target.classList.contains("info-button")) {
            vScroll.setInfo(!vScroll.isInfo);
        } else if (target.classList.contains("fullScreen-button")) {
            vScroll.scrollToId(itemData.id);
            vScroll.setFullScreen(!vScroll.isFullScreen);
        } else if (target.classList.contains("send-params-button")) {
            const imgUrl = `${itemData.url}`;
            sendImageParamsTo(imgUrl, `#pnginfo_send_${prompt_focused} button`);
        } else if (target.classList.contains("item-info-title")) {
            searchInput.value = target.textContent;
            updateInput(searchInput);
        }
    }

    vScroll.clickHandler = function(e) {
        if (vScroll.dragged || vScroll.scrollDelta) return;
        const itemCard = e.target.closest('.item.card');
        const itemId = itemCard?.dataset.id;
        if (itemId) {
            const itemData = this.data.find(item => item.id.toString() === itemId);
            console.log(itemId, e.target, itemData);
            if (itemData) {
                handleCivitImages(e.target, itemData, itemId);
            }
        }
        e.preventDefault();
        e.stopPropagation();
    };

    function handleSearchClear(e) {
        searchInput.value = "";
        updateInput(searchInput);
    }
    searchClear.addEventListener('click', handleSearchClear);

    vScroll.updateParamsAndFetch(apiParams, 0);

}

export async function setupCivitaiExplorerModels() {
    const container = document.querySelector('#civitai_cardholder_models');
    const searchInput = document.querySelector('#civit_search_models');
    const searchClear = document.querySelector('#civit_search_models_clear');

    const limit = 100;
    const apiUrl = `/sd_webui_ux/civitai_proxy/models`;

    const paramsMapping = {
        "#civit_nsfw_models": 'nsfw',
        "#civit_type_models": 'types',
        "#civit_sort_models": 'sort',
        "#civit_period_models": 'period',
        "#civit_search_models": 'query'
    };

    const initApiParams = {
        limit: limit,
        page: 1,
    };

    const itemKeys = {
        title: 'username',
        url: 'url',
        dataPath: 'items'
    };

    let parentItem;
    let modelIndex = 0;

    const vScroll = new VirtualScroll(container, [], 18, itemKeys, apiUrl, initApiParams);
    const apiParams = setupInputObservers(paramsMapping, initApiParams, vScroll);

    function handleCivitModels(target, itemData, item_id) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        if (target.classList.contains("civit-link-button")) {
            window.open(`https://civitai.com/models/${itemData.id}`, '_blank');
        } else if (target.classList.contains("fullsize-button")) {

            vScroll.showDetail();
            parentItem = itemData;
            modelIndex = 0;
            dScroll.setData(itemData.modelVersions[modelIndex].images);
            dScroll.setFullSize(true);
            dScroll.setLayout('vertical');

        } else if (target.classList.contains("info-button")) {
            vScroll.setInfo(!vScroll.isInfo);
        } else if (target.classList.contains("fullScreen-button")) {
            vScroll.scrollToId(itemData.id);
            vScroll.setFullScreen(!vScroll.isFullScreen);
        } else if (target.classList.contains("send-params-button")) {
            const imgUrl = `${itemData.modelVersions[0].images[0].url}`;
            sendImageParamsTo(imgUrl, `#pnginfo_send_${prompt_focused} button`);
        } else if (target.classList.contains("item-info-title")) {
            searchInput.value = target.textContent;
            updateInput(searchInput);
        }
    }

    //Render: Item Node Renderer Overwite
    vScroll.createItemElement = function(item, actualIndex) {
        return createVirtualItemCivitModels(item);
    };

    vScroll.clickHandler = function(e) {
        if (vScroll.dragged || vScroll.scrollDelta) return;
        const itemCard = e.target.closest('.item.card');
        const itemId = itemCard?.dataset.id;
        if (itemId) {
            const itemData = this.data.find(item => item.id.toString() === itemId);
            console.log(itemId, e.target, itemData);
            if (itemData) {
                handleCivitModels(e.target, itemData, itemId);
            }
        }
        e.preventDefault();
        e.stopPropagation();
    };


    const dcontainer = container.parentElement.querySelector('.ae-virtual-detail-content');
    const dScroll = new VirtualScroll(dcontainer, [], 8);

    dScroll.createItemElement = function(item, actualIndex) {
        return createVirtualItemCivitModelsDetail(item, parentItem, modelIndex);
    };

    dScroll.clickHandler = function(e) {
        if (dScroll.dragged || dScroll.scrollDelta) return;
        const itemCard = e.target.closest('.item.card');
        const itemId = itemCard?.dataset.id;
        if (itemId) {
            const itemData = this.data.find(item => item.id.toString() === itemId);
            //console.log(itemId, e.target, itemData);
            if (itemData) {
                handleCivitModelsDetail(e.target, itemData, itemId);
            }
        }
        e.preventDefault();
        e.stopPropagation();
    };

    function handleCivitModelsDetail(target, itemData, item_id) {
        const prompt_focused = window.UIUX.FOCUS_PROMPT;
        if (target.classList.contains("civit-link-button")) {
            window.open(`https://civitai.com/models/${parentItem.id}?modelVersionId=${parentItem.modelVersions[modelIndex].id}`, '_blank');
        } else if (target.classList.contains("fullsize-button")) {
            vScroll.hideDetail();
        } else if (target.classList.contains("info-button")) {
            dScroll.setInfo(!dScroll.isInfo);
        } else if (target.classList.contains("fullScreen-button")) {
            dScroll.scrollToId(itemData.id);
            dScroll.setFullScreen(!dScroll.isFullScreen);
        } else if (target.classList.contains("send-params-button")) {
            const imgUrl = `${itemData.url}`;
            sendImageParamsTo(imgUrl, `#pnginfo_send_${prompt_focused} button`);
        } else if (target.classList.contains("item-info-title")) {
            //searchInput.value = target.textContent;
            //updateInput(searchInput);
        } else if (target.classList.contains("baseModel-select")) {
            target.addEventListener('change', function() {
                modelIndex = parseInt(target.value);
                dScroll.setData(parentItem.modelVersions[modelIndex].images);
            });
        }
    }

    function handleSearchClear(e) {
        searchInput.value = "";
        updateInput(searchInput);
    }
    searchClear.addEventListener('click', handleSearchClear);

    vScroll.updateParamsAndFetch(apiParams, 0);


}
