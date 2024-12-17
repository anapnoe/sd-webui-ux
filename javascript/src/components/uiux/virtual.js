/* final virtual scroll */
export function VirtualScroll(container, data, itemsPerPage = 10, keys = {title: 'username', url: 'url'}, apiUrl = '', params = {}, method = "POST") {
    this.container = container;
    this.originalData = data;
    this.data = data;
    this.itemsPerPage = itemsPerPage;
    this.optItemsPerPage = itemsPerPage;
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
    this.activePointers = {};
    this.zoom_scale = 1;
    this.scrollDelta = 0;
    this.x = this.y = 0;

    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
    console.log(' this.isTouchDevice', this.isTouchDevice);


    this.createContainer();
    this.createSentinels();
    this.createDetail();

    this.setLayout('vertical');

    this.initialize();
}


VirtualScroll.prototype.initialize = function() {
    if (!this.apiUrl || this.apiUrl.includes(".json")) {
        this.useDataFetching = false;
    }

    if (!this.isInit) {
        if (this.data.length > 0) {
            this.isInit = true;
            this.resolvedRenderMethod();
            this.setupEventListeners();
            this.setupResizeObserver();
            this.updateDimensions();
        }
    } else if (this.data.length > 0) {
        this.itemsWrapper.classList.remove("hidden");
        //this.forceRenderItems(); // this is used when renderItemsByIndex is selected as renderer
        this.renderItems();
        this.updateDimensions(true);
    } else {
        this.itemsWrapper.classList.add("hidden");
    }
};

VirtualScroll.prototype.setFullSize = function(fullsize) {
    this.isFullSize = fullsize;
    fullsize ? this.container.classList.add('full') : this.container.classList.remove('full');
};

VirtualScroll.prototype.setTileable = function(tileable) {
    this.isTileable = tileable;
    tileable ? this.container.classList.add('tileable') : this.container.classList.remove('tileable');
};

VirtualScroll.prototype.setInfo = function(info) {
    this.isInfo = info;
    info ? this.container.classList.add('info') : this.container.classList.remove('info');
};

VirtualScroll.prototype.setFullScreen = function(fullscreen) {
    this.isFullScreen = fullscreen;
    if (fullscreen) {
        if (this.container.requestFullscreen) {
            this.container.parentElement.requestFullscreen();
            this.container.classList.add('fullscreen');
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            this.container.classList.remove('fullscreen');
        }
    }
};

VirtualScroll.prototype.setLayout = function(layout) {
    if (layout === 'horizontal') {
        this.direction = 'horizontal';
        this.translateProp = 'translateX';
        this.scrollProp = 'scrollLeft';
        this.client = 'clientX';
        this.scrollSize = 'scrollWidth';
        this.container.classList.remove('vertical');
        this.container.classList.add('horizontal');
    } else {
        this.direction = 'vertical';
        this.translateProp = 'translateY';
        this.scrollProp = 'scrollTop';
        this.client = 'clientY';
        this.scrollSize = 'scrollHeight';
        this.container.classList.remove('horizontal');
        this.container.classList.add('vertical');
    }
};


/*
VirtualScroll.prototype.animateElement = function(elem) {
    elem.classList.add('visible');
    elem.classList.add('animate');
    elem.addEventListener('animationend', () => {
        elem.classList.remove('animate');
    }, {once: true});
};
*/

VirtualScroll.prototype.createContainer = function() {
    this.container.classList.add('ae-virtual', 'visible', this.direction || 'vertical');
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

//Render Method: Draw only what is needed Experimental
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
    maxPosition = Math.round(maxPosition / this.itemSize) * this.itemSize;

    this.minSentinel.style.transform = `${this.translateProp}(${minPosition}px)`;
    this.maxSentinel.style.transform = `${this.translateProp}(${maxPosition}px)`;
    this.itemsWrapper.style.transform = `${this.translateProp}(${minPosition}px)`;


};

VirtualScroll.prototype.updateDimensions = function(force = false) {
    const sampleItem = this.itemsWrapper.querySelector('.item');
    if (!sampleItem) return;

    //const gridGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ae-gap-size')) || 0;
    this.itemHeight = sampleItem.offsetHeight;
    this.itemWidth = sampleItem.offsetWidth;

    //this.containerWidth = this.container.offsetWidth;
    this.containerWidth = this.container.parentElement.offsetWidth;
    this.containerHeight = this.container.parentElement.offsetHeight;

    console.log('this.updateDimensions', this.containerWidth, this.containerHeight);

    if (!this.containerWidth) return;
    if (!this.containerHeight) return;
    if (!this.data.length) return;

    const totalItems = this.total || this.data.length;
    //console.log(this.total || this.data.length);

    if (this.direction === 'horizontal') {
        //this.container.style.width = `${this.containerWidth}px`;
        this.itemSize = this.itemWidth;
        this.containerSize = this.containerWidth;
        this.itemsPerRow = Math.floor(this.containerHeight / this.itemHeight);
        this.rowsInView = Math.ceil(this.containerWidth / this.itemWidth);
    } else {
        //this.container.style.height = `${this.containerHeight}px`;
        this.itemSize = this.itemHeight;
        this.containerSize = this.containerHeight;
        this.itemsPerRow = Math.floor(this.containerWidth / this.itemWidth);
        this.rowsInView = Math.ceil(this.containerHeight / this.itemHeight);
    }

    this.totalRows = Math.ceil(totalItems / this.itemsPerRow);
    this.itemsPerPage = Math.max(this.optItemsPerPage, (this.rowsInView + 2) * this.itemsPerRow);

    this.totalSize = this.totalRows * this.itemSize;
    this.totalSizeSentinel.style.transform = `${this.translateProp}(${this.totalSize}px)`;
    this.maxStartIndex = Math.max(this.data.length - this.itemsPerPage, 0);
    //this.startIndex = Math.min(this.startIndex, this.maxStartIndex);

    this.half_w = this.containerWidth / 2;
    this.half_h = this.containerHeight / 2;
    this.boundingClientRect = this.container.getBoundingClientRect();

    if (this.invalidateScrollIndex) {
        console.log('this.invalidateScrollIndex ', this.invalidateScrollIndex, this.itemsPerRow, this.containerSize);
        if (!this.isFullSize) {
            this.invalidateScrollIndex = Math.floor(this.invalidateScrollIndex / this.itemsPerRow);
        }
        this.container[this.scrollProp] = this.invalidateScrollIndex * this.itemSize;
        this.invalidateScrollIndex = 0;
        this.updateDimensions(); //recalculate important

    } else {

        if (force) {
            this.resolvedRenderMethod();
        } else {
            this.scrollHandler();
        }
    }
};

VirtualScroll.prototype.updateScroll = function() {
    const scrollPos = this.container[this.scrollProp];
    const {lastScrollPos, itemSize} = this;

    const sindex = Math.floor(scrollPos / itemSize) * this.itemsPerRow;
    this.startIndex = sindex;

    const threshold = Math.abs(itemSize) * 0.9;
    const scrollDelta = Math.abs(scrollPos - lastScrollPos);

    if ((scrollDelta > threshold)) {
        const scrollDirection = scrollPos > lastScrollPos ? 'increase' : 'decrease';
        this.lastScrollPos = scrollPos;

        if (scrollDirection === 'increase' && this.useDataFetching && !this.isFetching && this.params.cursor) {
            if (sindex >= this.maxStartIndex) {
                this.isFetching = true;
                this.fetchUpdateData();
            }
        }

        //if (this.startIndex <= this.maxStartIndex) {
        //this.resolvedRenderMethod(scrollDirection);
        //}

        //console.time('Render Time'); // Benchmark
        this.resolvedRenderMethod(scrollDirection);
        //console.timeEnd('Render Time');
    }
};

/* Handlers */
VirtualScroll.prototype.scrollHandler = function() {

    if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
    }
    if (this.scrollAnimationFrame) {
        cancelAnimationFrame(this.scrollAnimationFrame);
    }

    this.scrollAnimationFrame = requestAnimationFrame(() => {
        this.updateScroll();
    });

    this.scrollTimeout = setTimeout(() => {
        this.updateScroll();
    }, 100);
};

VirtualScroll.prototype.clickHandler = function(e) {
    //if (this.isFullSize) return;
    const {target: target, currentTarget: ctarget} = e;
    const index = target.closest('.item.card').dataset.index;
    const itemData = this.data[index];
    console.log(itemData);
};

VirtualScroll.prototype.wheelHandler = function(e) {
    if (e.target.closest('.full .item-info')) return;
    if (!this.isFullSize || !this.isZoomMode) {
        // scroll wheel
        e.preventDefault();
        const delta = Math.sign(e.deltaY); // 1 for down, -1 for up
        this.scrollDelta += delta;
        this.useSmoothScrolling(200);
    } else {
        // zoom wheel
        const delta = -Math.sign(e.deltaY) * 0.5;
        const relativeX = e.clientX - this.boundingClientRect.left;
        const relativeY = e.clientY - this.boundingClientRect.top;
        //console.log(relativeX, relativeY);
        if (delta < 0) {
            this.zoomOut(e, relativeX, relativeY);
        } else {
            this.zoomIn(e, relativeX, relativeY);
        }
    }

};


/* Setup Event Listeners */
VirtualScroll.prototype.setupEventListeners = function() {

    this.container.addEventListener('scroll', this.throttle(this.scrollHandler.bind(this), 100));
    this.container.addEventListener('click', this.clickHandler.bind(this));
    this.container.addEventListener("wheel", this.wheelHandler.bind(this), {passive: false});

    document.addEventListener('keydown', this.keyPressHandler.bind(this));

    this.panel = this.itemsWrapper;

    this.panel.addEventListener('pointerdown', this.pointerDown.bind(this), {passive: false});
    this.panel.addEventListener('pointermove', this.throttle(this.pointerMove.bind(this), 16), {passive: false});
    this.panel.addEventListener('pointerup', this.pointerUp.bind(this), {passive: false});
    this.panel.addEventListener('pointercancel', this.pointerUp.bind(this), {passive: false});
    this.panel.addEventListener('pointerleave', this.pointerUp.bind(this), {passive: false});

    /*
    this.panel.addEventListener('touchstart', this.touchStart.bind(this), {passive: false});
    this.panel.addEventListener('touchmove', this.throttle(this.touchMove.bind(this), 16), {passive: false});
    this.panel.addEventListener('touchend', this.touchEnd.bind(this), {passive: false});
    this.panel.addEventListener('touchcancel', this.touchEnd.bind(this), {passive: false});
    this.panel.addEventListener('touchleave', this.touchEnd.bind(this), {passive: false});
    */

    this.isMouseDevice = false;
    window.addEventListener('mousemove', () => {
        this.isMouseDevice = true;
    }, {once: true});

    //this.setupDragScrollListener();
};

/*
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
        if (!this.scrollDelta) return;
        this.container.style.cursor = 'grab';
        this.useSmoothScrolling(200);
    };

    this.container.addEventListener('mousedown', onMouseDown);
    this.container.addEventListener('mousemove', onMouseMove);
    this.container.addEventListener('mouseup', onMouseUp);
    this.container.addEventListener('mouseleave', onMouseUp);
};
*/

// Smooth Scrolling
VirtualScroll.prototype.useSmoothScrolling = function(duration = 200) {
    if (this.smoothScrolling) {
        const targetScrollPos = this.container[this.scrollProp] + (this.scrollDelta * this.itemSize);
        const snappedScrollPos = Math.round(targetScrollPos / this.itemSize) * this.itemSize;
        this.smoothScroll(snappedScrollPos, duration);
    } else {
        this.container[this.scrollProp] += this.scrollDelta * this.itemSize;
        this.scrollDelta = 0;
    }
};

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
            this.container[this.scrollProp] = targetScrollPos;
            animationFrameId = null;
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
        if (!this.invalidateScrollIndex) this.invalidateScrollIndex = this.startIndex;
        resizeTimer = setTimeout(() => {
            this.updateDimensions(true);
        }, 100);
    });

    observer.observe(this.container);
};



/* Keybord Handlers */
VirtualScroll.prototype.keyPressHandler = function(event) {
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
};

VirtualScroll.prototype.scrollToStart = function() {
    this.startIndex = 0;
    this.container[this.scrollProp] = 0;
};

VirtualScroll.prototype.scrollToEnd = function() {
    this.startIndex = Math.max(0, this.data.length - this.itemsPerPage);
    this.container[this.scrollProp] = this.startIndex * this.itemSize;
};

VirtualScroll.prototype.scrollToId = function(id) {
    const index = this.originalData.findIndex(item => item.id === id);
    console.warn(`Item with Index ${index} clicked.`);
    if (index !== -1) {
        this.container.classList.remove('visible');
        this.container[this.scrollProp] = 0; // reset scroll important
        this.invalidateScrollIndex = index;
        setTimeout(() => {
            this.updateDimensions();
            this.container.classList.add('visible');
        }, 200);

    } else {
        console.warn(`Item with ID ${id} not found in loaded data object.`);
    }
};

VirtualScroll.prototype.scrollToIndex = function(index) {
    this.container.classList.remove('visible');
    this.container[this.scrollProp] = 0; // reset scroll important
    this.invalidateScrollIndex = index || 0;
    setTimeout(() => {
        this.updateDimensions();
        this.container.classList.add('visible');
    }, 200);
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
    let lastCallArgs;

    return function() {
        const context = this;
        lastCallArgs = arguments;
        const now = Date.now();

        if (!lastRan) {
            func.apply(context, lastCallArgs);
            lastRan = now;
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((now - lastRan) >= limit) {
                    func.apply(context, lastCallArgs);
                    lastRan = now;
                }
            }, limit - (now - lastRan));
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
    this.startIndex = 0;
    this.container[this.scrollProp] = 0;
    //setTimeout(() => {
    this.originalData = data;
    this.data = this.originalData;
    this.initialize();
    //}, 500);

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

VirtualScroll.prototype.removeDataById = function(id) {
    const itemIndex = this.originalData.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        //console.log(this.originalData[itemIndex], id);
        this.originalData.splice(itemIndex, 1);
        this.data = this.originalData;
        this.total -= 1;
        this.updateDimensions(true);
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
        this.total = newData.total;
        const idata = this.getValueByPath(newData, this.keys.dataPath) || newData;
        renew ? this.setData(idata) : this.appendData(idata);
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




/* Zoom FullSize Item */
VirtualScroll.prototype.resetZoom = function() {
    this.zoom_scale = 1;
    this.x = this.y = 0;
    this.updateZoom();
};

VirtualScroll.prototype.zoomIn = function(e, cx, cy) {
    this.centeredZoom(1 / 0.65, cx, cy);
};

VirtualScroll.prototype.zoomOut = function(e, cx, cy) {
    this.centeredZoom(0.65, cx, cy);
};

VirtualScroll.prototype.getRelativePointers = function(pointers) {
    const {boundingClientRect} = this;
    const [pointer1, pointer2] = pointers;
    return {
        x1: pointer1.x - boundingClientRect.left,
        y1: pointer1.y - boundingClientRect.top,
        x2: pointer2.x - boundingClientRect.left,
        y2: pointer2.y - boundingClientRect.top
    };
};

VirtualScroll.prototype.centerOfPointers = function(pointers) {
    const {x1, y1, x2, y2} = this.getRelativePointers(pointers);
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    return [centerX, centerY];
};

VirtualScroll.prototype.distance = function(pointers) {
    if (pointers.length < 2) return 0;
    const dx = pointers[0].x - pointers[1].x;
    const dy = pointers[0].y - pointers[1].y;
    return Math.sqrt(dx * dx + dy * dy);
};

VirtualScroll.prototype.scalePointers = function(pointers) {
    if (pointers.length < 2) return 0;
    const currentDistance = this.distance(pointers);
    const previousDistance = this.previousDistance || 0;
    if (previousDistance > 0) {
        const relative_scale = currentDistance / previousDistance;
        const center = this.centerOfPointers(pointers);
        this.centeredZoom(relative_scale, center[0], center[1]);
    }
    this.previousDistance = currentDistance;
};

VirtualScroll.prototype.centeredZoom = function(relative, cx, cy) {
    const {zoom_scale, x, y, half_w, half_h} = this;
    let value = zoom_scale * relative;
    if (value <= 1) {
        this.resetZoom();
        return;
    } else if (value > 50) {
        return;
    }

    if (cy) {
        this.x = cx - (cx - x - half_w) * relative - half_w;
        this.y = cy - (cy - y - half_h) * relative - half_h;
    } else {
        this.x *= relative;
        this.y *= relative;
    }

    //console.log(relative, value);
    this.zoom_scale = value;
    this.updateZoom();
};

VirtualScroll.prototype.updateZoom = function() {
    if (this.zoomTarget) {
        this.zoomTarget.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.zoom_scale})`;
        //this.zoomTarget.style.backgroundPosition = `calc(50% + ${this.x}px) calc(50% + ${this.y}px)`;
        //this.zoomTarget.style.transform = `scale(${this.zoom_scale})`;
    }
};

/*
VirtualScroll.prototype.pointerDown = function(e) {
    if (!this.isFullSize) return;
    e.preventDefault();
    this.dragged = false;

    this.startX = e.pageX;
    this.startY = e.pageY;
    this.activePointers[e.pointerId] = {x: e.pageX, y: e.pageY};
    //e.target.setPointerCapture(e.pointerId);
    const pointerCount = Object.keys(this.activePointers).length;
    console.log(`Pointer Down: ${e.pointerId}, Count: ${pointerCount}, Active Pointers:`, this.activePointers);

    if (pointerCount === 2) {
        const pointers = Object.values(this.activePointers);
        this.initialDistance = this.distance(pointers);
    } else if (pointerCount === 1) {
        // remove css transition
        // console.log(pointerCount);
    }


};

VirtualScroll.prototype.pointerMove = function(e) {
    if (!this.isFullSize) return;
    e.preventDefault();
    this.dragged = true;

    if (this.activePointers[e.pointerId]) {
        this.activePointers[e.pointerId] = {x: e.pageX, y: e.pageY};
        const pointerCount = Object.keys(this.activePointers).length;
        console.log(`Pointer Move: ${e.pointerId}, Count: ${pointerCount}, Active Pointers:`, this.activePointers);
        if (pointerCount >= 2) {
            this.scalePointers(Object.values(this.activePointers));
        } else if (pointerCount === 1) {

            const dx = (e.pageX - this.startX);
            const dy = (e.pageY - this.startY);
            this.startX = e.pageX;
            this.startY = e.pageY;

            this.x += dx;
            this.y += dy;

            this.updateZoom();

        }
    }
};

VirtualScroll.prototype.pointerUp = function(e) {
    if (!this.isFullSize) return;
    e.preventDefault();
    this.dragged = false;
    //e.target.releasePointerCapture(e.pointerId);
    delete this.activePointers[e.pointerId];
    console.log(`Active Pointers After Deletion:`, this.activePointers);

    if (Object.keys(this.activePointers).length < 2) {
        this.previousDistance = 0;
        this.initialDistance = 0;
    }
};
*/


VirtualScroll.prototype.debounceDoubleTap = function(e) {
    const currentTime = Date.now();
    if (this.lastTapTime && (currentTime - this.lastTapTime) < 300) {
        this.isZoomMode = !this.isZoomMode;
        if (this.isZoomMode) {
            this.zoomTarget = e.target.closest('.item-img');
            this.zoom_scale = 1.2;
            this.updateZoom();
        } else {
            this.activePointers = {};
            this.resetZoom();
        }
    }
    this.lastTapTime = currentTime;
};

VirtualScroll.prototype.pointerDown = function(e) {
    if (e.target.tagName.toLowerCase() !== 'select') {
        e.preventDefault();
    }
    this.dragged = false;
    this.startX = e.pageX;
    this.startY = e.pageY;
    const {isFullSize, isMouseDevice, activePointers} = this;
    activePointers[e.pointerId] = {x: e.pageX, y: e.pageY};

    const pointerCount = Object.keys(activePointers).length;
    //console.log(`Pointer Down: ${e.pointerId}, Count: ${pointerCount}, Active Pointers:`, activePointers);

    if (pointerCount > 2) {
        return;
    }

    if (!isFullSize) {
        this.isZoomMode = false;
    }

    if (isFullSize && pointerCount === 1) {
        this.debounceDoubleTap(e);
    }

    const isZoomMode = this.isZoomMode;

    console.log(`isZoomMode: ${isZoomMode}`);

    if ((!isZoomMode && isFullSize) || (!isZoomMode && isMouseDevice)) {
        if (pointerCount === 1) {
            this.isDragging = true;
            this.start = e[this.client];
            this.scrollStart = this.container[this.scrollProp];
            this.container.style.cursor = 'grabbing';
        }
    }

};

VirtualScroll.prototype.pointerMove = function(e) {
    e.preventDefault();
    this.dragged = true;

    const {isZoomMode, isFullSize, isMouseDevice, activePointers, startX, startY, start, scrollProp, scrollStart} = this;
    if (activePointers[e.pointerId]) {
        activePointers[e.pointerId] = {x: e.pageX, y: e.pageY};
        const pointerCount = Object.keys(activePointers).length;
        if (isZoomMode) {

            if (pointerCount > 2) {
                return;
            }
            //console.log(`Pointer Move: ${e.pointerId}, Count: ${pointerCount}, Active Pointers:`, this.activePointers);
            if (pointerCount === 2) {
                this.scalePointers(Object.values(activePointers));
            } else if (pointerCount === 1) {
                const dx = (e.pageX - startX);
                const dy = (e.pageY - startY);
                this.startX = e.pageX;
                this.startY = e.pageY;
                this.x += dx;
                this.y += dy;
                requestAnimationFrame(() => {
                    this.updateZoom();
                });

            }

        } else if ((!isZoomMode && isFullSize) || (!isZoomMode && isMouseDevice)) {

            if (!this.isDragging || pointerCount > 1) return;
            const deltaY = start - e[this.client];
            const direction = Math.sign(deltaY);
            if (direction !== 0) {
                this.scrollDelta = direction;
            }
            requestAnimationFrame(() => {
                this.container[scrollProp] = scrollStart + deltaY;
            });
        }
    }
};

VirtualScroll.prototype.pointerUp = function(e) {
    e.preventDefault();
    this.dragged = false;

    const {isZoomMode, isFullSize, isMouseDevice, activePointers} = this;
    delete activePointers[e.pointerId];
    if (Object.keys(activePointers).length < 2) {
        this.previousDistance = 0;
    }

    if ((!isZoomMode && isFullSize) || (!isZoomMode && isMouseDevice)) {
        this.isDragging = false;
        if (!this.scrollDelta) return;
        this.container.style.cursor = 'grab';
        this.useSmoothScrolling(200);
    }

};


VirtualScroll.prototype.touchStart = function(e) {
    e.preventDefault();
    this.dragged = false;
    this.startX = e.touches[0].pageX;
    this.startY = e.touches[0].pageY;
    const {isFullSize, isMouseDevice, activePointers} = this;

    // Store active touches
    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        activePointers[touch.identifier] = {x: touch.pageX, y: touch.pageY};
    }

    const pointerCount = Object.keys(activePointers).length;
    if (!isFullSize) {
        this.isZoomMode = false;
    }

    if (isFullSize && pointerCount === 1) {
        this.debounceDoubleTap(e);
    }

    const isZoomMode = this.isZoomMode;

    console.log(`isZoomMode: ${isZoomMode}`);

    if ((!isZoomMode && isFullSize) || (!isZoomMode && isMouseDevice)) {
        if (pointerCount === 1) {
            this.isDragging = true;
            this.start = e.touches[0][this.client];
            this.scrollStart = this.container[this.scrollProp];
            this.container.style.cursor = 'grabbing';
        }
    }
};

VirtualScroll.prototype.touchMove = function(e) {
    e.preventDefault();
    this.dragged = true;

    const {isZoomMode, isFullSize, isMouseDevice, activePointers, startX, startY, start, scrollProp, scrollStart} = this;

    if (isZoomMode) {
        // Update active touches
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            activePointers[touch.identifier] = {x: touch.pageX, y: touch.pageY};
        }
        const pointerCount = Object.keys(activePointers).length;

        if (pointerCount === 2) {
            this.scalePointers(Object.values(activePointers));
        } else if (pointerCount === 1) {
            const dx = (e.touches[0].pageX - startX);
            const dy = (e.touches[0].pageY - startY);
            this.startX = e.touches[0].pageX;
            this.startY = e.touches[0].pageY;
            this.x += dx;
            this.y += dy;
            requestAnimationFrame(() => {
                this.updateZoom();
            });
        }
    } else if ((!isZoomMode && isFullSize) || (!isZoomMode && isMouseDevice)) {
        if (!this.isDragging) return;
        const deltaY = start - e.touches[0][this.client];
        const direction = Math.sign(deltaY);
        if (direction !== 0) {
            this.scrollDelta = direction;
        }
        requestAnimationFrame(() => {
            this.container[scrollProp] = scrollStart + deltaY;
        });
    }
};

VirtualScroll.prototype.touchEnd = function(e) {
    e.preventDefault();
    this.dragged = false;

    const {isZoomMode, isFullSize, isMouseDevice, activePointers} = this;

    // Remove active touches
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        delete activePointers[touch.identifier];
    }

    if (Object.keys(activePointers).length < 2) {
        this.previousDistance = 0;
    }

    if ((!isZoomMode && isFullSize) || (!isZoomMode && isMouseDevice)) {
        this.isDragging = false;
        if (!this.scrollDelta) return;
        this.container.style.cursor = 'grab';
        this.useSmoothScrolling(200);
    }
};

