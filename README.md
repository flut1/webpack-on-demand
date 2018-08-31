# Webpack on Demand

> **IMPORTANT:** This is a dirty hack. Please wash hands after usage.
Please do not expect it to work without issues


## Installation

> The current version breaks on production because the on-demand stuff
is always enabled. Will add automatic disable of the on-demand
functionality soon-ish

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

 - Add the plugin to the webpack
   ```
   plugins: [
     wodPluginInstance,
     // only add HMR plugin if you're not already using the --hot CLI flag
     new webpack.HotModuleReplacementPlugin()
   ],
   ```

 - Disable `splitChunks`:
   ```
   optimization: {
     ...
     splitChunks: false
   },
   ```

 - Pass the plugin server bootstrap to the `before` option of `devServer`
   ```
   devServer: {
      ...
      before: wodPluginInstance.serverBootstrap
   },
   ```

# Usage instructions

First you need to create a context with the files to load. This is similar
to how you would use `require.context`.

```
const componentsContext = onDemandContext('components/*/index.js');
```

Please note that the argument passed to this is a glob pattern that will
be passed to [node-glob](https://github.com/isaacs/node-glob). This means
that it is not possible to use things like webpack aliases or loaders
here. You will also need to account for the `.js` file extension

You can get a list of all paths found in the context by calling the
`.keys()` function, similar to how `require.context` works:

```
const listOfModules = componentsContext.keys();
```

If you want to use a module, pass the path of the module to the context
created by `onDemandContext`. It will return a promise that resolves
with the module once it is compiled.

```
componentsContext('./components/NavBar/index.js').then((IndexComponent) => {
  // use IndexComponent
});
```
