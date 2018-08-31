import glob from 'glob';
import path from 'path';
import { ContextOptions } from './contextOptions';

export class OnDemandContext {
  public options: ContextOptions;
  public files: Array<string>;
  public loadedFiles: Set<string> = new Set();

  constructor(options: ContextOptions) {
    this.options = options;

    this.files = glob.sync(this.options.glob, { cwd: options.context }).map(file => `./${file}`);
  }

  public loadFile(filename: string): boolean {
    if (this.loadedFiles.has(filename)) {
      return false;
    }
    if (this.files.includes(filename)) {
      this.loadedFiles.add(filename);
      return true;
    }
    return false;
  }

  public getMapFile(): string {
    let output = `const map = {`;

    this.files.forEach(filename => {
      const fullPath = path.resolve(this.options.context, filename);
      const module = this.loadedFiles.has(filename)
        ? `require(${JSON.stringify(fullPath)})`
        : 'null';
      output += `\n  '${filename}': ${module},`;
    });

    output =
      output.substring(0, output.length - 1) +
      '\n};\n\nexport default function getMap() { return map; };\n';
    return output;
  }
}
