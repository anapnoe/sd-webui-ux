export function DynamicForm(url, table_name, itemData, container) {
    this.url = url;
    this.table_name = table_name;
    this.itemData = itemData;
    this.container = container;
    this.form = document.createElement('form');
    this.form.setAttribute('id', 'userMetadataForm');
    this.form.classList.add('flexbox', 'padding', 'col', 'shrink');
}

DynamicForm.prototype.formatFileSize = function(size) {
    if (typeof size !== 'number') {
        return '0 bytes';
    }
    if (size >= 1073741824) {
        return (size / 1073741824).toFixed(2) + ' GB';
    } else if (size >= 1048576) {
        return (size / 1048576).toFixed(2) + ' MB';
    } else if (size >= 1024) {
        return (size / 1024).toFixed(2) + ' KB';
    } else {
        return size + ' bytes';
    }
};

DynamicForm.prototype.formatDate = function(timestamp) {
    if (typeof timestamp !== 'number') {
        return ''; // Or handle the non-number case
    }
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
};

DynamicForm.prototype.formatFilename = function(path) {
    if (typeof path !== 'string') {
        return ''; // Or handle the non-string case as needed
    }
    return path.replace(/\\/g, '/').split('/').pop();
};

DynamicForm.prototype.createElement = function(type, field, value, attributes = {}) {
    const elementConfig = {
        textarea: {tag: 'textarea', attributes: {rows: 4, textContent: value || ''}},
        select: {
            tag: 'select',
            attributes: {},
            children: Array.isArray(attributes.options) ? attributes.options.map(option => ({
                tag: 'option',
                attributes: {value: option, textContent: option}
            })) : []
        },
        input: {tag: 'input', attributes: {type: 'text', value: value || ''}},
        file: {tag: 'input', attributes: {type: 'file'}},
        number: {tag: 'input', attributes: {type: 'number', value: value}},
        checkbox: {tag: 'input', attributes: {type: 'checkbox', checked: value}},
        radio: {tag: 'input', attributes: {type: 'radio', checked: value}},
        slider: {tag: 'input', attributes: {type: 'range', value: value}},
        img: {tag: 'img', attributes: {src: 'file=' + value, alt: field, class: 'thumbnail-image'}},
        button: {tag: 'button', textContent: value, attributes: {class: 'ae-button', name: field}},
        default: {tag: 'input', attributes: {type: 'text', value: value || ''}}
    };

    const config = elementConfig[type] || elementConfig.default;
    const element = document.createElement(config.tag);

    // Apply default attributes
    Object.entries(config.attributes).forEach(([attr, val]) => {
        if (attr === 'textContent') {
            element.textContent = val;
        } else if (attr === 'checked') {
            element.checked = !!val;
        } else {
            element.setAttribute(attr, val);
        }
    });

    // Apply additional attributes
    Object.entries(attributes).forEach(([attr, val]) => {
        if (attr === 'textContent') {
            element.textContent = val;
        } else if (attr === 'checked') {
            element.checked = !!val;
        } else {
            element.setAttribute(attr, val);
        }
    });

    // Add child elements if they exist
    if (config.children) {
        config.children.forEach(childConfig => {
            const child = document.createElement(childConfig.tag);
            Object.entries(childConfig.attributes).forEach(([childAttr, childVal]) => {
                if (childAttr === 'textContent') {
                    child.textContent = childVal;
                } else {
                    child.setAttribute(childAttr, childVal);
                }
            });
            if (childConfig.attributes.value === value) {
                child.selected = true;
            }
            element.appendChild(child);
        });
    }

    element.setAttribute('id', field);
    element.setAttribute('name', field);
    return element;
};




DynamicForm.prototype.addElementToForm = function(field, config) {
    const fieldContainer = document.createElement('div');
    fieldContainer.classList.add('panel', 'col', 'padding');
    const label = document.createElement('label');
    label.setAttribute('for', field);
    label.classList.add('flexbox');
    label.textContent = field.replace('_', ' ').toUpperCase();

    const input = this.createElement(config.type, field, this.itemData[field], config);

    fieldContainer.appendChild(label);
    fieldContainer.appendChild(input);
    this.form.appendChild(fieldContainer);
};


DynamicForm.prototype.createForm = function(fields) {
    Object.entries(fields).forEach(([field, config]) => {
        this.addElementToForm(field, config);
    });

    const savePanel = document.createElement('div');
    savePanel.classList.add('panel', 'row', 'flex-end');
    const submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'submit');
    submitButton.textContent = 'Save';
    submitButton.classList.add('submit-button');
    savePanel.appendChild(submitButton);
    this.form.appendChild(savePanel);
    this.form.addEventListener('submit', (event) => this.handleSubmit(event));

    return this.form;
};


DynamicForm.prototype.createValueElement = function(type, field, value) {
    const elementConfig = {
        "filename": {textContent: this.formatFilename(value)},
        "filesize": {textContent: this.formatFileSize(value)},
        'date-format': {textContent: this.formatDate(value)},
        "img": {tag: 'img', attributes: {src: './sd_extra_networks/thumb?filename=' + value, alt: field, class: 'thumbnail-image'}},
        "button": {tag: 'button', textContent: field, attributes: {class: 'ae-button', name: field}},
        "default": {textContent: value || ''}
    };

    const config = elementConfig[type] || elementConfig.default;
    let element;

    if (config.tag) {
        element = document.createElement(config.tag);
        Object.entries(config.attributes).forEach(([attr, val]) => {
            element.setAttribute(attr, val);
        });
        if (config.textContent) {
            element.textContent = config.textContent;
        }
    } else {
        element = document.createElement('span');
        element.textContent = config.textContent;
    }

    return element;
};

DynamicForm.prototype.createTable = function(table_data) {

    const table = document.createElement('table');
    table.classList.add('non-editable-table', 'panel');

    Object.entries(table_data).forEach(([field, config]) => {
        const row = document.createElement('tr');

        const labelCell = document.createElement('td');
        labelCell.textContent = field.replace('_', ' ').toUpperCase();
        row.appendChild(labelCell);

        const valueCell = document.createElement('td');
        const valueContent = this.createValueElement(config.type, field, this.itemData[field]);
        valueCell.appendChild(valueContent);
        row.appendChild(valueCell);

        table.appendChild(row);
    });

    return table;
};

DynamicForm.prototype.createHtmlElement = function(table_data) {
    const div = document.createElement('div');
    div.classList.add('non-editable-div', 'flexbox', 'col', 'shrink');

    Object.entries(table_data).forEach(([field, config]) => {
        const row = document.createElement('div');
        row.classList.add('panel', field);

        if (config.showLabel !== false) {
            const labelCell = document.createElement('label');
            labelCell.textContent = field.replace('_', ' ').toUpperCase();
            row.appendChild(labelCell);
        }

        const valueContent = this.createValueElement(config.type, field, this.itemData[field]);
        row.appendChild(valueContent);

        div.appendChild(row);
    });

    return div;
};

DynamicForm.prototype.handleSubmit = async function(event) {

    event.preventDefault();
    const formData = new FormData(this.form);
    const fdata = {};
    for (const [key, value] of formData.entries()) {
        fdata[key] = value;
    }
    const postdata = fdata;
    postdata.table_name = this.table_name;
    postdata.name = this.itemData.name;

    try {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postdata),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const message = await response.json();
        this.afterFormSubmit(fdata, message);
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
};

DynamicForm.prototype.afterFormSubmit = function() {
    /*
    this.vScroll.showDetail();
    detailView(this.container, this.form);
    */
};
