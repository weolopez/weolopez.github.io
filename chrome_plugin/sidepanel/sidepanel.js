// Select location value 

function DOMtoString(selector) {
  if (selector) {
    selector = document.querySelector(selector);
    if (!selector) return "ERROR: querySelector failed to find node"
  } else {
    selector = document.documentElement;
  }

  //get the selected text
  // var selectedText = window.getSelection()
  // console.log(selectedText.toString())

  //get text from selector element
  // var text = selector.innerText;
  return selector.innerText//, selectedText;
  // return selector.outerHTML;
}
function getData() {
  // var message = document.querySelector('#toSummarize');
  // var selection = document.querySelector('#selectedText');
  var tabDepth = 0

  chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    var activeTab = tabs[0];
    var activeTabId = activeTab.id;

    return chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      // injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
      func: DOMtoString,
      // args: ['body']  // you can use this to target what element to get the html for
    });

  }).then(function (results) {
    console.error(results)
    // message.innerText = 
    chat.value = results[0].result
    // chrome.storage.session.get('selectedText', ({ selectedText }) => {
    //   console.log(selectedText)
    //   selection.innerText = selectedText;
    // });

    // console.log(results[1])
    // message.innerText = results[0].result;
  }).catch(function (error) {
    // message.innerText = 'There was an error injecting script : \n' + error.message;
    alert('There was an error injecting script : \n' + error.message);
  });
}

if (chrome && chrome.storage) {

  // var selection = document.querySelector('#selectedText');
  // chrome.storage.session.get('selectedText', selectedText => {
  //     console.log(selectedText)
  //   selection.innerText = selectedText.toString();
  // });
  var chat = document.querySelector('#chat-input')
  chrome.storage.session.get(["selectedText"]).then((result) => {
    // console.log("Value is " + result.selectedText);
    // selection.innerText = result.selectedText;
    chat.value = result.selectedText;
    sendMessage()
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(
        `Storage key "${key}" in namespace "${namespace}" changed.`,
        `Old value was "${oldValue}", new value is "${newValue}".`
      );
      chat.value = newValue;
      sendMessage()

      // selection.innerText = newValue;//`Old value was "${oldValue}", new value is "${newValue}".`;
    }
  });

  // chrome.storage.local.set({ settings: { model: "askatt" } });
  // get settings from local storage if none exists set default
  // chrome.storage.local.get(['settings'], function (result) {
  //   if (result.settings === undefined) {
  //     chrome.storage.local.set({ settings: { model: "askatt" } });
  //     // settings = { model: "askatt" } 
  //   } else {
  //     settings = result.settings;
  //   }
  // });

  // getData()
}