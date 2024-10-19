document.addEventListener('DOMContentLoaded', async() => {
    const potentialBasePaths = [
        './file=extensions-builtin/sd-webui-ux/',
        './file=extensions/sd-webui-ux/'
    ];

    /*
    const originalFetch = window.fetch;
    window.fetch = async(...args) => {
        try {
            const response = await originalFetch(...args);
            if (!response.ok) {
                return new Response(null, {status: response.status});
            }
            return response;
        } catch (error) {
            return new Response(null, {status: 404});
        }
    };
    */

    const scriptExists = async(path) => {
        try {
            const response = await fetch(path, {method: 'HEAD'});
            return response.ok;
        } catch {
            return false;
        }
    };

    const loadScript = async() => {
        for (const basePath of potentialBasePaths) {
            let scriptPath = `${basePath}javascript/src/index.js`;
            const exists = await scriptExists(scriptPath);
            if (exists) {
                const devPath = `${basePath}dev.txt`;
                const devExists = await scriptExists(devPath);
                if (!devExists) {
                    scriptPath = `${basePath}javascript/dist/index.js`;
                }

                window.basePath = basePath;
                const script = document.createElement('script');
                script.type = 'module';
                script.src = scriptPath;
                document.head.appendChild(script);
                return;
            }
        }
        console.warn('No valid script path found');
    };

    /*
    const originalConsoleError = console.error;
    console.error = (...args) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('404')) {
            return;
        }
        originalConsoleError(...args);
    };
    */

    await loadScript();
    //console.error = originalConsoleError;
});

