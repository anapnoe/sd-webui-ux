export function TreeView(css_selector, fetchUrl, tableName, rootPath = '') {
    this.container = document.querySelector(css_selector);
    this.fetchUrl = fetchUrl;
    this.tableName = tableName;
    this.rootPath = rootPath.replace(/\\/g, '/').toLowerCase(); // Normalize rootPath once here
    this.selected;
}

TreeView.prototype.initialize = async function() {
    this.container.innerHTML = "";
    const data = await this.fetchData(this.rootPath);

    const tree = this.buildTree(data);
    const treeView = this.createTreeView(tree);
    this.container.appendChild(treeView);
    this.attachEventListeners();

    this.itemMap = data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
};

TreeView.prototype.updateSelectedItems = function() {
    this.container.querySelectorAll('.li-file.active').forEach(item => {
        item.classList.remove('active');
    });

    this.selected?.forEach(name => {
        const item = this.container.querySelector(`.li-file[data-name="${name}"]`);
        if (item) {
            item.classList.add('active');
        }
    });
};

TreeView.prototype.fetchData = async function(path) {
    const response = await fetch(`${this.fetchUrl}?table_name=${this.tableName}&path=${encodeURIComponent(path)}`);
    const json = await response.json();
    this.data = json.data;
    return json.data;
};

TreeView.prototype.buildTree = function(items) {
    const tree = {};
    const rootPath = this.rootPath;
    tree[rootPath] = {};
    const rootLevel = tree[rootPath];

    items.forEach(item => {
        const fullPath = item.filename.replace(/\\/g, '/').toLowerCase();
        const rootIndex = fullPath.indexOf(rootPath);
        if (rootIndex === -1) return;

        const relativePath = fullPath.slice(rootIndex + rootPath.length).replace(/^\//, '');
        const parts = relativePath.split('/').filter(Boolean);

        let currentLevel = rootLevel;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!currentLevel[part]) {
                if (i === parts.length - 1) {
                    currentLevel[part] = item;
                } else {
                    currentLevel[part] = {};
                }
            }
            currentLevel = currentLevel[part];
        }
    });

    return tree;
};


TreeView.prototype.createFileItem = function(tree, key) {
    const li = document.createElement('li');
    li.dataset.name = tree[key].name;
    li.dataset.id = tree[key].id;
    li.innerHTML = `<summary class="tree-file">${tree[key].name}</summary>`;
    li.classList.add('li-file');
    return li;
};

TreeView.prototype.createFolderItem = function(tree, key, path) {
    const li = document.createElement('li');
    li.innerHTML = `<summary class="tree-folder caret" data-path="${path}${key}">${key}</summary>`;
    const nestedUl = this.createTreeView(tree[key], `${path}/${key}`);
    nestedUl.classList.add('nested');
    li.appendChild(nestedUl);
    return li;
};

TreeView.prototype.createTreeView = function(tree, path = '') {
    const ul = document.createElement('ul');
    ul.classList.add('tree-view');

    for (const key in tree) {
        let li;
        if (typeof tree[key] === 'object' && !Array.isArray(tree[key])) {
            if (key.includes(".safetensors") || key.includes(".pt")) {
                li = this.createFileItem(tree, key);
            } else {
                li = this.createFolderItem(tree, key, path);
            }
        } else {
            li = this.createFileItem(tree, key);
        }
        ul.appendChild(li);
    }

    return ul;
};

TreeView.prototype.attachEventListeners = function() {

    if (this.eventListenerAdded) {
        return;
    }

    this.container.addEventListener('click', async(e) => {
        //console.log('Clicked element:', e.target); // Log the clicked element
        const target = e.target;
        const listItem = target.closest('li[data-id]');
        const buttonItem = target.tagName === 'BUTTON';
        if (buttonItem) {
            const itemId = listItem.dataset.id;
            const itemData = this.getItemProperties(itemId);
            this.onFileClicked(target, itemData);
        } else if (listItem) {
            const itemId = listItem.dataset.id;
            const itemData = this.getItemProperties(itemId);
            this.onFileClicked(listItem, itemData);
        } else if (target.classList.contains('caret')) {
            target.classList.toggle('caret-down');
            const nestedList = target.nextElementSibling;
            if (nestedList.classList.contains('nested')) {
                nestedList.classList.toggle('active');
            }
            this.onFolderClicked(target, target.getAttribute('data-path'), nestedList.classList.contains('active'));
        }

        e.stopPropagation();
    });

    this.eventListenerAdded = true;


    /*
    this.container.addEventListener('click', async(event) => {
        if (event.target.dataset.id) {
            const itemId = event.target.dataset.id;
            const itemData = this.getItemProperties(itemId);
            this.onFileClicked(event.target, itemData);
        } else if (event.target.classList.contains('caret')) {
            event.target.classList.toggle('caret-down');
            const nestedList = event.target.nextElementSibling;
            if (nestedList.classList.contains('nested')) {
                nestedList.classList.toggle('active');
            } else {
                //tree lazy loading data not yet implemented
                const path = event.target.getAttribute('data-path');
                const data = await this.fetchData(path);
                const tree = this.buildTree(data);
                const treeView = this.createTreeView(tree, path);
                nestedList.appendChild(treeView);
                nestedList.classList.add('nested', 'active');
            }

            this.onFolderClicked(event.target, event.target.getAttribute('data-path'), nestedList.classList.contains('active'));
        }
    });
    */
};

TreeView.prototype.getItemProperties = function(itemId) {
    return this.itemMap[itemId];
};

TreeView.prototype.onFolderClicked = function(target, path, active) {
};

TreeView.prototype.onFileClicked = function(target, data) {
};
