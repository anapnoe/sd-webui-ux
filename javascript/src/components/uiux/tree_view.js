export function TreeView(css_selector, fetchUrl, tableName, rootPath = '') {
    this.container = document.querySelector(css_selector);
    this.fetchUrl = fetchUrl;
    this.tableName = tableName;
    this.rootPath = rootPath.replace(/\\/g, '/').toLowerCase(); // Normalize rootPath once here
}

TreeView.prototype.initialize = async function() {
    this.container.innerHTML = "";
    const data = await this.fetchData(this.rootPath);
    this.itemMap = data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
    const tree = this.buildTree(data);
    const treeView = this.createTreeView(tree);
    this.container.appendChild(treeView);
    this.attachEventListeners();
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


TreeView.prototype.createTreeView = function(tree, path = '') {
    const ul = document.createElement('ul');
    ul.classList.add('tree-view');

    for (const key in tree) {
        const li = document.createElement('li');

        if (typeof tree[key] === 'object' && !Array.isArray(tree[key])) {
            // directory
            if (key.includes(".safetensors") || key.includes(".pt")) {
                // file find a better way detect file
                li.innerHTML = `<summary class="tree-file" data-id="${tree[key].id}" >${tree[key].name}</summary>`;
                li.classList.add('li-file');

            } else {
                li.innerHTML = `<summary class="tree-folder caret" data-path="${path}${key}">${key}</summary>`;
                const nestedUl = this.createTreeView(tree[key], `${path}/${key}`);
                nestedUl.classList.add('nested');
                li.appendChild(nestedUl);

            }
        } else {
            // file
            li.classList.add('li-file');
            li.innerHTML = `<summary class="tree-file" data-id="${tree[key].id}" >${tree[key].name}</summary>`;

        }
        ul.appendChild(li);
    }

    return ul;
};

TreeView.prototype.attachEventListeners = function() {
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
            }
            this.onFolderClicked(event.target, event.target.getAttribute('data-path'), nestedList.classList.contains('active'));
        }
    });
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
