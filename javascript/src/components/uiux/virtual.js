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
    this.lastScrollPos = 0;
    this.isFetching = false;
    this.useDataFetching = true;
    this.isInit = false;
    this.resolvedRenderMethod = this.renderItems;//ByIndex;
    this.selected;

    this.smoothScrolling = true;

    this.direction = 'vertical';
    this.translateProp = 'translateY';
    this.scrollProp = 'scrollTop';
    this.client = 'clientY';

    if (this.direction === 'horizontal') {
        this.translateProp = 'translateX';
        this.scrollProp = 'scrollLeft';
        this.client = 'clientX';
    }

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
    this.container.classList.add('ae-virtual', this.direction || 'vertical');
    this.itemsWrapper = document.createElement('div');
    this.itemsWrapper.classList.add('ae-virtual-wrapper');
    this.container.appendChild(this.itemsWrapper);
};

VirtualScroll.prototype.createSentinel = function() {
    const sentinel = document.createElement('div');
    sentinel.classList.add('sentinel');
    return sentinel;
};

VirtualScroll.prototype.createSentinels = function() {
    this.minSentinel = this.createSentinel();
    this.maxSentinel = this.createSentinel();
    this.totalSizeSentinel = this.createSentinel();
    this.container.append(this.minSentinel, this.maxSentinel, this.totalSizeSentinel);
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

VirtualScroll.prototype.renderItemsByIndex = function(scrollDirection = 'increase') {
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

    if (scrollDirection === 'increase') {
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

    const minPosition = (start / this.itemsPerRow) * this.itemSize;
    let maxPosition = (end / this.itemsPerRow) * this.itemSize;
    maxPosition = Math.min(maxPosition, this.totalSize);

    this.minSentinel.style.transform = `${this.translateProp}(${minPosition}px)`;
    this.maxSentinel.style.transform = `${this.translateProp}(${maxPosition}px)`;
    this.itemsWrapper.style.transform = `${this.translateProp}(${minPosition}px)`;
};

VirtualScroll.prototype.updateDimensions = function() {
    const sampleItem = this.itemsWrapper.querySelector('.item');
    if (!sampleItem) return;

    this.itemHeight = sampleItem.offsetHeight;
    this.itemWidth = sampleItem.offsetWidth;
    //this.containerWidth = this.container.offsetWidth;
    this.containerWidth = this.container.parentElement.offsetWidth;
    this.containerHeight = this.container.parentElement.offsetHeight;

    if (!this.containerWidth) return;
    if (!this.containerHeight) return;
    if (!this.data.length) return;

    const totalItems = this.total || this.data.length;

    if (this.direction === 'horizontal') {
        //this.container.style.width = `${this.containerWidth}px`;
        this.itemSize = this.itemWidth;
        this.itemsPerRow = Math.floor(this.containerHeight / this.itemHeight);
        this.rowsInView = Math.ceil(this.containerWidth / this.itemWidth);
    } else {
        //this.container.style.height = `${this.containerHeight}px`;
        this.itemSize = this.itemHeight;
        this.itemsPerRow = Math.floor(this.containerWidth / this.itemWidth);
        this.rowsInView = Math.ceil(this.containerHeight / this.itemHeight);
    }

    this.totalRows = Math.ceil(totalItems / this.itemsPerRow);
    this.itemsPerPage = Math.max(this.itemsPerPage, this.rowsInView * this.itemsPerRow);

    this.totalSize = this.totalRows * this.itemSize;
    this.totalSizeSentinel.style.transform = `${this.translateProp}(${this.totalSize}px)`;
    this.maxStartIndex = Math.max(this.data.length - this.itemsPerPage, 0);
    //this.startIndex = Math.min(this.startIndex, this.maxStartIndex);

    this.scrollHandler();
};


/* Handlers */
VirtualScroll.prototype.scrollHandler = function() {
    if (this.scrollTimeout) {
        cancelAnimationFrame(this.scrollTimeout);
    }

    this.scrollTimeout = requestAnimationFrame(() => {
        const scrollPos = this.container[this.scrollProp];
        this.startIndex = Math.floor(scrollPos / this.itemSize) * this.itemsPerRow;
        const scrollDirection = scrollPos > this.lastScrollPos ? 'increase' : 'decrease';
        this.lastScrollPos = scrollPos;

        if (scrollDirection === 'increase' && this.useDataFetching && !this.isFetching && this.params.cursor) {
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
    this.scrollDelta = 0;

    // Add wheel event listener for horizontal scrolling
    //if (this.direction === 'horizontal') {
    this.container.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = Math.sign(event.deltaY); // 1 for down, -1 for up
        this.scrollDelta += delta; // Accumulate the delta
        this.useSmoothScrolling(200);
    });
    //}

    this.setupDragScrollListener();
};


VirtualScroll.prototype.setupDragScrollListener = function() {
    let isDragging = false;
    let start = 0;
    let scrollStart = 0;

    const onMouseDown = (event) => {
        isDragging = true;
        start = event[this.client];
        scrollStart = this.container[this.scrollProp];
        this.container.style.cursor = 'grabbing';
    };

    const onMouseMove = (event) => {
        if (!isDragging) return;
        const deltaY = start - event[this.client];
        const direction = Math.sign(deltaY);
        if (direction !== 0) {
            this.scrollDelta = direction;
        }
        this.container[this.scrollProp] = scrollStart + deltaY;
    };

    const onMouseUp = () => {
        isDragging = false;
        this.container.style.cursor = 'grab';
        this.useSmoothScrolling(200);
    };

    this.container.addEventListener('mousedown', onMouseDown);
    this.container.addEventListener('mousemove', onMouseMove);
    this.container.addEventListener('mouseup', onMouseUp);
    this.container.addEventListener('mouseleave', onMouseUp);
};


VirtualScroll.prototype.useSmoothScrolling = function(duration = 200) {

    const maxScrollDelta = this.data.length - this.itemsPerPage;
    this.scrollDelta = Math.max(this.scrollDelta, -maxScrollDelta);
    this.scrollDelta = Math.min(this.scrollDelta, maxScrollDelta);

    if (this.smoothScrolling) {
        const targetScrollPos = this.container[this.scrollProp] + (this.scrollDelta * this.itemSize);
        const snappedScrollPos = Math.round(targetScrollPos / this.itemSize) * this.itemSize;
        this.smoothScroll(snappedScrollPos, duration);
    } else {
        this.container[this.scrollProp] += this.scrollDelta * this.itemSize;
        this.scrollDelta = 0;
    }
};

// Smooth scroll function
VirtualScroll.prototype.smoothScroll = function(targetScrollPos, duration) {
    const startScrollPos = this.container[this.scrollProp];
    const distance = targetScrollPos - startScrollPos;
    let startTime = null;
    let animationFrameId;

    const animation = (currentTime) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1); // Normalize progress to [0, 1]

        // Easing function (ease-out ^3)
        const ease = 1 - Math.pow(1 - progress, 3);
        this.container[this.scrollProp] = startScrollPos + distance * ease;
        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animation);
        } else {
            this.scrollDelta = 0;
        }
    };

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(animation);
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
    this.scrollDelta += offset;
    this.useSmoothScrolling(100);
    //this.container[this.scrollProp] += offset * this.itemSize;
};

VirtualScroll.prototype.scrollToStart = function() {
    this.startIndex = 0;
    this.container[this.scrollProp] = 0;
};

VirtualScroll.prototype.scrollToEnd = function() {
    this.startIndex = Math.max(0, this.data.length - this.itemsPerPage);
    this.container[this.scrollProp] = this.startIndex * this.itemSize;
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
    this.data = this.originalData;
    this.container[this.scrollProp] = 0;
    this.lastScrollPos = 0;
    this.initialize();
};

VirtualScroll.prototype.appendData = function(data) {
    this.originalData.push(...data);
    this.data = this.originalData;
    this.isFetching = false;
    //const newScrollPos = this.startIndex * this.itemSize;
    //this.container[this.scrollProp] = newScrollPos;
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


