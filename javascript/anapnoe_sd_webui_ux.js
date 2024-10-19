document.addEventListener('DOMContentLoaded', async() => {
    const scriptExists = async(path) => {
        try {
            const response = await fetch(path, {method: 'HEAD'});
            return response.ok;
        } catch {
            return false;
        }
    };
    const loadScript = async() => {
        const scriptPath = './file=extensions/sd-webui-ux/javascript/src/index.js';
        const exists = await scriptExists(scriptPath);
        if (exists) {
            window.basePath = './file=extensions/sd-webui-ux/';
            const script = document.createElement('script');
            script.type = 'module';
            script.src = './file=extensions/sd-webui-ux/javascript/src/index.js';
            document.head.appendChild(script);
            return;
        }
        console.warn('No valid script path found');
    };
    await loadScript();
});