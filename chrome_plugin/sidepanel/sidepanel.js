// Select location value 
const chat = document.querySelector('#chat-input')

function DOMtoString(selector) {
  let element;
  if (selector) {
    element = document.querySelector(selector);
    if (!element) {
      reject("ERROR: querySelector failed to find node");
      return;
    }
  } else {
    element = document.documentElement;
  }
  main = element.querySelector('main');
  if (main) {
    element = main;
  } else {
    element = document.documentElement;
  }
  return element.innerText;
}
function getData(tab) {
  var selection = document.querySelector('#selectedText');
  var tabDepth = 0

  chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    var activeTab = tabs[0];
    var activeTabId = activeTab.id;

    return chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      // injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
      func: DOMtoString,
      args: ['body']  // you can use this to target what element to get the html for
    });

  }).then(function (results) {
    chat.value = 'Summarize: '
    selection.innerText = results[0].result
  }).catch(function (error) {
    selection.innerText = 'There was an error injecting script : \n' + error.message;
  });
}

if (chrome && chrome.storage) {
  chrome.storage.session.get(["selectedText"]).then((result) => {
    chat.value = (!result.selectedText) ? "Summarize: " : result.selectedText;
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(
        `Storage key "${key}" in namespace "${namespace}" changed.`,
        `Old value was "${oldValue}", new value is "${newValue}".`
      );
      chat.value = (newValue === 'undefined') ? "Summarize: " : newValue;
    }
  });


  chrome.tabs.onActivated.addListener(function (activeInfo) {
    getData(activeInfo)
  });
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    getData(tab)
  });

  getData()

}