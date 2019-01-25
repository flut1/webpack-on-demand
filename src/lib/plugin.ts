import { Plugin } from 'webpack';
import serverBootstrap from './server';
import md5 from 'md5';
import path from 'path';
import fs from 'fs-extra';
import { ON_DEMAND_CACHE_LOCATION, PLUGIN_NAME } from './constants';

class WebpackOnDemandPlugin implements Plugin {
  public serverBootstrap: ReturnType<typeof serverBootstrap>;
  private enabled: boolean = false;
  private promiseWrapperCreated = new Set();

  constructor() {
    this.serverBootstrap = serverBootstrap(() => {
      this.enabled = true;
    });
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
    const resolveHook = resolver.ensureHook('resolve');

    resolver
      .getHook('existing-file')
      .tapAsync(PLUGIN_NAME, (request: any, resolveContext: any, callback: () => void) => {
        if (request && request.query && request.query.includes('on-demand')) {
          let newRequest;
          if (this.enabled) {
            const modHash = this.serverBootstrap.registerDependency(request.path);

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
