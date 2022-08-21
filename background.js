const listeners = {
    template: (request, sender, sendResponse) => {
        console.debug(`an object is sent from tab ${sender.tab.id}:`, request);
        return setTimeout(() => sendResponse("async callback is supported if listener returns true"), 100);
    },
    loadContentScript: ({filename}, {tab}, sendResponse) => {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: [filename]
        }, ([result]) => sendResponse(result));
        return true;
    },
    download: ({options}, _, cb) => {
        return download(options).then(cb, cb);
    },
    downloadAll: ({optionsArr}, _, sendResponse) => {
        sendResponse(Promise.allSettled(optionsArr.map(download)));
        return true;
    },
    download1by1: async({optionsArr}, _, sendResponse) => {
        const results = [];
        for(let i = 0; i < optionsArr.length; ++i) {
            try {
                results.push(await download(optionsArr[i]));
            }
            catch(downloadItemWithError) {
                results.push(downloadItemWithError);
            }
        }
        sendResponse(results);
    }
};
chrome.runtime.onMessage.addListener(function (request) {
    if(listeners.hasOwnProperty(request.command))
        return !!listeners[request.command].apply(null, arguments);
    console.error("unknown command " + request.command);
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
