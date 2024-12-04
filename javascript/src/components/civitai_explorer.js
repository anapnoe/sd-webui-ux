import {VirtualScroll} from './uiux/virtual.js';
import {DEFAULT_PATH} from '../constants.js';
import {Spotlight} from "../spotlight/js/spotlight3.js";
import {updateInput, updateChange} from "../utils/helpers.js";
import {setupInputObservers} from '../utils/observers.js';


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

function sendImageParamsTo(img, btnid) {
    const btn = document.querySelector(`#pnginfo_send_buttons ${btnid}`);
    const fileInput = document.querySelector('#pnginfo_image input[type="file"]');
    const dataTransfer = new DataTransfer();
    fileInput.files = dataTransfer.files;

    fetch(img.src)
        .then(response => response.blob())
        .then(blob => {
            const file = new File([blob], 'image.jpg', {type: blob.type});
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            updateChange(fileInput);
            setTimeout(() => {
                btn.click();
            }, 1000);

        })
        .catch(error => console.error('Error fetching image:', error));
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
    //const modelKeys = ['type', 'modelVersionName', 'modelVersionId', 'weight'];
    const paramKeys = ['prompt', 'negativePrompt', 'clipSkip', 'cfgScale', 'sampler', 'steps', 'seed', 'Size'];
    function detailView(data, groupData, data_index) {
        const dcontainer = container.parentElement.querySelector('.ae-virtual-detail-content');
        dcontainer.innerHTML = '';
        var gallery = [];
        data.forEach((item) => {
            const imageUrl = item.url;

            const descriptionParts = [];
            descriptionParts.push(`<p><strong>baseModel:</strong> ${item.baseModel}</p>`);

            paramKeys.forEach((key) => {
                if (item.meta && item.meta[key] !== undefined) {
                    descriptionParts.push(`<p><strong>${key}:</strong> ${item.meta[key]}</p>`);
                }
            });

            if (item.meta && item.meta.civitaiResources) {
                item.meta?.civitaiResources?.forEach((resource) => {
                    const resourceType = resource.type ? resource.type : 'Unknown Type';
                    const resourceWeight = resource.weight ? resource.weight : '';
                    const modelVersionId = resource.modelVersionId ? resource.modelVersionId : null;
                    const modelVersionName = resource.modelVersionName ? resource.modelVersionName : 'Unnamed Model';

                    if (modelVersionId) {
                        descriptionParts.push(`
                        <p>${resourceType} ${resourceWeight}
                            <a href="https://civitai.com/api/v1/models/${modelVersionId}" target="_blank">
                                ${modelVersionName}
                            </a>
                        </p>
                    `);
                    }
                });
            }

            const description = descriptionParts.join('');

            if (imageUrl) {
                const node = {
                    title: `<button class="ae-button"><h2>${item.username}</h2></button>`,
                    description: description,
                    src: imageUrl
                };
                gallery.push(node);
            }
        });


        const spl = new Spotlight(dcontainer);

        spl.addControl("txt2img-send mask-icon icon-2txt2img", function(event) {
            const img = dcontainer.querySelector('img');
            sendImageParamsTo(img, "#pnginfo_send_txt2img button");
        });

        spl.addControl("img2img-send mask-icon icon-2img2img", function(event) {
            const img = dcontainer.querySelector('img');
            sendImageParamsTo(img, "#pnginfo_send_img2img button");
        });

        spl.show(gallery, {
            index: 1,
            theme: "dark",
            autohide: false,
            info: true,
            control: ["next", "prev", "page", "spinner", "info", "autofit", "zoom", "fullscreen", "close"]
        });

        const titleClickEl = dcontainer.querySelector(".spl-title");

        function handleClick(e) {
            searchInput.value = e.target.textContent;
            spl.close();
            updateInput(searchInput);
        }

        titleClickEl.removeEventListener('click', handleClick);
        titleClickEl.addEventListener('click', handleClick);

        spl.onNext = function() {
            const itemData = groupData[data_index + 1];
            if (itemData) {
                detailView([itemData], groupData, data_index + 1);
            }
        };

        spl.onPrev = function() {
            const itemData = groupData[data_index - 1];
            if (itemData) {
                detailView([itemData], groupData, data_index - 1);
            }
        };


    }

    vScroll.clickHandler = function(e) {
        const {target: target, currentTarget: ctarget} = e;
        const index = parseInt(target.closest('.item.card').dataset.index);
        const itemData = this.data[index];
        if (itemData) {
            vScroll.showDetail();
            detailView([itemData], this.data, index);
            console.log(itemData);
        }

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

    const vScroll = new VirtualScroll(container, [], 18, itemKeys, apiUrl, initApiParams);
    const apiParams = setupInputObservers(paramsMapping, initApiParams, vScroll);


    //Render: Item Node Renderer Overwite
    vScroll.createItemElement = function(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item card';

        const imageUrl = item.modelVersions[0]?.images[0]?.url;
        if (imageUrl) {
            itemDiv.style.backgroundImage = `url(${encodeURI(imageUrl)})`;
        }

        const itemTitle = document.createElement('span');
        itemTitle.textContent = item.name;
        itemTitle.className = 'title';

        const itemType = document.createElement('span');
        itemType.textContent = item.type;
        itemType.className = `extra-type ${item.type}`;

        itemDiv.appendChild(itemType);
        itemDiv.appendChild(itemTitle);

        return itemDiv;
    };

    function detailView(data, modelVersions, index) {
        const dcontainer = container.parentElement.querySelector('.ae-virtual-detail-content');
        dcontainer.innerHTML = '';
        var gallery = [];

        const selectVersionsParts = [];
        selectVersionsParts.push(`<select class="baseModel">`);
        modelVersions.forEach((model, mindex) => {
            const selected = mindex === index ? "selected" : "";
            selectVersionsParts.push(`<option value="${mindex}" ${selected}>${model.baseModel} | ${model.name} | ${model.baseModelType}</option>`);
        });
        selectVersionsParts.push(`</select>`);
        const selectVersions = selectVersionsParts.join('');

        const modelDescription = modelVersions[index].description ? modelVersions[index].description : "";
        const description = data.description + modelDescription;
        const images = modelVersions[index].images;

        if (images) {
            images.forEach((item) => {
                const imageUrl = item.url;
                if (imageUrl) {
                    const node = {
                        title: `${data.name}`,
                        description: `${description} <br> ${data.tags}`,
                        src: imageUrl
                    };
                    gallery.push(node);
                }
            });
        }

        const spl = new Spotlight(dcontainer);
        spl.show(gallery, {
            index: 1,
            theme: "dark",
            autohide: false,
            control: ["next", "prev", "page", "spinner", "info", "autofit", "zoom", "download", "fullscreen", "close"]
        });

        spl.addControl("txt2img-send mask-icon icon-2txt2img", function(event) {
            const img = dcontainer.querySelector('img');
            sendImageParamsTo(img, "#pnginfo_send_txt2img button");
        });

        spl.addControl("img2img-send mask-icon icon-2img2img", function(event) {
            const img = dcontainer.querySelector('img');
            sendImageParamsTo(img, "#pnginfo_send_img2img button");
        });

        //const vHeader = dcontainer.querySelector('.spl-header');
        const vMoreEl = dcontainer.querySelector('.spl-more');
        const vSelEl = document.createElement("div");
        vSelEl.innerHTML = selectVersions;

        const vSelectEl = vSelEl.firstChild;
        vSelectEl.addEventListener('change', function handleVSelect(e) {
            spl.close();
            setTimeout(() => {
                detailView(data, modelVersions, parseInt(e.target.value));
            }, 300);
        });

        const vDType = document.createElement("span");
        vDType.innerHTML = data.type;
        vDType.className = "model-type";

        function formatSize(sizeKB) {
            const sizeMB = sizeKB / 1024;
            if (sizeMB >= 1024) {
                const sizeGB = sizeMB / 1024;
                return `${sizeGB.toFixed(2)} GB`;
            } else {
                return `${sizeMB.toFixed(2)} MB`;
            }
        }

        const downloadUrl = modelVersions[index].files[0].downloadUrl;
        const downloadName = modelVersions[index].files[0].name;
        const downloadSize = modelVersions[index].files[0].sizeKB;

        const vDownload = document.createElement("a");
        vDownload.target = "_blank";
        vDownload.href = downloadUrl;
        vDownload.textContent = `${downloadName} - ${formatSize(downloadSize)}`;

        vMoreEl.appendChild(vDType);
        vMoreEl.appendChild(vSelectEl);
        vMoreEl.appendChild(vDownload);

    }


    vScroll.clickHandler = function(e) {
        const {target: target, currentTarget: ctarget} = e;
        const index = target.closest('.item.card').dataset.index;
        const itemData = this.data[index];
        //if (itemData.modelVersions[0]?.images) {
        if (itemData.modelVersions) {
            vScroll.showDetail();
            detailView(itemData, itemData.modelVersions, 0);
            console.log(itemData);
        }

    };

    function handleSearchClear(e) {
        searchInput.value = "";
        updateInput(searchInput);
    }
    searchClear.addEventListener('click', handleSearchClear);

    vScroll.updateParamsAndFetch(apiParams, 0);

}
