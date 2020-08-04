chrome.runtime.onInstalled.addListener(function() {
  // When the app gets installed, set up the context menus
  chrome.contextMenus.create({
    title: 'in Atom',
    id: 'atom',
    documentUrlPatterns: [ "http://localhost/*"],
    contexts: ['all'],
  });
  chrome.contextMenus.create({
    title: 'in VSCode',
    id: 'vscode',
    documentUrlPatterns: [ "http://localhost/*"],
    contexts: ['all'],
  });
});

let send_message = async (id, message) => {
  return await new Promise((yell) => {
    chrome.tabs.sendMessage(id, message, (result) => yell(result));
  })
}

let create_tab = async (options) => {
  return await new Promise((yell) => {
    chrome.tabs.create(options, (atom_tab) => {
      yell(atom_tab);
    });
  });
}

let delay = async (timeout) => {
  return await new Promise((yell) => {
    setTimeout(() => {
      yell();
    }, timeout);
  })
}

let get_url = ({ editor, source }) => {
  let { file, line } = source;

  if (editor === 'vscode') {
    return `vscode://file/${file}:${line}`;
  } else {
    return `atom://core/open/file?filename=${file}&line=${line}`;
  }
}

chrome.contextMenus.onClicked.addListener(async (itemData, tab) => {
  let debugSource = await send_message(tab.id, 'getDebugSource');
  let link = get_url({ editor: itemData.menuItemId, source: debugSource });

  let atom_tab = await create_tab({
    url: link,
    active: false,
  });

  // let atom_tab = await create_tab({
  //   url: link,
  //   active: true,
  // });

  // window.open(link)


  // await delay(500);

  chrome.tabs.remove(atom_tab.id);
});
