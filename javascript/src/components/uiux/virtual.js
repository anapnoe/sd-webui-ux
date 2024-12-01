/* final virtual scroll */
export function VirtualScroll(container, data, itemsPerPage = 10, keys = {title: 'username', url: 'url'}, apiUrl = '', params = {}, method = "POST") {
    this.container = container;
    this.originalData = data;
    this.data = data;
    this.itemsPerPage = itemsPerPage;
    this.limit = params.limit;
    this.apiUrl = apiUrl;
    this.method = method;
    this.params = params;
    this.keys = keys;
    this.startIndex = 0;
    this.renderedItems = {};
    this.lastScrollTop = 0;
    this.isFetching = false;
    this.useDataFetching = true;
    this.isInit = false;
    this.resolvedRenderMethod = this.renderItems;//ByIndex;
    this.selected;
    this.createContainer();
    this.createSentinels();
    this.createDetail();
    this.initialize();
}


VirtualScroll.prototype.initialize = function() {

    if (!this.apiUrl || this.apiUrl.includes(".json")) {
        this.useDataFetching = false;
    }

    if (!this.isInit) {
        if (this.data.length > 0) {
            this.isInit = true;
            this.setupScrollListener();
            this.resolvedRenderMethod();
            this.setupResizeObserver();
            this.setupKeyboardListener();
            this.setupClickListener();
        }
    } else if (this.data.length > 0) {
        this.itemsWrapper.classList.remove("hidden");
        //this.forceRenderItems(); // this is used when renderItemsByIndex is selected as renderer
        this.updateDimensions();
    } else {
        this.itemsWrapper.classList.add("hidden");
    }
};

VirtualScroll.prototype.createContainer = function() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    this.itemsWrapper = document.createElement('div');
    this.itemsWrapper.className = 'ae-virtual-wrapper';
    this.container.appendChild(this.itemsWrapper);
};

VirtualScroll.prototype.createSentinel = function() {
    const sentinel = document.createElement('div');
    sentinel.classList.add('sentinel');
    return sentinel;
};

VirtualScroll.prototype.createSentinels = function() {
    this.topSentinel = this.createSentinel();
    this.bottomSentinel = this.createSentinel();
    this.totalHeightSentinel = this.createSentinel();
    this.container.append(this.topSentinel, this.bottomSentinel, this.totalHeightSentinel);
};

VirtualScroll.prototype.createDetail = function() {

    this.detail = document.createElement('div');
    this.detail.className = 'ae-virtual-detail';
    const close = document.createElement('button');
    close.className = 'ae-button close';
    const icon = document.createElement('div');
    icon.className = 'mask-icon icon-cancel';
    close.appendChild(icon);
    this.detail.appendChild(close);
    const content = document.createElement('div');
    content.className = 'ae-virtual-detail-content';
    this.detail.appendChild(content);
    this.container.parentElement.appendChild(this.detail);
    close.addEventListener('click', this.hideDetail.bind(this));
    this.hideDetail();

};

VirtualScroll.prototype.createItemElement = function(item, actualIndex) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item card';

    const imageUrl = item[this.keys.url];
    if (imageUrl) {
        itemDiv.style.backgroundImage = `url(${imageUrl})`;
    }

    const itemTitle = document.createElement('span');
    itemTitle.textContent = item[this.keys.title];
    itemTitle.className = 'title';

    itemDiv.appendChild(itemTitle);

    return itemDiv;
};


/* Rendering Methods */
VirtualScroll.prototype.getItemsToRender = function() {
    const start = Math.max(0, this.startIndex);
    const end = Math.min(this.data.length, this.startIndex + this.itemsPerPage);
    return this.data.slice(start, end);
};

//Render Method: Efficient Clean Up Draw All Visible Items
VirtualScroll.prototype.renderItems = function() {
    this.itemsWrapper.innerHTML = '';
    const itemsToRender = this.getItemsToRender();
    const itemsFragment = document.createDocumentFragment();

    itemsToRender.forEach((item, index) => {
        const actualIndex = this.startIndex + index;
        const itemDiv = this.createItemElement(item, actualIndex);
        itemDiv.dataset.index = actualIndex;
        itemDiv.dataset.id = item.id;
        itemsFragment.appendChild(itemDiv);
    });
    this.itemsWrapper.appendChild(itemsFragment);
    this.updateSentinels();
};

//Render Method: Draw only what is needed Expeimental
VirtualScroll.prototype.forceRenderItems = function() {
    this.itemsWrapper.innerHTML = '';
    this.renderedItems = {};
    const itemsToRender = this.getItemsToRender();
    const itemsFragment = document.createDocumentFragment();
    itemsToRender.forEach((item, index) => {
        const actualIndex = this.startIndex + index;
        const itemDiv = this.createItemElement(item);
        itemDiv.dataset.index = actualIndex;
        itemDiv.dataset.id = item.id;
        itemsFragment.appendChild(itemDiv);
        this.renderedItems[actualIndex] = itemDiv;
    });

    this.itemsWrapper.appendChild(itemsFragment);
    this.updateSentinels();
};

VirtualScroll.prototype.renderItemsByIndex = function(scrollDirection = 'down') {
    const itemsToRender = this.getItemsToRender();
    const itemsFragment = document.createDocumentFragment();

    itemsToRender.forEach((item, index) => {
        const actualIndex = this.startIndex + index;
        if (!this.renderedItems[actualIndex]) {
            //console.log("add:", actualIndex);
            const itemDiv = this.createItemElement(item);
            itemDiv.dataset.index = actualIndex;
            itemDiv.dataset.id = item.id;
            itemsFragment.appendChild(itemDiv);
            this.renderedItems[actualIndex] = itemDiv;
        }
    });

    if (scrollDirection === 'down') {
        this.itemsWrapper.appendChild(itemsFragment);
    } else {
        this.itemsWrapper.insertBefore(itemsFragment, this.itemsWrapper.firstChild);
    }

    this.cleanupRenderedItems();
    this.updateSentinels();

};

VirtualScroll.prototype.cleanupRenderedItems = function() {
    const keys = Object.keys(this.renderedItems);
    const endIndex = this.startIndex + this.itemsPerPage;
    for (let i = 0; i < keys.length; i++) {
        const index = parseInt(keys[i], 10);
        if (index < this.startIndex || index > endIndex) {
            //console.log("remove:", index);
            const itemElement = this.renderedItems[index];
            this.itemsWrapper.removeChild(itemElement);
            delete this.renderedItems[index];
        }
    }
};
/******/

/* Updates */
VirtualScroll.prototype.updateSentinels = function() {
    const start = Math.max(0, this.startIndex);
    const end = Math.min(this.data.length, this.startIndex + this.itemsPerPage);
    const topPosition = (start / this.itemsPerRow) * this.itemHeight;
    let bottomPosition = (end / this.itemsPerRow) * this.itemHeight;
    bottomPosition = Math.min(bottomPosition, this.totalHeight);
    this.topSentinel.style.transform = `translateY(${topPosition}px)`;
    this.bottomSentinel.style.transform = `translateY(${bottomPosition}px)`;
    this.itemsWrapper.style.transform = `translateY(${topPosition}px)`;
};

VirtualScroll.prototype.updateDimensions = function() {
    const sampleItem = this.itemsWrapper.querySelector('.item');
    if (!sampleItem) return;

    this.itemHeight = sampleItem.offsetHeight;
    this.itemWidth = sampleItem.offsetWidth;
    this.containerWidth = this.container.offsetWidth;
    this.containerHeight = this.container.parentElement.offsetHeight;

    if (!this.containerHeight) return;
    this.container.style.height = `${this.containerHeight}px`;

    if (!this.data.length) return;

    const totalItems = this.total || this.data.length;

    this.itemsPerRow = Math.floor(this.containerWidth / this.itemWidth);
    this.totalRows = Math.ceil(totalItems / this.itemsPerRow);
    this.rowsInView = Math.ceil(this.containerHeight / this.itemHeight);
    this.itemsPerPage = Math.max(this.itemsPerPage, this.rowsInView * this.itemsPerRow);
    this.totalHeight = this.totalRows * this.itemHeight;
    this.totalHeightSentinel.style.transform = `translateY(${this.totalHeight}px)`;
    this.maxStartIndex = Math.max(this.data.length - this.itemsPerPage, 0);
    //this.startIndex = Math.min(this.startIndex, this.maxStartIndex);

    //const debouncedScrollHandler = this.debounce(() => this.scrollHandler(), 1000); debouncedScrollHandler();
    this.scrollHandler();
};


/* Handlers */
VirtualScroll.prototype.scrollHandler = function() {
    if (this.scrollTimeout) {
        cancelAnimationFrame(this.scrollTimeout);
    }
    this.scrollTimeout = requestAnimationFrame(() => {
        const scrollTop = this.container.scrollTop;
        const currentRow = Math.floor(scrollTop / this.itemHeight);
        this.startIndex = currentRow * this.itemsPerRow;

        const scrollDirection = scrollTop > this.lastScrollTop ? 'down' : 'up';
        this.lastScrollTop = scrollTop;


        if (scrollDirection === 'down' && this.useDataFetching && !this.isFetching && this.params.cursor) {
            if (this.startIndex >= this.maxStartIndex) {
                this.isFetching = true;
                this.fetchUpdateData();
            }
        }

        //if (this.startIndex > this.maxStartIndex) return;
        this.resolvedRenderMethod(scrollDirection);

    });
};

VirtualScroll.prototype.clickHandler = function(e) {
    const {target: target, currentTarget: ctarget} = e;
    const index = target.closest('.item.card').dataset.index;
    const itemData = this.data[index];
    console.log(itemData);
};


/* Setup Event Listeners */
VirtualScroll.prototype.setupScrollListener = function() {
    this.container.addEventListener('scroll', this.throttle(this.scrollHandler.bind(this), 100));
    //this.container.addEventListener('scroll', this.scrollHandler.bind(this));
};

VirtualScroll.prototype.setupResizeObserver = function() {
    let resizeTimer;
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            this.updateDimensions();
        }, 100);
    });

    observer.observe(this.container);
};

VirtualScroll.prototype.setupKeyboardListener = function() {
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
};

VirtualScroll.prototype.setupClickListener = function() {
    this.container.addEventListener('click', this.clickHandler.bind(this));
};


/* Keybord Handlers */
VirtualScroll.prototype.handleKeyPress = function(event) {
    switch (event.key) {
    case 'ArrowDown':
        this.scrollBy(1);
        break;
    case 'ArrowUp':
        this.scrollBy(-1);
        break;
    case 'Home':
        this.scrollToStart();
        break;
    case 'End':
        this.scrollToEnd();
        break;
    }
};

VirtualScroll.prototype.scrollBy = function(offset) {
    this.container.scrollTop += offset * this.itemHeight;
};

VirtualScroll.prototype.scrollToStart = function() {
    this.startIndex = 0;
    this.container.scrollTop = 0;
};

VirtualScroll.prototype.scrollToEnd = function() {
    this.startIndex = Math.max(0, this.data.length - this.itemsPerPage);
    this.container.scrollTop = this.startIndex * this.itemHeight;
};


/* Helper Functions*/
VirtualScroll.prototype.debounce = function(func, defaultDelay = 1000) {

    return function(...args) {
        const context = this;
        const delay = typeof args[args.length - 1] === 'number' ? args.pop() : defaultDelay;
        const later = () => {
            this.timeout = null;
            func.apply(context, args);
        };
        clearTimeout(this.timeout);
        this.timeout = setTimeout(later, delay);
    }.bind(this);
};

VirtualScroll.prototype.throttle = function(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
};

VirtualScroll.prototype.setNextCursor = function(nextCursor) {
    if (nextCursor && this.data.length > 0) {
        this.params.cursor = nextCursor;
        this.params.page = Math.floor(this.data.length / this.params.limit) + 1 || 1;
    } else if (this.params.cursor) {
        delete this.params.cursor;
    }

    if (this.params.limit && this.data.length > 0) {
        this.params.page = Math.floor(this.data.length / this.params.limit) + 1;
    } else {
        delete this.params.page;
    }
};

VirtualScroll.prototype.getValueByPath = function(obj, path) {
    if (!path) return obj;
    const keys = path.split('.');
    return keys.reduce((acc, key) => {
        if (acc === undefined || acc === null) {
            return undefined;
        }
        return acc[key];
    }, obj);
};


/* Populate Data */
VirtualScroll.prototype.setData = function(data) {
    this.originalData = data;
    this.data = data;
    this.container.scrollTop = 0;
    this.lastScrollTop = 0;
    this.initialize();
};

VirtualScroll.prototype.appendData = function(data) {
    this.originalData.push(...data);
    this.data = this.originalData;
    this.isFetching = false;
    const newScrollTop = this.startIndex * this.itemHeight;
    //this.container.scrollTop = newScrollTop;
    this.updateDimensions();

};

VirtualScroll.prototype.updateDataByIndex = function(data, index) {
    const indexData = this.originalData[index];
    for (const [key, value] of Object.entries(data)) {
        indexData[key] = value;
    }
    this.originalData[index] = indexData;
    this.data = this.originalData;
    this.renderItems();
};

VirtualScroll.prototype.updateDataById = function(data, id) {
    const item = this.originalData.find(item => item.id === id);
    if (item) {
        for (const [key, value] of Object.entries(data)) {
            item[key] = value;
        }
        this.data = this.originalData;
        this.renderItems();
    } else {
        console.warn(`Item with ID ${id} not found in loaded data object.`);
    }
};


VirtualScroll.prototype.setSelectedItems = function(items) {
    this.selected = items;
    //console.log(items);
    this.renderItems();
};

/* Fetch Async Data */
VirtualScroll.prototype.fetchData = async function(updateIndicator) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let url = this.apiUrl;

        if (this.method.toUpperCase() === 'GET' && this.params) {
            const queryParams = new URLSearchParams();
            Object.keys(this.params).forEach(key => {
                const value = this.params[key];
                if (Array.isArray(value)) {
                    value.forEach(v => queryParams.append(key, v));
                } else {
                    queryParams.append(key, value);
                }
            });
            url += '?' + queryParams.toString();
        }

        xhr.open(this.method, url, true);

        // Set GET headers
        xhr.setRequestHeader("Accept", "application/json");

        xhr.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentage = parseInt((event.loaded / event.total) * 100);
                updateIndicator(percentage);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
            } else {
                reject(xhr.status);
            }
        };

        xhr.onerror = function() {
            reject(xhr.status);
        };

        if (this.method.toUpperCase() === 'POST') {
            // Set POST headers
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(this.params));
        } else {
            xhr.send();
        }
    });
};

VirtualScroll.prototype.fetchUpdateData = async function(renew = false) {
    this.showLoadingIndicator();
    //console.log("renew data:", renew);
    const newData = await this.fetchData(percentage => this.updateLoadingIndicator(percentage));
    if (newData) {
        const idata = this.getValueByPath(newData, this.keys.dataPath) || newData;
        renew ? this.setData(idata) : this.appendData(idata);
        this.total = newData.total;
        this.setNextCursor(newData.metadata?.nextCursor || newData.nextCursor);
    } else {
        console.error(`Error fetching data: ${error}`);
    }
    this.hideLoadingIndicator();
};

VirtualScroll.prototype.updateParamsAndFetch = async function(newParams, delay = 1000) {
    Object.assign(this.params, newParams);
    Object.keys(this.params).forEach((param) => {
        if (!this.params[param]) delete this.params[param];
    });
    this.startIndex = 0;
    delete this.params.cursor;
    //this.params.page = 1;
    this.originalData = [];
    this.data = this.originalData;

    // Pass the boolean argument to fetchUpdateData
    const debouncedFetchUpdateData = this.debounce(this.fetchUpdateData.bind(this, true), delay);
    debouncedFetchUpdateData();
};

VirtualScroll.prototype.update = async function() {

    this.originalData = [];
    this.data = this.originalData;

    const debouncedFetchUpdateData = this.debounce(this.fetchUpdateData.bind(this, true), 1000);
    debouncedFetchUpdateData();
};


/* Preloader */
VirtualScroll.prototype.showLoadingIndicator = function() {
    if (!this.loadingIndicator) {
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'loading-indicator';
        this.container.parentElement.appendChild(this.loadingIndicator);
        this.hideLoadingIndicator();
        this.isFetching = false;
    }
    this.loadingIndicator.innerHTML = 'Loading... 0%';
    this.loadingIndicator.style.display = 'flex';
};

VirtualScroll.prototype.updateLoadingIndicator = function(percentage) {
    if (this.loadingIndicator) {
        this.loadingIndicator.innerHTML = `Loading... ${percentage}%`;
    }
};

VirtualScroll.prototype.hideLoadingIndicator = function() {
    if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'none';
    }
};

VirtualScroll.prototype.showDetail = function() {
    //this.detail.style.display = 'flex';
    this.detail.classList.remove("hidden");
};

VirtualScroll.prototype.hideDetail = function() {
    if (this.detail) {
        //this.detail.style.display = 'none';
        this.detail.classList.add("hidden");
    }
};


/* Client Filtering Sorting Data */
VirtualScroll.prototype.filterItems = function(searchTerm, additionalCriteria = {}) {
    this.startIndex = 0;
    this.data = this.originalData.filter(item => {
        let matches = true;

        if (searchTerm) {
            matches = matches && item[this.keys.title].toLowerCase().includes(searchTerm.toLowerCase());
        }

        for (const [key, value] of Object.entries(additionalCriteria)) {
            if (item[key] !== undefined && value !== undefined) {
                if (Array.isArray(item[key])) {
                    const additional_array = item[key];
                    matches = matches && additional_array.some(
                        (v) => typeof v === 'string' && v.toLowerCase().includes(value.toLowerCase())
                    );
                } else if (typeof item[key] === 'string') {
                    matches = matches && item[key].toLowerCase().includes(value.toLowerCase());
                }
            }
        }

        return matches;
    });

    this.updateDimensions();
    this.forceRenderItems();
};


VirtualScroll.prototype.sortItems = function(sortKey, reverse = false) {
    this.startIndex = 0;
    const vsc = this;
    const sortedData = [...this.data];
    function comparator(a, b) {

        const valA = vsc.getValueByPath(a, sortKey);
        const valB = vsc.getValueByPath(b, sortKey);

        if (!isNaN(valA) && !isNaN(valB)) {
            return reverse ? valB - valA : valA - valB;
        }

        return reverse ?
            (valB < valA ? -1 : (valB > valA ? 1 : 0)) :
            (valA < valB ? -1 : (valA > valB ? 1 : 0));
    }
    sortedData.sort(comparator);
    this.data = sortedData;
    this.updateDimensions();
    this.forceRenderItems();
};


