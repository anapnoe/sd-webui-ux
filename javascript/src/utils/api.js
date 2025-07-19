import {REPO_NAME} from '../constants.js';

export async function resyncTableData(apiParams, vScroll, treeView) {
    try {

        //alert(`Resync table: ${apiParams.table_name}`);
        // Step 1: Delete invalid items
        const deleteResponse = await fetch('/sd_webui_ux/delete_invalid_items', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({table_name: apiParams.table_name})
        });
        
        if (!deleteResponse.ok) {
            throw new Error(`DELETE failed! Status: ${deleteResponse.status}`);
        }
        
        // Step 2: Import/update table and process stream
        const importResponse = await fetch('/sd_webui_ux/import_update_table', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({table_name: apiParams.table_name})
        });
        
        if (!importResponse.ok) {
            throw new Error(`IMPORT failed! Status: ${importResponse.status}`);
        }
        
        vScroll.showLoadingIndicator();
        const reader = importResponse.body.getReader();
        const decoder = new TextDecoder();
        
        // Process stream chunks
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, {stream: true});
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    vScroll.updateLoadingIndicator(Math.round(data.progress));
                    console.log(`Processed ${data.processed}/${data.total} (${data.progress}%)`);
                } catch (e) {
                    console.error('JSON parse error:', e, 'Raw:', line);
                }
            }
        }
        
        vScroll.hideLoadingIndicator();
        
        // Step 3: Final UI updates
        apiParams.skip = 0;
        await vScroll.updateParamsAndFetch(apiParams, 0);
        await treeView.initialize();
        
        return {success: true, message: 'Table resynced successfully'};

    } catch (error) {
        console.error('Operation failed:', error);
        vScroll.hideLoadingIndicator();
        return {success: false, error: error.message};
    }
}