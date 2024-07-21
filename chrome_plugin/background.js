// https://developer.chrome.com/docs/extensions/reference/api/windows#type-CreateType
// background.js



chrome.runtime.onInstalled.addListener(() => {

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  chrome.commands.onCommand.addListener((command) => {
    console.error(`Command: ${command}`);
    // chrome.sidePanel.open({});
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
   
  if (info.menuItemId === "summarize") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showDialog,
      args: [info.selectionText]
    });
  }
  if (info.menuItemId === "showSelectedText") {
    chrome.windows.create({
      url: "http://localhost:8080/GenContext?text=" + info.selectionText,
      type: "popup",
      width: 900,
      height: 600
    });
  }
  if (info.menuItemId === "setContext") {
    chrome.storage.session.set({ selectedText: info.selectionText }).then(() => {
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
