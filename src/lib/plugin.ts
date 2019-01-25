import { Plugin } from 'webpack';
import serverBootstrap from './server';
import { PLUGIN_NAME } from './constants';

class WebpackOnDemandPlugin implements Plugin {
  private _serverBootstrap: ReturnType<typeof serverBootstrap>;
  private enabled: boolean = false;

  constructor() {
    this._serverBootstrap = serverBootstrap();
  }

  public get serverBootstrap(): ReturnType<typeof serverBootstrap> {
    this.enabled = true;
    return this._serverBootstrap;
  }

  public apply(resolver: any) {
    if (!this.enabled) {
      console.log('WebpackOnDemandPlugin is disabled because serverBootstrap was not attached');
      return;
    }
    const resolveHook = resolver.ensureHook('resolve');

    resolver
      .getHook('existing-file')
      .tapAsync(PLUGIN_NAME, (request: any, resolveContext: any, callback: () => void) => {
        if (request && request.query && request.query.includes('on-demand')) {
          const modHash = this.serverBootstrap!.registerDependency(request.path);

          const newRequest = Object.assign({}, request, {
            request: `webpack-on-demand/lib/.on-demand-cache/${modHash}`,
            query: '',
          });

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
