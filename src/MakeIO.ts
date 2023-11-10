import fs from 'fs';
import readline from 'readline';
import { InputIO, StdInputIO, OutputIO, IOTriple } from './types.js';

export function MakeOutputIO(file: string | undefined): OutputIO {
  if (!file) {
    const res = (line: string) =>
      new Promise<void>((resolve) =>
        process.stdout.write(line, () => resolve()),
      );
    res.close = () => Promise.resolve();
    return res;
  } else {
    const out = fs.createWriteStream(file);
    const res = (line: string) =>
      new Promise<void>((resolve) => out.write(line, () => resolve()));
    res.close = () =>
      new Promise<void>((resolve) => {
        out.on('close', resolve);
        out.close();
      });
    return res;
  }
}

export function MakeInputIO(inVal: string | undefined): InputIO {
  if (!inVal) {
    const res: StdInputIO = process.stdin as StdInputIO;
    res.close = () => {};
    return res;
  } else {
    return fs.createReadStream(inVal);
  }
}

export function MakeIO(
  inPath: string | undefined,
  outPath: string | undefined,
): IOTriple {
  const input = MakeInputIO(inPath);
  const rl = readline.createInterface({ input, terminal: false });
  const output = MakeOutputIO(outPath);
  return { rl, output, input };
}
