import { Application } from 'express';
import path from 'path';
import fs from 'fs-extra';
import md5 from 'md5';
import OnDemandDependency from './OnDemandDependency';

export const onDemandCacheLocation = path.join(__dirname, './.on-demand-cache');

interface OnDemandServer {
  (app: Application): void;
  registerDependency(dep: string): string;
}

export default function server() {
  const dependencies: { [hash: string]: OnDemandDependency } = {};
  let writing: Promise<void> | null = null;

  function fixFileTimes(path: string): void {
    const now = Date.now() / 1000;
    const then = now - 20;
    fs.utimesSync(path, then, then);
  }

  // function writeMapFile(hash: string, incremental = false): void {
  //   const contents = contexts[hash].getMapFile();
  //   const mapPath = path.join(onDemandCacheLocation, `${hash}-map.js`);
  //   if (incremental) {
  //     if (writing) {
  //       writing.then(() => writeMapFile(hash, incremental));
  //       return;
  //     }
  //     writing = new Promise(resolve => {
  //       const stream = fs.createWriteStream(mapPath, { flags: 'w', encoding: 'utf8' });
  //       stream.end(contents, 'utf8', resolve);
  //     });
  //
  //     writing.then(() => {
  //       writing = null;
  //     });
  //   } else {
  //     fs.writeFileSync(mapPath, contents, {
  //       encoding: 'utf8',
  //     });
  //     fixFileTimes(mapPath);
  //   }
  // }

  // function writeContextFile(hash: string): void {
  //   const template = fs.readFileSync(path.join(__dirname, '../template/on-demand-context.js'), {
  //     encoding: 'utf8',
  //   });
  //   const mapFilePath = JSON.stringify(path.resolve(onDemandCacheLocation, hash + '-map'));
  //   const contextPath = path.join(onDemandCacheLocation, `${hash}.js`);
  //   fs.writeFileSync(
  //     contextPath,
  //     template.replace(/CONTEXT_HASH/g, hash).replace(/CONTEXT_MAP_FILE/g, mapFilePath),
  //     {
  //       encoding: 'utf8',
  //     },
  //   );
  //   fixFileTimes(contextPath);
  // }

  function writeModFile(hash: string, incremental = false) {
    const contents = dependencies[hash].getContents();
    const modPath = path.resolve(onDemandCacheLocation, hash + '-mod.js');

    if (incremental) {
      if (writing) {
        writing.then(() => writeModFile(hash, incremental));
        return;
      }
      writing = new Promise(resolve => {
        const stream = fs.createWriteStream(modPath, { flags: 'w', encoding: 'utf8' });
        stream.end(contents, 'utf8', resolve);
      });

      writing.then(() => {
        writing = null;
      });
    } else {
      fs.writeFileSync(modPath, contents, {
        encoding: 'utf8',
      });
      fixFileTimes(modPath);
    }
  }

  function writeDepFile(hash: string): void {
    const template = fs.readFileSync(path.join(__dirname, '../template/on-demand-module.js'), {
      encoding: 'utf8',
    });
    const modFilePath = JSON.stringify(path.resolve(onDemandCacheLocation, hash + '-mod'));
    const contextPath = path.join(onDemandCacheLocation, `${hash}.js`);
    fs.writeFileSync(
      contextPath,
      template.replace(/MOD_HASH/g, hash).replace(/MOD_FILE/g, modFilePath),
      {
        encoding: 'utf8',
      },
    );
    fixFileTimes(contextPath);
  }

  const install = <OnDemandServer>function(app: Application) {
    fs.emptyDirSync(onDemandCacheLocation);

    app.get('/webpack-on-demand/:hash', (req, res) => {
      if (!dependencies[req.params.hash]) {
        res.status(500).send(`could not find dependency with hash ${req.params.hash}`);
        return;
      }

      if (dependencies[req.params.hash].load()) {
        writeModFile(req.params.hash, true);
      }

      res.sendStatus(204);
      return;
    });
  };

  install.registerDependency = (dep: string) => {
    const modHash = md5(dep);

    if (!dependencies[modHash]) {
      dependencies[modHash] = new OnDemandDependency(dep);
    }

    writeDepFile(modHash);
    writeModFile(modHash);

    return modHash;
  };

  return install;
}
