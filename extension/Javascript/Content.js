// Insert requestFullScreen mock
const code_to_insert_in_page = `{
  // This is code inserted by the React Source Locator extension
  // I need this code in the actual page, and I can do that by inserting a script tag.
  // So I don't work inside the extension model perfectly, hehe

  document.addEventListener(
    'mousedown',
    (event) => {
      // Right click
      if (event.button == 2) {
        let debugInfo = get_debugInfo(event.target)
        if (debugInfo != null) {
          window.postMessage({
            type: 'REACT_SOURCE_CONTEXTMENU',
            debugInfo: debugInfo,
          }, '*');
        }
      }
    },
    true
  );

  let get_debugInfo = (element) => {
    let reactInternalInstanceEntry = Object.entries(element).find(x => x[0].startsWith('__reactInternalInstance'));
    if (reactInternalInstanceEntry == null) {
      return;
      // throw new Error('No __reactInternalInstance found on element');
    }

    let debug_instance = reactInternalInstanceEntry[1];
    while (debug_instance._debugSource == null) {
      // Not sure if this ever happens, but I don't want someones computer to
      // freeze because I was lazy
      if (debug_instance === debug_instance._debugSource) {
        throw new Error('I was thinking something like this could be the case: debug_instance === debug_instance._debugSource');
      }
      debug_instance = debug_instance._debugOwner;
      if (debug_instance == null) {
        throw new Error('All the way to the top of the debugOwner chain, no source found anywhere');
      }
    }

    let source = debug_instance._debugSource
    return {
      file: source.fileName,
      line: source.lineNumber,
    }
  }
}`;

let elt = document.createElement('script');
elt.innerHTML = code_to_insert_in_page;
document.documentElement.appendChild(elt);
document.documentElement.removeChild(elt);

// console.log('Runs in proper sandbox:', document.documentElement.constructor === HTMLHtmlElement);
// NOTE On chrome, extensions run in a proper sandbox (above will log true),
// meaning that you can't get access to the actual prototype-s of the Document and Elements-s,
// hence the need for the ugly script insert above.
// On Firefox however, this is not the case, and I might (because firefox screws me with CSP)
// need to use this quirk to work on all pages

let send_chrome_message = (message) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, () => {
      resolve();
    });
  });
};

let debugInfo = null;

window.addEventListener('message', async (event) => {
  // We only accept messages from ourselves
  if (event.source != window) return;

  // Going INTO fullscreen
  if (event.data.type && event.data.type == 'REACT_SOURCE_CONTEXTMENU') {
    debugInfo = event.data.debugInfo;
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request == 'getDebugSource') {
    if (debugInfo == null) {
      console.warn(`React Source Locator: Couldn't find the source of the element you clicked.. I'm sorry`);
      // I guess I leave the promise on the other side hanging.. not sure if chrome cleans this up
    } else {
      sendResponse(debugInfo);
      debugInfo = null;
    }
  }
});
