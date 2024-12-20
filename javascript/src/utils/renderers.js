import DOMPurify from '../../libs/purify.es.mjs';
export function createVirtualItemElement(item, imgRes, selected, endpoint) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item card';

    if (selected?.has(item.name)) {
        itemDiv.classList.add('active');
    } else {
        itemDiv.classList.remove('active');
    }



    const fullSize = document.createElement('button');
    fullSize.className = `icon-grid-size fullsize-button card-button`;

    const fullScreen = document.createElement('button');
    fullScreen.className = `icon-full-screen fullScreen-button card-button`;

    const tile = document.createElement('button');
    tile.className = `icon-tile tile-button card-button`;

    const info = document.createElement('button');
    info.className = `icon-info info-button card-button`;

    const itemEditMeta = document.createElement('button');
    itemEditMeta.className = `edit-meta edit-button card-button`;

    const copyPath = document.createElement('button');
    copyPath.className = `copy-path copy-path-button card-button`;

    const itemDelete = document.createElement('button');
    itemDelete.className = `icon-delete delete-button card-button`;

    const sendParams = document.createElement('button');
    sendParams.className = `icon-send-params send-params-button card-button`;

    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';

    const itemTitle = document.createElement('span');
    itemTitle.className = 'item-info-title';
    itemTitle.textContent = item.name; // Use textContent for safety

    const itemDescription = document.createElement('div');
    itemDescription.className = 'item-info-description';

    const promptParagraph = document.createElement('p');
    promptParagraph.textContent = item.prompt;

    const negativeParagraph = document.createElement('p');
    negativeParagraph.textContent = item.negative;

    const tagsParagraph = document.createElement('p');
    tagsParagraph.textContent = item.tags;

    const extraParagraph = document.createElement('p');
    extraParagraph.textContent = item.extra;

    itemDescription.appendChild(promptParagraph);
    itemDescription.appendChild(negativeParagraph);
    itemDescription.appendChild(tagsParagraph);
    itemDescription.appendChild(extraParagraph);

    itemInfo.appendChild(itemTitle);
    itemInfo.appendChild(itemDescription);

    const itemActionsRow = document.createElement('div');
    itemActionsRow.className = `item-actions-row`;

    const itemActions = document.createElement('div');
    itemActions.className = `item-actions`;
    const itemActionsTop = document.createElement('div');
    itemActionsTop.className = `item-actions-top`;

    const spacer = document.createElement('div');
    spacer.className = `item-spacer`;


    itemActionsTop.appendChild(sendParams);
    itemActionsTop.appendChild(spacer);
    itemActionsTop.appendChild(fullSize);
    itemActionsTop.appendChild(fullScreen);


    itemActions.appendChild(tile);
    itemActions.appendChild(info);

    itemActions.appendChild(copyPath);
    itemActions.appendChild(itemEditMeta);
    itemActions.appendChild(itemDelete);

    itemActionsRow.appendChild(itemActionsTop);
    itemActionsRow.appendChild(itemActions);


    itemDiv.appendChild(itemActionsRow);
    //itemDiv.appendChild(itemTitle);

    const imageUrl = item[imgRes];
    const timestamp = item.timestamp || '';
    if (imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.style.backgroundImage = `url('${endpoint}${encodeURIComponent(imageUrl)}${timestamp}')`;
        imgDiv.className = 'item-img';
        itemDiv.appendChild(imgDiv);
    }

    itemDiv.appendChild(itemInfo);

    return itemDiv;
}

export function createVirtualItemExtraNetworks(item, imgRes, selected, endpoint) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item card';

    if (selected?.has(item.name)) {
        itemDiv.classList.add('active');
    } else {
        itemDiv.classList.remove('active');
    }

    const fullSize = document.createElement('button');
    fullSize.className = `icon-grid-size fullsize-button card-button`;

    const fullScreen = document.createElement('button');
    fullScreen.className = `icon-full-screen fullScreen-button card-button`;

    const tile = document.createElement('button');
    tile.className = `icon-tile tile-button card-button`;

    const info = document.createElement('button');
    info.className = `icon-info info-button card-button`;

    const itemEditMeta = document.createElement('button');
    itemEditMeta.className = `edit-meta edit-button card-button`;

    const copyPath = document.createElement('button');
    copyPath.className = `copy-path copy-path-button card-button`;

    const sendParams = document.createElement('button');
    sendParams.className = `icon-send-params send-params-button card-button`;


    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';

    const itemTitle = document.createElement('span');
    itemTitle.className = 'item-info-title';
    itemTitle.textContent = item.name;

    const itemDescription = document.createElement('div');
    itemDescription.className = 'item-info-description';

    if (item.activation_text) {
        const promptParagraph = document.createElement('p');
        promptParagraph.textContent = item.activation_text;

        const negativeParagraph = document.createElement('p');
        negativeParagraph.textContent = item.negative_prompt;

        itemDescription.appendChild(promptParagraph);
        itemDescription.appendChild(negativeParagraph);
    }

    const tagsParagraph = document.createElement('p');
    tagsParagraph.textContent = item.tags;

    itemDescription.appendChild(tagsParagraph);

    itemInfo.appendChild(itemTitle);
    itemInfo.appendChild(itemDescription);

    const itemActionsRow = document.createElement('div');
    itemActionsRow.className = `item-actions-row`;

    const itemActions = document.createElement('div');
    itemActions.className = `item-actions`;
    const itemActionsTop = document.createElement('div');
    itemActionsTop.className = `item-actions-top`;

    const spacer = document.createElement('div');
    spacer.className = `item-spacer`;

    itemActionsTop.appendChild(sendParams);
    itemActionsTop.appendChild(spacer);
    itemActionsTop.appendChild(fullSize);
    itemActionsTop.appendChild(fullScreen);

    itemActions.appendChild(info);
    itemActions.appendChild(copyPath);
    itemActions.appendChild(itemEditMeta);

    if (item.metadata_exists) {
        const itemShowMeta = document.createElement('button');
        itemShowMeta.className = `show-meta metadata-button card-button`;
        itemActions.appendChild(itemShowMeta);
    }

    itemActionsRow.appendChild(itemActionsTop);
    itemActionsRow.appendChild(itemActions);


    itemDiv.appendChild(itemActionsRow);
    //itemDiv.appendChild(itemTitle);

    const imageUrl = item[imgRes];
    const timestamp = item.timestamp || '';
    if (imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.style.backgroundImage = `url('${endpoint}${encodeURIComponent(imageUrl)}${timestamp}')`;
        imgDiv.className = 'item-img';
        itemDiv.appendChild(imgDiv);
    }

    itemDiv.appendChild(itemInfo);

    return itemDiv;
}

const paramKeys = ['clipSkip', 'cfgScale', 'sampler', 'steps', 'seed', 'Size'];
export function createVirtualItemCivitImages(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item card';

    const fullSize = document.createElement('button');
    fullSize.className = `icon-grid-size fullsize-button card-button`;

    const fullScreen = document.createElement('button');
    fullScreen.className = `icon-full-screen fullScreen-button card-button`;

    const tile = document.createElement('button');
    tile.className = `icon-tile tile-button card-button`;

    const info = document.createElement('button');
    info.className = `icon-info info-button card-button`;

    const itemAddToStyles = document.createElement('button');
    itemAddToStyles.className = `icon-stylez civit-add2styles-button card-button`;

    const civitLink = document.createElement('button');
    civitLink.className = `icon-link civit-link-button card-button`;

    const sendParams = document.createElement('button');
    sendParams.className = `icon-send-params send-params-button card-button`;


    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';

    const itemTitle = document.createElement('button');
    itemTitle.className = 'item-info-title';
    itemTitle.textContent = item.username;

    const itemDescription = document.createElement('div');
    itemDescription.className = 'item-info-description';

    const paramsParts = [];
    if (item.baseModel) {
        paramsParts.push(`baseModel: ${item.baseModel}`);
    }

    const item_meta = item.meta;
    if (item_meta) {
        if (item_meta.prompt) {
            const promptParagraph = document.createElement('p');
            promptParagraph.textContent = 'Prompt: ' + item_meta.prompt;
            itemDescription.appendChild(promptParagraph);
        }

        if (item_meta.negativePrompt) {
            const negativeParagraph = document.createElement('p');
            negativeParagraph.textContent = 'Negative prompt: ' + item_meta.negativePrompt;
            itemDescription.appendChild(negativeParagraph);
        }

        paramKeys.forEach((key) => {
            if (item_meta[key] !== undefined) {
                paramsParts.push(`${key}: ${item_meta[key]}`);
            }
        });

        const paramsDescription = document.createElement('p');
        paramsDescription.textContent = paramsParts.join(', ');
        itemDescription.appendChild(paramsDescription);

        if (item_meta.civitaiResources) {
            item_meta.civitaiResources.forEach((resource) => {
                const resourceType = resource.type ? resource.type : 'Unknown Type';
                const resourceWeight = resource.weight ? resource.weight : '';
                const modelVersionId = resource.modelVersionId ? resource.modelVersionId : null;
                const modelVersionName = resource.modelVersionName ? resource.modelVersionName : null;

                if (modelVersionId) {

                    const resourcesDescription = document.createElement('p');
                    resourcesDescription.textContent = `${resourceType}: ${resourceWeight} `;

                    const resourceslink = document.createElement('a');
                    resourceslink.textContent = `${modelVersionName || 'Unnamed Model Id: ' + modelVersionId}`;
                    resourceslink.href = `https://civitai.com/api/v1/models/${modelVersionId}`;
                    resourceslink.target = "_blank";

                    resourcesDescription.appendChild(resourceslink);
                    itemDescription.appendChild(resourcesDescription);

                }
            });
        }
    }


    itemInfo.appendChild(itemTitle);
    itemInfo.appendChild(itemDescription);

    const itemActionsRow = document.createElement('div');
    itemActionsRow.className = `item-actions-row`;

    const itemActions = document.createElement('div');
    itemActions.className = `item-actions`;
    const itemActionsTop = document.createElement('div');
    itemActionsTop.className = `item-actions-top`;

    const spacer = document.createElement('div');
    spacer.className = `item-spacer`;

    itemActionsTop.appendChild(sendParams);
    itemActionsTop.appendChild(spacer);
    itemActionsTop.appendChild(fullSize);
    itemActionsTop.appendChild(fullScreen);

    itemActions.appendChild(info);
    itemActions.appendChild(civitLink);
    itemActions.appendChild(itemAddToStyles);


    itemActionsRow.appendChild(itemActionsTop);
    itemActionsRow.appendChild(itemActions);


    itemDiv.appendChild(itemActionsRow);
    //itemDiv.appendChild(itemTitle);

    const imageUrl = item.url;
    if (imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.style.backgroundImage = `url('${imageUrl}')`;
        imgDiv.className = 'item-img';
        itemDiv.appendChild(imgDiv);
    }

    itemDiv.appendChild(itemInfo);

    return itemDiv;
}

export function createVirtualItemCivitModels(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item card';

    const fullSize = document.createElement('button');
    fullSize.className = `icon-grid-size fullsize-button card-button`;

    const fullScreen = document.createElement('button');
    fullScreen.className = `icon-full-screen fullScreen-button card-button`;

    const tile = document.createElement('button');
    tile.className = `icon-tile tile-button card-button`;

    const info = document.createElement('button');
    info.className = `icon-info info-button card-button`;

    const civitLink = document.createElement('button');
    civitLink.className = `icon-link civit-link-button card-button`;

    const sendParams = document.createElement('button');
    sendParams.className = `icon-send-params send-params-button card-button`;


    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';

    const itemTitle = document.createElement('span');
    itemTitle.className = 'item-info-title';
    itemTitle.textContent = item.name;

    const itemType = document.createElement('span');
    itemType.textContent = item.type;
    itemType.className = `extra-type ${item.type}`;

    const itemDescription = document.createElement('div');
    itemDescription.innerHTML = DOMPurify.sanitize(item.description);
    itemDescription.className = 'item-info-description';

    itemInfo.appendChild(itemTitle);
    itemInfo.appendChild(itemDescription);

    const itemActionsRow = document.createElement('div');
    itemActionsRow.className = `item-actions-row`;

    const itemActions = document.createElement('div');
    itemActions.className = `item-actions`;
    //const itemActionsTop = document.createElement('div');
    //itemActionsTop.className = `item-actions-top`;

    const spacer = document.createElement('div');
    spacer.className = `item-spacer`;

    itemActions.appendChild(sendParams);
    itemActions.appendChild(spacer);
    itemActions.appendChild(fullSize);
    itemActions.appendChild(fullScreen);

    itemActions.appendChild(info);
    itemActions.appendChild(civitLink);
    //itemActions.appendChild(itemType);

    //itemActionsRow.appendChild(itemActionsTop);
    itemActionsRow.appendChild(itemActions);

    itemDiv.appendChild(itemType);
    itemDiv.appendChild(itemActionsRow);

    const imageUrl = item.modelVersions[0]?.images[0]?.url;
    if (imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.style.backgroundImage = `url(${encodeURI(imageUrl)})`;
        imgDiv.className = 'item-img';
        itemDiv.appendChild(imgDiv);
    }

    itemDiv.appendChild(itemInfo);

    return itemDiv;
}

function formatSize(sizeKB) {
    const sizeMB = sizeKB / 1024;
    if (sizeMB >= 1024) {
        const sizeGB = sizeMB / 1024;
        return `${sizeGB.toFixed(2)} GB`;
    } else {
        return `${sizeMB.toFixed(2)} MB`;
    }
}

export function createVirtualItemCivitModelsDetail(item, parentItem, modelIndex) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item card';

    const fullSize = document.createElement('button');
    fullSize.className = `icon-grid-size fullsize-button card-button`;

    const fullScreen = document.createElement('button');
    fullScreen.className = `icon-full-screen fullScreen-button card-button`;

    const tile = document.createElement('button');
    tile.className = `icon-tile tile-button card-button`;

    const info = document.createElement('button');
    info.className = `icon-info info-button card-button`;

    const civitLink = document.createElement('button');
    civitLink.className = `icon-link civit-link-button card-button`;

    const sendParams = document.createElement('button');
    sendParams.className = `icon-send-params send-params-button card-button`;


    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';

    const itemTitle = document.createElement('span');
    itemTitle.className = 'item-info-title';
    itemTitle.textContent = parentItem.name;

    const itemType = document.createElement('span');
    itemType.textContent = parentItem.type;
    itemType.className = `extra-type ${parentItem.type}`;

    const selectModel = document.createElement('select');
    selectModel.className = 'baseModel-select';

    const modelVersions = parentItem.modelVersions;
    modelVersions.forEach((model, mindex) => {
        const optionElement = document.createElement('option');
        optionElement.value = mindex;
        optionElement.textContent = `${model.baseModel} | ${model.name} | ${model.baseModelType}`;
        if (mindex === modelIndex) optionElement.selected = true;
        selectModel.appendChild(optionElement);
    });


    const downloadUrl = modelVersions[modelIndex].files[0].downloadUrl;
    const downloadName = modelVersions[modelIndex].files[0].name;
    const downloadSize = modelVersions[modelIndex].files[0].sizeKB;

    const vDownload = document.createElement("a");
    vDownload.target = "_blank";
    //vDownload.href = downloadUrl;
    vDownload.setAttribute('data-url', downloadUrl);
    vDownload.className = 'model-sdownload';
    vDownload.textContent = `${downloadName} - ${formatSize(downloadSize)}`;

    let description = modelVersions[modelIndex].description;
    if (modelIndex === 0) {
        description = (parentItem.description || '') + (modelVersions[modelIndex].description || '');
    }

    const itemDescription = document.createElement('div');
    itemDescription.innerHTML = DOMPurify.sanitize(description);
    itemDescription.className = 'item-info-description';

    itemInfo.appendChild(itemTitle);
    itemInfo.appendChild(selectModel);
    itemInfo.appendChild(vDownload);

    const imageUrl = item.url;
    if (imageUrl) {
        const imageDownload = document.createElement("a");
        imageDownload.className = 'download-image-button';
        const fileExtension = imageUrl.split('.').pop().split('?')[0];
        const filename = `${downloadName.split('.')[0]}.${fileExtension}`;
        imageDownload.textContent = `${filename}`;
        imageDownload.setAttribute('data-url', imageUrl);
        imageDownload.setAttribute('data-filename', filename);
        itemInfo.appendChild(imageDownload);
    }

    itemInfo.appendChild(itemDescription);

    const itemActionsRow = document.createElement('div');
    itemActionsRow.className = `item-actions-row`;

    const itemActions = document.createElement('div');
    itemActions.className = `item-actions`;
    //const itemActionsTop = document.createElement('div');
    //itemActionsTop.className = `item-actions-top`;

    const spacer = document.createElement('div');
    spacer.className = `item-spacer`;

    itemActions.appendChild(sendParams);
    itemActions.appendChild(spacer);
    itemActions.appendChild(fullSize);
    itemActions.appendChild(fullScreen);

    itemActions.appendChild(info);
    itemActions.appendChild(civitLink);
    //itemActions.appendChild(itemType);

    //itemActionsRow.appendChild(itemActionsTop);
    itemActionsRow.appendChild(itemActions);

    itemDiv.appendChild(itemType);
    itemDiv.appendChild(itemActionsRow);

    if (imageUrl) {
        const imgDiv = document.createElement('div');
        imgDiv.style.backgroundImage = `url(${imageUrl})`;
        imgDiv.className = 'item-img';
        itemDiv.appendChild(imgDiv);
    }

    itemDiv.appendChild(itemInfo);

    return itemDiv;
}
