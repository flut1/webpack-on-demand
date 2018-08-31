import { Application } from 'express';
import path from 'path';
import fs from 'fs-extra';
import md5 from 'md5';
import { ContextOptions } from './contextOptions';
import { OnDemandContext } from './context';

export const onDemandCacheLocation = path.join(__dirname, './.on-demand-cache');

interface OnDemandServer {
  (app: Application): void;
  registerContext(options: ContextOptions, moduleContext: string): string;
}

export default function server(): OnDemandServer {
  const contexts: { [hash: string]: OnDemandContext } = {};
  let writing: Promise<void> | null = null;

  function fixFileTimes(path: string): void {
    const now = Date.now() / 1000;
    const then = now - 20;
    fs.utimesSync(path, then, then);
  }

  function writeMapFile(hash: string, incremental = false): void {
    const contents = contexts[hash].getMapFile();
    const mapPath = path.join(onDemandCacheLocation, `${hash}-map.js`);
    if (incremental) {
      if (writing) {
        writing.then(() => writeMapFile(hash, incremental));
        return;
      }
      writing = new Promise(resolve => {
        const stream = fs.createWriteStream(mapPath, { flags: 'w', encoding: 'utf8' });
        stream.end(contents, 'utf8', resolve);
      });

      writing.then(() => {
        writing = null;
      });
    } else {
      fs.writeFileSync(mapPath, contents, {
        encoding: 'utf8',
      });
      fixFileTimes(mapPath);
    }
  }

  function writeContextFile(hash: string): void {
    const template = fs.readFileSync(path.join(__dirname, '../template/on-demand-context.js'), {
      encoding: 'utf8',
    });
    const mapFilePath = JSON.stringify(path.resolve(onDemandCacheLocation, hash + '-map'));
    const contextPath = path.join(onDemandCacheLocation, `${hash}.js`);
    fs.writeFileSync(
      contextPath,
      template.replace(/CONTEXT_HASH/g, hash).replace(/CONTEXT_MAP_FILE/g, mapFilePath),
      {
        encoding: 'utf8',
      },
    );
    fixFileTimes(contextPath);
  }

  const install = <OnDemandServer>function(app: Application) {
    fs.emptyDirSync(onDemandCacheLocation);

    app.get('/webpack-on-demand/:hash', (req, res) => {
      if (req.query && req.query.file) {
        if (!contexts[req.params.hash]) {
          res.status(500).send('could not find context');
          return;
        }
        if (contexts[req.params.hash].loadFile(req.query.file)) {
          writeMapFile(req.params.hash, true);
        }
        res.sendStatus(204);
        return;
      }
      res.status(500).send('no file');
    });
  };

  install.registerContext = (options: ContextOptions) => {
    const argsHash = md5(options.cacheKey);

    if (!contexts[argsHash]) {
      contexts[argsHash] = new OnDemandContext(options);
    }

    writeContextFile(argsHash);
    writeMapFile(argsHash);

    return argsHash;
  };

  return install;
}
