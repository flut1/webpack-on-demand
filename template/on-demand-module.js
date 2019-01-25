let currentModule = require(MOD_FILE);

let requested = false;
let resolved = false;
let loaderResolver;

let modPromise = new Promise(function(resolve) {
  loaderResolver = resolve;
});

function processDependency() {
  if (currentModule !== null && !resolved) {
    resolved = true;
    loaderResolver(
      typeof currentModule.default !== 'undefined' ? currentModule.default : currentModule,
    );
  }
}

function loader() {
  if (!requested && !resolved) {
    fetch('/webpack-on-demand/MOD_HASH');
    requested = true;
  }

  return modPromise;
}

processDependency();

if (module.hot) {
  module.hot.accept(MOD_FILE, function() {
    currentModule = require(MOD_FILE);
    processDependency();
  });
}

export default loader;
