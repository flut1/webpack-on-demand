import getMap from CONTEXT_MAP_FILE;

let currentMap = getMap();
const contextKeys = Object.keys(currentMap);
const contextEntries = {};

contextKeys.forEach(function(filename) {
  const entry = {};
  const promise = new Promise(function(resolve) {
    entry.resolve = resolve;
    entry.resolved = false;
    entry.requested = false;
  });
  entry.promise = promise;
  contextEntries[filename] = entry;
});

function processMap() {
  Object.keys(currentMap).forEach(function(filename) {
    if (currentMap[filename]) {
      if (!contextEntries[filename].resolved) {
        contextEntries[filename].resolve(currentMap[filename]);
        contextEntries[filename].resolved = true;
      }
    }
  });
}

function context() {
  const func = function(file) {
    if (contextKeys.indexOf(file) < 0) {
      return Promise.reject(new Error('Cannot find module "' + file + '"'));
    }

    if (!contextEntries[file].requested && !contextEntries[file].resolved) {
      fetch('/webpack-on-demand/CONTEXT_HASH?file='+encodeURIComponent(file));
      contextEntries[file].requested = true;
    }

    return contextEntries[file].promise;
  };

  func.keys = function() {
    return contextKeys;
  };

  return func;
}

processMap();

if (module.hot) {
  module.hot.accept(CONTEXT_MAP_FILE, function() {
    currentMap = getMap();
    processMap();
  });
}

export default context;
