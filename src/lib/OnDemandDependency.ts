export default class OnDemandDependency {
  public dependency: string;
  private defer: boolean = true;

  constructor(dep: string) {
    this.dependency = dep;
  }

  getContents() {
    return `module.exports = ${
      this.defer ? 'null' : `require(${JSON.stringify(this.dependency)})`
    };\n`;
  }

  public load(): boolean {
    if (this.defer) {
      this.defer = false;
      return true;
    }
    return false;
  }
}
