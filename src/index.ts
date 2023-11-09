import { MakeLog } from '@freik/logger';
import { isNumber } from '@freik/typechk';
import fs from 'fs';
import readline from 'readline';
import { ProcessFile } from './processor.js';
import { InitializeSymbolTable, SymbolTable } from './symbols.js';
import { CmdLine } from './types.js';

const { log, err } = MakeLog('index');

function Usage(name: string) {
  console.log(
    `Usage: ${name} [-I <include>] [-I<include>] [-D <define>] [-D<define>=<val>] [-o <outfile>] <infile>`,
  );
}
function parseArgs(args: string[]): CmdLine | number {
  const res: CmdLine = {
    includes: [],
    defines: [],
    input: undefined,
    output: undefined,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    let val = '';
    if (arg === '-?' || arg === '-h' || arg === '--help') {
      return 0;
    }
    if (arg.startsWith('-I') || arg.startsWith('-D')) {
      if (arg.length === 2) {
        if (i === args.length - 1) {
          err(`Missing argument after ${arg}`);
          return -1;
        }
        val = args[++i];
      } else {
        val = arg.substring(2);
      }
      const vec = arg[1] === 'I' ? res.includes : res.defines;
      vec.push(val);
    } else if (arg === '-o') {
      if (i === args.length - 1) {
        err(`Missing argument after -o`);
        return -2;
      }
      res.output = args[++i];
    } else if (res.input !== undefined) {
      err(`Unexpected extra input file ${arg}`);
      return -3;
    } else {
      res.input = arg;
    }
  }
  return res;
}

async function makeWriter(
  file: string | undefined,
): Promise<(arg: string) => void> {
  if (file === undefined) {
    return (line: string) => process.stdout.write(line);
  } else {
    const out = fs.createWriteStream(file);
    return (line: string) => out.write(line);
  }
}

async function invoke(cmdLine: CmdLine): Promise<void> {
  // Create the read & write streams
  const rl = readline.createInterface({
    input:
      cmdLine.input === undefined
        ? process.stdin
        : fs.createReadStream(cmdLine.input),
    terminal: false,
  });
  const output = await makeWriter(cmdLine.output);

  // Create the symbol table
  const syms: SymbolTable = InitializeSymbolTable(cmdLine.defines);
  await ProcessFile(syms, rl, output);
}

export function Main(args: string[]): void {
  const cmdLine = parseArgs(args);
  if (cmdLine === 0) {
    Usage('yarn run cpp-lite');
    return;
  } else if (isNumber(cmdLine)) {
    err(`Error parsing command line: ${cmdLine}`);
    return;
  } else {
    invoke(cmdLine).catch(err);
  }
}
