# Webpack on Demand

## Motivation

This is an experimental webpack plugin that enables you to only compile
modules once they are requested by the browser. This may be useful
for development on large projects, as it is likely developers are only
working on a small section of the application at any time.

> **IMPORTANT:** This is an experimental and somewhat hacky plugin.
Please do not expect it to work without issues

## Installation
Install the package

```
yarn add --dev webpack-on-demand
OR
npm install --save-dev webpack-on-demand
```

In `webpack.config.js`:

 - Create an instance of the plugin

   ```
   const WebpackOnDemand = require('webpack-on-demand').default;

   const wodPluginInstance = new WebpackOnDemand();
   ```

 - Enable Hot Module Reloading for your dev server

 - Add the plugin to the webpack **resolve config**
   ```
   resolve: {
     plugins: [
       wodPluginInstance
     ],
   }
   ```

 - Pass the plugin server bootstrap to the `before` option of `devServer`
   ```
   devServer: {
      ...
      before: wodPluginInstance.serverBootstrap
   },
   ```

# Usage instructions

Add the `?on-demand` query string to an import statement. This will wrap
the import in a callback that returns a Promise.

```
// before
import HomePage from './components/HomePage';

const HomePage = new HomePage();

// after
import getHomePage from './components/HomePage?on-demand';

getHomePage().then(HomePage => {
  const HomePage = new HomePage();
});
```

The module will only be compiled once the callback function (in the
above example `getHomePage()`) is called. If you're not using the
development server but a regular build, the import will compile
normally but it will still be wrapped in a callback for consistency.

Note: if the same module is imported elsewhere without the ?on-demand
query string, it will still compile immediately.
