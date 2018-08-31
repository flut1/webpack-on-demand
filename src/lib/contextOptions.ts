import { CONTEXT_FUNC_NAME } from './constants';

interface AcornSourceLocation {
  start: any;
  end: any;
}

interface AcornNodeRegex {
  pattern: string;
  flags: string;
}

interface AcornNode {
  type: string;
  start: number;
  end: number;
  loc: AcornSourceLocation;
  range: [number, number];
  value: unknown;
  raw: string;
  regex?: AcornNodeRegex;
}

export interface ContextOptions {
  glob: string;
  context: string;
  cacheKey: string;
}

export function getContextOptions(args: Array<AcornNode>, context: string): ContextOptions {
  const options: ContextOptions = {
    context,
    glob: '',
    cacheKey: context,
  };

  if (args[0].type !== 'Literal' || typeof args[0].value !== 'string') {
    throw new Error(
      `Expected argument 0 of ${CONTEXT_FUNC_NAME} to be a string literal. Instead got "${
        args[0].raw
      }"`,
    );
  }
  options.glob = <string>args[0].value;
  options.cacheKey += options.glob;

  return options;
}
