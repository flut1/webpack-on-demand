import { Plugin } from 'webpack';
import serverBootstrap from './server';
import md5 from 'md5';
import path from 'path';
import fs from 'fs-extra';
import { ON_DEMAND_CACHE_LOCATION, PLUGIN_NAME } from './constants';

class WebpackOnDemandPlugin implements Plugin {
  private _serverBootstrap: ReturnType<typeof serverBootstrap>;
  private enabled: boolean = false;
  private promiseWrapperCreated = new Set();

  constructor() {
    this._serverBootstrap = serverBootstrap();
  }

  public get serverBootstrap(): ReturnType<typeof serverBootstrap> {
    this.enabled = true;
    return this._serverBootstrap;
  }

  private createWrapper(modulePath: string) {
    const modHash = md5(modulePath);

    if (this.promiseWrapperCreated.has(modHash)) {
      return modHash;
    }

    const wrapperContents = [
      `var mod = require(${JSON.stringify(modulePath)});`,
      'module.exports = function() {',
      "  return Promise.resolve(typeof mod.default !== 'undefined' ? mod.default : mod);",
      '};',
    ].join('\n');
    const wrapperFilePath = path.join(ON_DEMAND_CACHE_LOCATION, `${modHash}-wrapper.js`);
    fs.writeFileSync(wrapperFilePath, wrapperContents, {
      encoding: 'utf8',
    });

    this.promiseWrapperCreated.add(modHash);
    return modHash;
  }

  public apply(resolver: any) {
    if (!this.enabled) {
      console.log('\nWebpackOnDemandPlugin is disabled because serverBootstrap was not attached\n');
    }
    const resolveHook = resolver.ensureHook('resolve');

    resolver
      .getHook('existing-file')
      .tapAsync(PLUGIN_NAME, (request: any, resolveContext: any, callback: () => void) => {
        if (request && request.query && request.query.includes('on-demand')) {
          let newRequest;
          if (this.enabled) {
            const modHash = this._serverBootstrap!.registerDependency(request.path);

            newRequest = Object.assign({}, request, {
              request: `webpack-on-demand/lib/.on-demand-cache/${modHash}`,
              query: '',
            });
          } else {
            const modHash = this.createWrapper(request.path);
            newRequest = Object.assign({}, request, {
              request: `webpack-on-demand/lib/.on-demand-cache/${modHash}-wrapper`,
              query: '',
            });
          }

          console.log(newRequest.request);

          return resolver.doResolve(
            resolveHook,
            newRequest,
            `resolve ${newRequest.request}`,
            callback,
          );
        }

        callback();
      });
  }
}

export default WebpackOnDemandPlugin;
