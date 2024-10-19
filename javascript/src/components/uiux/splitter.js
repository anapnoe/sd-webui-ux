import Split from '../../../libs/split.js';

class SplitInstanceManager {
    constructor() {
        if (!SplitInstanceManager.instance) {
            this.splitInstances = {};
            SplitInstanceManager.instance = this;
        }
        return SplitInstanceManager.instance;
    }

    set(instances) {
        // Instead of reassignment, you merge the new instances into the existing one
        Object.assign(this.splitInstances, instances);
    }

    get() {
        return this.splitInstances;
    }
}

const instanceManager = new SplitInstanceManager();
Object.freeze(instanceManager); // Prevent further modification

export function setSplitInstances(instances) {
    instanceManager.set(instances);
}

export function getSplitInstances() {
    return instanceManager.get();
}

export async function initSplitComponents(contentDiv) {
    const splitInstances = [];

    // Initialize split components
    await Promise.all(Array.from(contentDiv.querySelectorAll('div.split')).map(async(el) => {
        const id = el.id;
        const nid = contentDiv.querySelector(`#${id}`);
        const direction = nid?.getAttribute('direction') === 'vertical' ? 'vertical' : 'horizontal';
        const gutter = nid?.getAttribute('gutterSize') || '8';
        const containers = contentDiv.querySelectorAll(`#${id} > div.split-container`);

        const sizes = Array.from(containers).map(c => {
            const initSize = c.getAttribute('data-initSize') ? parseInt(c.getAttribute('data-initSize')) : (100 / containers.length);
            const minSize = c.getAttribute('data-minSize') ? parseInt(c.getAttribute('data-minSize')) : Infinity;
            return {id: `#${c.id}`, initSize, minSize};
        });

        const ids = sizes.map(size => size.id);
        const isize = sizes.map(size => size.initSize);
        const msize = sizes.map(size => size.minSize);

        console.log("Split component", ids, isize, msize, direction, gutter);

        splitInstances[id] = Split(ids, {
            sizes: isize,
            minSize: msize,
            direction: direction,
            gutterSize: parseInt(gutter),
            snapOffset: 0,
            dragInterval: 1,
            elementStyle: (dimension, size, gutterSize) => ({
                'flex-basis': `calc(${size}% - ${gutterSize}px)`,
            }),
            gutterStyle: (dimension, gutterSize) => ({
                'flex-basis': `${gutterSize}px`,
                'min-width': `${gutterSize}px`,
                'min-height': `${gutterSize}px`,
            }),
        });
    }));

    setSplitInstances(splitInstances);
}
