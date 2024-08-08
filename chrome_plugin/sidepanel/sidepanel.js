// Select location value 
const chat = document.querySelector('#chat-input')

function DOMtoString(selector) {
  console.log("DOMtoString:", selector)
  // if (document.contentLoaded !== true) {
  //   document.contentLoaded = true
  //   document.addEventListener('click', async function (event) {
  //     if (event.target.tagName === 'INPUT' || event.target.type === 'textarea') {
  //       showPopover(event.target);
  //     }
  //   });

  //   async function showPopover(inputElement) {
  //     console.log("showPopover:", inputElement.id);

  //     const css = `
  //   #custom-popover {
  //     background-color: white;
  //     border: 1px solid #ccc;
  //     border-radius: 4px;
  //     box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  //     padding: 10px;
  //     z-index: 1000;
  //   }
  //   #popover-textarea {
  //     width: 100%;
  //     height: 50px;
  //     border: none;
  //     outline: none;
  //     resize: none;
  //   }
  // `;

  //     // Create a style element and append the CSS
  //     const style = document.createElement('style');
  //     style.type = 'text/css';
  //     style.appendChild(document.createTextNode(css));
  //     document.head.appendChild(style);

  //     const popover = document.createElement('div');
  //     popover.id = 'custom-popover';
  //     popover.innerHTML = '<div id="popover-textarea"></div>';
  //     document.body.appendChild(popover);

  //     const rect = inputElement.getBoundingClientRect();
  //     popover.style.position = 'absolute';
  //     popover.style.left = `${rect.left}px`;
  //     popover.style.top = `${rect.bottom + window.scrollY}px`;

  //     // Adjust position if popover is off-screen
  //     const popoverRect = popover.getBoundingClientRect();
  //     if (popoverRect.right > window.innerWidth) {
  //       popover.style.left = `${window.innerWidth - popoverRect.width}px`;
  //     }
  //     if (popoverRect.bottom > window.innerHeight) {
  //       popover.style.top = `${rect.top + window.scrollY - popoverRect.height}px`;
  //     }

  //     const textarea = document.getElementById('popover-textarea');
  //     textarea.value = 'ERROR';//await getRecommendation(inputElement);
  //     textarea.addEventListener('keydown', function (event) {
  //       if (event.key === 'Tab') {
  //         event.preventDefault();
  //         inputElement.value += textarea.value;
  //         document.body.removeChild(popover);
  //       }
  //     });
  //   }
  // }
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
  // return element.innerHTML;
}
function getData(tab) {
  PAGE_URL_STRING = window.location.href.replace(/[^a-zA-Z0-9]/g, '').slice(0, 63)

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
    let text = results[0].result
    selection.innerText = `Context Length: ${text.length} <context>${text}</context>`
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
    console.log("sidepanel script onActivated")
    getData(activeInfo)
  });
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log("sidepanel script onUpdated")
    getData(tab)

  });


  getData()

}

if (chrome.runtime.onMessage)
chrome.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
  if (message.action === 'INPUT_ENTERED') {
  // if (message.action === 'tabPressed') {
  alert('INPUT_ENTERED by sidepanel js:', message.value);
    console.log('Tab was pressed, recieved by extension:', message.value);
    let airesponse = await getRecommendation(message.value);
    // Handle the message
    sendResponse({ status: 'aiResponse', value: airesponse});
  }
});

// chrome.runtime.onMessage.sendMessage({ action: 'tabPressed', value: 'from sidepanel js' }, function(response) {
//   console.log('Response from extension:', response);
// })