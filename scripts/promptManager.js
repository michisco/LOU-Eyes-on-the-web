/*
 * Script that get all current web page body and some images to send to service worker.
 */

(function () {  
    const pageBody = document.body;
    const pageText = pageBody.innerText.substring(0, 5000);

    let uniqueImageUrls;

    //take all images with width > 300 and height > 250
    const allImages = Array.from(document.querySelectorAll('img'));
    const relevantImageUrls = allImages
        .filter(img => {
            const width = img.width || img.naturalWidth;
            const height = img.height || img.naturalHeight;
            return width > 300 && height > 250;
        })
        .map(img => new URL(img.src, document.baseURI).href); // get absolute URL

    //create a set of unique images
    uniqueImageUrls = [...new Set(relevantImageUrls)];

    chrome.runtime.sendMessage({
        type: "PAGE_DATA",
        payload: {
            body: pageText,
            images: uniqueImageUrls,
        }
    });
})();
