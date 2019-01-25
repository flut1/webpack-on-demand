# Webpack on Demand

## Motivation

This is an experimental webpack plugin that enables you to only compile
modules once they are requested by the browser. This may be useful
for the development server on large projects, as it is likely developers are
only working on a small section of the application at any time.

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
   
## Demo
See: https://github.com/flut1/webpack-on-demand-demo

## Usage instructions

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

## How does it work? 
The on-demand compilation is triggered by (ab)using the HMR functionality in webpack.
Here is a short rundown:

 - Requests with an `?on-demand` query are picked up by the plugin
 - The plugin resolves this request to a `{hash}.js` file that is created on-the-fly inside this node module
 - The `{hash}.js` file:
   - requires another file, `{hash}-mod.js`, which is also created on-the-fly
   - accepts HMR updates for `{hash}-mod.js`
   - exports a function that returns a promise
 - Initially, `{hash}-mod.js` simply exports `null`
 - Once you call the function exported from `{hash}.js`, a call goes out to `webpack-dev-server`
 - The dev server responds to this call by overwriting the contents of `{hash}-mod.js`, with a `require` 
 statement to the module you are trying to load
 - This triggers an incremental webpack compile
 - `{hash}.js` accepts the HMR update from `{hash}-mod.js`, and resolves the promise with the new module
 


