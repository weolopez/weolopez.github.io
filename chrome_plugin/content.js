//content script
var clickedEl = null;

console.log("content script loaded")
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