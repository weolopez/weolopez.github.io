//content script
var clickedEl = null;

// document.addEventListener('click', async function (event) {
//   if (event.target.tagName === 'INPUT' || event.target.type === 'textarea') {
//     showPopover(event.target);
//     // Send a message to the extension
//     chrome.runtime.sendMessage({ action: 'INPUT_ENTERED', value: 'textarea.value' }, function (response) {
//       console.log('Response from extension:', response);
//       alert('INPUT_ENTERED by content js:', response);
//       let pta = document.getElementById('popover-textarea')
//       pta.value = response.status;
//       // event.target.value += response.status;
//       event.target.value += "TODO replace when tabPressed"
//     });
//   }
// });

// event listener for option + up arrow combination
document.addEventListener('keydown', async function (event) {
  if (event.key === 'ArrowRight' && event.altKey) {
    chrome.runtime.sendMessage({ action: 'INPUT_ENTERED', value: 'textarea.value' }, function (response) {
      console.log('Response from extension:', response);
      // alert('INPUT_ENTERED by content js:', response);
      // let pta = document.getElementById('popover-textarea')
      // pta.value = response.status;
      // // event.target.value += response.status;
      // event.target.value += "TODO replace when tabPressed"
    })
  }
});

async function showPopover(inputElement) {
  //trigger an event to the sidepanel
  //get html of inputElement parent
  var inputContext = inputElement.parentElement.innerHTML;
  console.log("inputContext:", inputContext);
  window.document.body.dispatchEvent(new CustomEvent('showPopover', { detail: { inputElement: inputElement } }));
  console.log("showPopover:", inputElement.id);

  const css = `
#custom-popover {
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 10px;
  z-index: 1000;
}
#popover-textarea {
  width: 100%;
  height: 50px;
  border: none;
  outline: none;
  resize: none;
}
`;

  // Create a style element and append the CSS
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);

  const popover = document.createElement('div');
  popover.id = 'custom-popover';
  popover.innerHTML = '<div id="popover-textarea"></div>';
  document.body.appendChild(popover);

  const rect = inputElement.getBoundingClientRect();
  popover.style.position = 'absolute';
  popover.style.left = `${rect.left}px`;
  popover.style.top = `${rect.bottom + window.scrollY}px`;

  // Adjust position if popover is off-screen
  const popoverRect = popover.getBoundingClientRect();
  if (popoverRect.right > window.innerWidth) {
    popover.style.left = `${window.innerWidth - popoverRect.width}px`;
  }
  if (popoverRect.bottom > window.innerHeight) {
    popover.style.top = `${rect.top + window.scrollY - popoverRect.height}px`;
  }

  const textarea = document.getElementById('popover-textarea');
  textarea.value = inputContext//await getRecommendation(inputElement);      
  // Send a message to the extension
  chrome.runtime.sendMessage({ action: 'INPUT_ENTERED', value: textarea.value }, function (response) {
    inputElement.value += response.status;
    console.log('Response from page', response);
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'INPUT_ENTERED') {
      // if (message.action === 'tabPressed') {
      console.log('Tab was pressed received by page:', message.value);
      // Handle the message 
      sendResponse({ status: 'received from content.js' });
    }
  });

  textarea.addEventListener('keydown', function (event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      inputElement.value += textarea.value;
      document.body.removeChild(popover);
    }
  });
}


// showPopover();
console.log("content script loaded")
