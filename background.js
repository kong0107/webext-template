const listeners = {
    template: (request, sender, sendResponse) => {
        console.debug(`an object is sent from tab ${sender.tab.id}:`, request);
        return new Promise(resolve => setTimeout(() => resolve("")))
        return setTimeout(() => sendResponse("async callback is supported if listener returns true"), 100);
    },
    loadContentScript: ({filename}, {tab}) => {
        return chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: [filename]
        });
    },
    download: ({options}) => download(options),
    downloadAll: ({optionsArr}) => Promise.allSettled(optionsArr.map(download)),
    download1by1: async({optionsArr}) => {
        const results = [];
        for(let i = 0; i < optionsArr.length; ++i) {
            try {
                results.push(await download(optionsArr[i]));
            }
            catch(err) {
                results.push(err);
            }
        }
        return results;
    }
};
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(!listeners.hasOwnProperty(request.command))
        console.error("unknown command " + request.command);

    const result = listeners[request.command](request, sender);
    if(typeof sendResponse !== "function") return;
    if(result instanceof Promise) {
        result.then(sendResponse);
        return true;
    }
    else sendResponse(result);
});


chrome.action.onClicked.addListener(tab => {
    console.debug("This is executed when user clicks the extension logo.");
    // listeners.loadContentScript({filename: "content_script.js"}, {tab});
});



/** Functions **/

/**
 * Download and then resolve or reject.
 * @param {DownloadOptions} options
 * @returns {Promise} DownloadItem
 */
function download(options) {
    return new Promise(async(resolve, reject) => {
        const id = await chrome.downloads.download(options);
        if(!id) return reject(chrome.runtime.lastError);

        const listener = async(delta) => {
            if(delta.id !== id || !delta.state || delta.state === "in_progress") return;
            chrome.downloads.onChanged.removeListener(listener);
            const [item] = await chrome.downloads.search({id});
            if(item.error) reject(item);
            else resolve(item);
        };
        chrome.downloads.onChanged.addListener(listener);
    });
}
