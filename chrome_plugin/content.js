//content script
var clickedEl = null;

console.log("content script loaded")

// function DOMtoString(selector) {
//     if (selector) {
//       selector = document.querySelector(selector);
//       if (!selector) return "ERROR: querySelector failed to find node"
//     } else {
//       selector = document.documentElement;
//     }
//     return selector.innerText
//   }
  
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     if (request.message === 'TabUpdated') {
//       console.log(document.location.href);
//       var mytext = document.documentElement.innerText
//       chrome.storage.session.set({ selectedText: mytext } )
    //   chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    //     var activeTab = tabs[0];
    //     var activeTabId = activeTab.id;
    
        //  chrome.scripting.executeScript({
        // return chrome.scripting.executeScript({
        //   target: { tabId: activeTabId },
        //   func: DOMtoString,
          // args: ['body']  // you can use this to target what element to get the html for
        // });
    
    //   }).then(function (results) {
    //     selection.innerText = results[0].result
    //   }).catch(function (error) {
    //     selection.innerText = 'There was an error injecting script : \n' + error.message;
    //   });
//     }
//   })

// console log any clicked element
// document.addEventListener("click", function (event) {
//     clickedEl = event.target;
//     console.log("clickedEl", clickedEl)
//     chrome.storage.session.set({ selectedText: clickedEl.innerText } )
// });



// document.body.style.background = 'yellow';

// addEventListener('contextmenu', (event) => {
//     clickedEl = event.target;
//     console.log("context menu clicked")
// });

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//     console.log("message received")
//     if(request == "getClickedEl") {
//         console.log("sending clickedEl", clickedEl.innerText)
//         sendResponse(clickedEl.innerText);
//     }
// });


// var selectedText = window.getSelection()
// console.log("selectedText", selectedText.toString())
// chrome.storage.session.set({ selectedText: info.selectionText } )