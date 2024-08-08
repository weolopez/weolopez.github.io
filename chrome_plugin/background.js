// https://developer.chrome.com/docs/extensions/reference/api/windows#type-CreateType
// background.js



chrome.runtime.onInstalled.addListener(() => {

  // chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // changeInfo object: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated#changeInfo
    // status is more reliable (in my case)
    // use "alert(JSON.stringify(changeInfo))" to check what's available and works in your case
  //   if (changeInfo.status === 'complete') {
  //     chrome.tabs.sendMessage(tabId, {
  //       message: 'TabUpdated'
  //     });
  //   }
  // }) 

  // function showSidePanel(selectedText, id) {
  //   chrome.storage.session.set({ selectedText:  selectedText}).then(() => {
  //     console.log("Value was set");
  //   });
  //   // let tab = getCurrentTab();
  //   chrome.sidePanel.open({ tabId: id });
  // }
  // async function getCurrentTab() {
  //   let queryOptions = { active: true, lastFocusedWindow: true };
  //   // `tab` will either be a `tabs.Tab` instance or `undefined`.
  //   let [tab] = await chrome.tabs.query(queryOptions);
  //   return tab;
  // }

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  chrome.commands.onCommand.addListener((command) => {
    console.error(`Command: ${command}`);
    chrome.sidePanel.open({});
  });


  var contextMenuItem = {
    "id": "aiContextMenu",
    "title": "AI v2",
    "contexts": ["all"]
  
      // });
  };

  chrome.contextMenus.create(contextMenuItem);

  chrome.contextMenus.create({
    title: "Summarize",
    parentId: "aiContextMenu",
    id: "summarize",
    contexts: ["all"]
  });

  chrome.contextMenus.create({
    id: "showSelectedText",
    title: "Query",
    parentId: "aiContextMenu",
    contexts: ["all"]
  });

  chrome.contextMenus.create({
    id: "setContext",
    title: "Set Context",
    parentId: "aiContextMenu",
    contexts: ["all"]
  });

});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  var selectedText = (info.selectionText === undefined) ? "What are some topics we can talk about?" : info.selectionText;
   
  if (info.menuItemId === "summarize") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showDialog,
      args: [info.selectionText]
    });
  }
  if (info.menuItemId === "showSelectedText") {
    chrome.windows.create({
      url: "http://localhost:8080/GenContext?text=" + selectedText,
      type: "popup",
      width: 900,
      height: 600
    });
  }
  if (info.menuItemId === "setContext") {
    chrome.storage.session.set({ selectedText:  selectedText}).then(() => {
      console.log("Value was set");
    });
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

function showDialog(selectedText) {
  const dialog = document.createElement('dialog');
  question = "Summarize: " + selectedText;
  fetch("http://localhost:8080/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: question,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // create element of type pre and add data.Response to it
      dialog.innerHTML = "<pre>" + data.Response + "</pre>";

      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('click', () => {
        dialog.close();
        dialog.remove();
      });
      //toggle details open
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

