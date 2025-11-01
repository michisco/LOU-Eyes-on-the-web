var isOccupied = false;
var languageUser = chrome.i18n.getUILanguage();
var translatorAvailable = false;
var languageDetectorAvailable = false;
const tabSeen = new Map(); //data structure that contains which tab has activated LOU.
const tabCurrentURL = new Map(); //data structure that contains which webpage URL is active in each tab.
var current_tab = null;
var current_url = null;

//function to set the system prompt for the AI model
function setSystemAgent(p_nimages, p_language, p_formatted_lang) {
    let l_system_prompt = `You are an accessibility assistant that helps blind and visually impaired users to understand webpages more easily. `;

    //check if the web page is not written in english or has not an undefined language.
    if(p_language !== 'und' && p_language !== 'en'){
        l_system_prompt = l_system_prompt + `You understand the webpages written in ${p_formatted_lang} and reply to user using a clear, conversational English, suitable for screen readers. `;
    }
    else{
        l_system_prompt = l_system_prompt + `Use clear, conversational English suitable for screen readers. `;
    }

    //check if the system has received some images from the current web page
    if(p_nimages > 0){
        l_system_prompt = l_system_prompt + `Your goal is to:
        1. Read and summarize the webpage clearly.
        2. Explain the main purpose and topic.
        3. Describe key images related to that topic.
                
        Follow these detailed rules:

        1. Main Summary:
           - Explain the webpage's main purpose, subject, or message.
           - Summarize key points in short, clear sentences.
           - Avoid unnecessary jargon or too long paragraphs.
           - Make sure the summary is suitable for screen readers.
           - If it is a news or article page, explain what it is about and what the main point or conclusion is.

        2. Image Descriptions:
           - Identify and describe the most relevant images that support or illustrate the main topic.
           - For each image, describe:
             - What it shows (people, objects, scenes, diagrams, etc.)
             - Its context or purpose on the page.
             - Be concise (2-4 sentences each).
           - If there are decorative or unrelated images, briefly note that they exist without unnecessary detail.
           - If there are some text inside the image, summarize the text in a brief.
           - If it is a chart or infographic, describe the type of chart, what it measures, and the main trend or takeaway.

        3. Accessibility Style:
           - Start directly to explain the webpage and do not ask for other questions.
           - Use simple, neutral, and descriptive language.
           - Avoid vague adjectives like “beautiful” or “nice”.
           - Use list formatting where appropriate.
           - Use clear section headers: “In the webpage summary” and “About images”.
           - Avoid visual formatting, emojis, symbols, or special characters like '#' and '*' that might confuse screen readers.

        4. Response Format Example:
           In the webpage summary:
           The webpage explains recent developments in electric vehicles, focusing on new battery technologies and charging networks.

           About images:
           1. A photo of an electric car connected to a public charging station.
           2. A chart showing improvements in battery efficiency over time.
           3. A decorative header image with a lightning bolt icon — unrelated to the main article content.`;
    }
    else{
        l_system_prompt = l_system_prompt + `Your goal is to:
        1. Read and summarize the webpage clearly.
        2. Explain the main purpose and topic.
                
        Follow these detailed rules:

        1. Main Summary:
           - Explain the webpage's main purpose, subject, or message.
           - Summarize key points in short, clear sentences.
           - Avoid unnecessary jargon or too long paragraphs.
           - Make sure the summary is suitable for screen readers.
           - If it is a news or article page, explain what it is about and what the main point or conclusion is.

        2. Accessibility Style:
           - Start directly to explain the webpage and do not ask for other questions.
           - Use simple, neutral, and descriptive language.
           - Avoid vague adjectives like “beautiful” or “nice”.
           - Use list formatting where appropriate.
           - Use clear section headers: “In the webpage summary” and “About images”.
           - Avoid visual formatting, emojis, symbols, or special characters like '#' and '*' that might confuse screen readers.

        3. Response Format Example:
           In the webpage summary:
           The webpage explains recent developments in electric vehicles, focusing on new battery technologies and charging networks.`;
    }

    console.log(l_system_prompt);
    return l_system_prompt;
}

chrome.commands.onCommand.addListener((command) => {
    //check if the Traslator API and Language Detector API
    if ('Translator' in self) {
        translatorAvailable = true;
    }

    if ('LanguageDetector' in self) {
        languageDetectorAvailable = true;
    }

    //if LOU is not reading -> start the reading phase
    if (command === "runLOU" && !isOccupied) {
        activateLOUScreenReader();
    } 
});

/**
 * Finds the active tab and send message to promptManager script.
 */
function activateLOUScreenReader() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        //if the second time, calls this function (without change the tab)
        if (typeof tabs[0] === "undefined") {
            const l_currentUsed = tabSeen.get(current_tab.id);
            const l_currentURL = tabCurrentURL.get(current_tab.id);
            current_url = current_tab.url;

            if (l_currentURL !== current_url) {
                isOccupied = true;
                chrome.scripting.executeScript({
                    target: { tabId: current_tab.id },
                    files: ["scripts/promptManager.js"]
                });
            }
            else {
                if (l_currentUsed != "") {
                    speakWithWebSpeechAPI(l_currentUsed, languageUser);
                }
            }
        } //this is the first time, calls this function 
        else {
            current_tab = tabs[0];
            current_url = current_tab.url;
            //check if the current tab has been used LOU
            const l_currentUsed = tabSeen.get(current_tab.id);
            //check if there is a current webpage URL corresponding to current tab
            const l_currentURL = tabCurrentURL.get(current_tab.id);

            //if LOU is not already read the web page
            if (typeof l_currentUsed === "undefined" || l_currentURL !== current_url) {
                isOccupied = true;
                chrome.scripting.executeScript({
                    target: { tabId: current_tab.id },
                    files: ["scripts/promptManager.js"]
                });
            } //if LOU is already read the web page -> repeat its previous response
            else {
                if (l_currentUsed != "") {
                    speakWithWebSpeechAPI(l_currentUsed, languageUser);
                }
            }
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PAGE_DATA") {
        runAIPrompt(message.payload);
    }
});

async function runAIPrompt(data) {
    try {
        let imageBlobs = [];

        if (data.images && data.images.length > 0) {
            const fetchPromises = data.images.map(url =>
                fetch(url)
                    .then(res => res.ok ? res.blob() : null)
                    .catch(e => {
                        console.warn(`Failed to fetch image: ${url}`, e);
                        return null; // Return null if fetch fails
                    })
            );
            // Wait for all fetches to complete
            const results = await Promise.all(fetchPromises);

            // Filter out any that failed (were null)
            imageBlobs = results.filter(blob => blob !== null);
        }

        //warning the user that AI model starting to thinking
        //speakWithWebSpeechAPI("Hi, I'm Lou! I'm reading the current page, wait about one minute... ");
        let welcome_message = "";
        let current_language_website = "";
        let language_website_formatted = "";
        let translation_unavailability = false;

        //if the Language Detector API is available, find the language used by the current web page
        if(languageDetectorAvailable){
            const detector = await LanguageDetector.create();
            const pageLanguage = (
                await detector.detect(data.body)
            )[0];

            const formatter = new Intl.DisplayNames(["en"], {
                type: 'language'
            });

            language_website_formatted = formatter.of(pageLanguage.detectedLanguage);
            current_language_website = pageLanguage.detectedLanguage;
        }
        else
            current_language_website = 'und';

        //if the Translator API is available, translate the welcome message and check if the (en -> user's language) is available
        if(translatorAvailable && languageUser !== 'en'){
            const translator_availability = await Translator.availability({ sourceLanguage: 'en', targetLanguage: languageUser });
            translation_unavailability = translator_availability === 'unavailable';

            //check if translation (en -> user's language) is available, otherwise create a default welcome message
            if (translation_unavailability) {
                welcome_message = "Unfortunately, I can't translate the content in your language. Now, I'm reading the web page, wait a few moments... ";
            }
            else{
                const translator = await Translator.create({ sourceLanguage: 'en', targetLanguage: languageUser });

                //check if the Language Detector has found a known language to warn the user
                if(current_language_website !== 'und'){
                    welcome_message = await translator.translate("Hi! I'm reading the web page. The website is in " + language_website_formatted + ", wait a few moments... ");
                } //otherwise, the assistant does not warn the user, using a default welcome message
                else{
                    welcome_message = await translator.translate("Hi! Now, I'm reading the web page, wait a few moments... ");
                }
            }
        }//if Translator API is not available or the user's native language is English, set the default message
        else{
            if(language !== 'en'){
                welcome_message = "Sorry, I can't translate the content in your language. Now, I'm reading the web page, wait a few moments... ";
            }
            else{
                if(current_language_website !== 'und'){
                    welcome_message = "Hi! I'm reading the web page. The website is in " + language_website_formatted + ", wait a few moments... ";
                }
                else{
                    welcome_message = "Hi! Now, I'm reading the web page, wait a few moments... ";
                }
            }

            translation_unavailability = true;
        }

        let system_prompt = setSystemAgent(imageBlobs.length, current_language_website, language_website_formatted);
        const params = {
            initialPrompts: [
                { role: 'system', content: system_prompt }
            ],
            expectedInputs: [
                { type: "text", languages: ["en"] },
                { type: "image" }
            ],
            expectedOutputs: [{
                type: "text",
                languages: ["en"]
            }],
        };

        //Lou says the welcome message to user
        speakWithWebSpeechAPI(welcome_message, translation_unavailability ? 'en' : languageUser);

        //check if the AI model is available
        const availability = await LanguageModel.availability(params);
        if (availability !== "unavailable") {
            if (availability !== "available") {
                //console.log("Sit tight, we need to do some downloading...");
            }
            const session = await LanguageModel.create(params, {
                monitor(m) {
                    m.addEventListener("downloadprogress", e => {
                        console.log(`Downloaded ${e.loaded * 100}%`);
                    });
                }
            });

            //prepare the prompt with web page body and some images
            let promptParts = [
                { type: 'text', value: `Here is the text of the webpage: "${data.body}"` }
            ];

            if (imageBlobs.length > 0) {
                promptParts.push({ type: 'text', value: 'Here are the images from the webpage.' });

                // Add each image blob to the prompt
                imageBlobs.forEach(blob => {
                    promptParts.push({ type: 'image', value: blob });
                });
            }

            let l_final_prompt = '';
            //check if there are some images in the prompt
            if(imageBlobs.length > 0){
                l_final_prompt = 'Using conversational English, please do two things: 1. Explain in a clearer and simple form, summarizing the webpage to blind users. 2. Describe the main subject from the relevant images inside it.';
            }
            else{
                l_final_prompt = 'Using conversational English, please explain in a clearer and simple form, summarizing the webpage to blind users.';
            }

            //send the prompt to AI model
            let lou_response = await session.prompt(
                [
                    {
                        role: 'user', content: promptParts
                    },
                    {
                        role: 'user', content: [
                            { type: 'text', value: l_final_prompt }
                        ]
                    }
                ]
            );

            //if the translator API is available and English is not user's native language, translate the response in the same user's language
            if (!translation_unavailability && languageUser !== 'en') {
                const translator = await Translator.create({ sourceLanguage: 'en', targetLanguage: languageUser });
                lou_response = await translator.translate(lou_response);
                console.log(lou_response);
                speakWithWebSpeechAPI(lou_response, languageUser);
            }
            else{
                console.log(lou_response);
                speakWithWebSpeechAPI(lou_response, 'en');
            }

            //result_lou = lou_response;
            tabSeen.set(current_tab.id, lou_response); //set current active tab is using LOU, saving the response 
            tabCurrentURL.set(current_tab.id, current_tab.url); //set current webpage url with corresponding current tab
            isOccupied = false;
            session.destroy();
        }//otherwise Lou warns the user about AI model is not available
        else{

        }
    } catch (e) {
        console.error("AI processing failed:", e);
        isOccupied = false;
    }
}

//set the offscreen document
async function setupOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL('scripts/hello.html');
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: 'scripts/hello.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'To play text-to-speech using the Web Speech API',
    });
}

//function to send messagge to speak the text
async function speakWithWebSpeechAPI(p_text, p_user_lang) {
    //check if the offscreen is running
    await setupOffscreenDocument();

    chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'speak',
        data: p_text,
        language: p_user_lang
    });
}
