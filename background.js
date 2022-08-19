const listeners = {
    template: (request, sender, sendResponse) => {
        console.debug(`an object is sent from tab ${sender.tab.id}:`, request);
        return setTimeout(() => sendResponse("async func is supported if listener returns true"), 100);
    },
    loadContentScript: ({filename}, {tab}) => {
        return chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: [filename]
        });
    },
    // download: chrome.downloads.download, // need permission `downloads`
    // downloadAll: ({dlOptArr}) => {
    //     return Promise.allSettled(dlOptArr.map(chrome.downloads.download));
    // }
};
chrome.runtime.onMessage.addListener(function (request) {
    if(listeners.hasOwnProperty(request.command))
        return listeners[request.command].apply(null, arguments);
    console.error("unknown command " + request.command);
});


chrome.action.onClicked.addListener(tab => {
    console.debug("This is executed when user clicks the extension logo.");
    // listeners.loadContentScript({filename: "content_script.js"}, {tab});
});
