import { Compiler, Plugin } from 'webpack';
import ParserHelpers from 'webpack/lib/ParserHelpers';
import serverBootstrap from './server';
import { getContextOptions } from './contextOptions';
import { CONTEXT_FUNC_NAME, PLUGIN_NAME } from './constants';

// @ts-ignore
function superConsole(...args: Array<any>) {
  for (let i = 0; i < 10; i++) {
    console.log('');
  }
  console.log(...args);
  for (let i = 0; i < 10; i++) {
    console.log('');
  }
}

class WebpackOnDemandPlugin implements Plugin {
  public serverBootstrap: ReturnType<typeof serverBootstrap>;

  constructor() {
    this.serverBootstrap = serverBootstrap();
  }

  public apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (_compilation, { normalModuleFactory }) => {
      const handler = (parser: any) => {
        parser.hooks.call.for(CONTEXT_FUNC_NAME).tap(PLUGIN_NAME, (expression: any) => {
          const options = getContextOptions(expression.arguments, parser.state.module.context);
          const argsHash = this.serverBootstrap.registerContext(
            options,
            parser.state.module.context,
          );

          return ParserHelpers.addParsedVariableToModule(
            parser,
            CONTEXT_FUNC_NAME,
            `require("webpack-on-demand/lib/.on-demand-cache/${argsHash}").default`,
          );
        });
      };

      normalModuleFactory.hooks.parser.for('javascript/auto').tap(PLUGIN_NAME, handler);
      normalModuleFactory.hooks.parser.for('javascript/dynamic').tap(PLUGIN_NAME, handler);
      normalModuleFactory.hooks.parser.for('javascript/esm').tap(PLUGIN_NAME, handler);
    });
  }
}

export default WebpackOnDemandPlugin;
