const synth = window.speechSynthesis;
let voices = [];
let stop = false;

//load voices
function loadVoices() {
  voices = synth.getVoices();
}

loadVoices();
synth.onvoiceschanged = loadVoices;

function findBestVoice(lang) {
  if (voices.length === 0) {
    return null; // voices not ready
  }

  //try to find an exact match (e.g., "en-US")
  let voice = voices.find(v => v.lang === lang);
  if (voice) return voice;

  //if no exact match, try to find a partial match
  const langBase = lang.split('-')[0];
  voice = voices.find(v => v.lang.startsWith(langBase));
  if (voice) return voice;

  return voices[0] || null;
}

//wait to receive the message from serviceWorker.js
chrome.runtime.onMessage.addListener((msg) => {
    if (synth.speaking) {
        stop = true;
    }

    if (msg.target === 'offscreen' && msg.type === 'speak') {
        if(msg.data !== ""){
            if(!stop){
                //stop any previous speech
                synth.cancel();
                const bestVoice = findBestVoice(msg.language);
                const l_utterance = new SpeechSynthesisUtterance(msg.data);

                //set voice language according user's language
                if (bestVoice) {
                    l_utterance.voice = bestVoice;
                    l_utterance.lang = bestVoice.lang;
                } else {
                    for (let i = 0; i < voices.length; i++) {
                        if (voices[i].name === "Google US English") {
                            l_utterance.voice = voices[i];
                            break;
                        }
                    }
                }

                l_utterance.pitch = 0.8;
                l_utterance.rate = 0.9;
                l_utterance.onend = () => {
                    window.close();
                };
                synth.speak(l_utterance);
            }
            else{
                synth.cancel();
                if (!synth.speaking) {
                    window.close();
                }
            }
        }
    }
    stop = false;
});
