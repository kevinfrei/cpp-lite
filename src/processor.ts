import { MakeLog } from '@freik/logger';
import fs from 'fs';
import readline from 'readline';
import { ConsumeDefine, HandleDefine, HandleUndef } from './define.js';
import {
  IsTrueState,
  NormalState,
  ParseState,
  StartState,
  StateElifdef,
  StateElse,
  StateEndif,
  StateError,
  StateIfdef,
} from './parsestate.js';
import { Rgx } from './regexes.js';
import { SymTable } from './symbols.js';
import { OutputIO } from './types.js';

const { err } = MakeLog('processor');

async function OutputString(
  st: SymTable,
  output: OutputIO,
  line: string,
): Promise<void> {
  let remaining = line;
  do {
    let match = remaining.match(Rgx.nextToken);
    if (match !== null) {
      const initSpace = match[1];
      let token: string | undefined = match[2];
      remaining = match[3];
      if (st.IsSymbol(token)) {
        token = st.ExpandSymbol(token);
      } else if (st.IsMacro(token)) {
        // TODO: Not ready for this yet :/
        // I think I want a nested Symbol Table :o
        // Parse the arguments, and then output the macro body with the extra symbols added
        token = st.ExpandMacro(token, []);
      }
      await output(initSpace + (token || ''));
    } else {
      // Consume non-token item
      match = remaining.match(Rgx.nextStart);
      if (match === null) {
        // Trailling spaces, probably...
        await output(remaining);
        remaining = '';
      } else {
        await output(match[1]);
        remaining = match[2];
      }
    }
  } while (remaining.length > 0);
  await output('\n');
}

async function NormalContext(
  st: NormalState,
  line: string,
  output: OutputIO,
): Promise<ParseState> {
  const rgx = line.match(Rgx.directive);
  if (rgx !== null) {
    const directive = rgx[1];
    switch (directive) {
      case 'define':
        return HandleDefine(st, rgx[2]);
      case 'undef':
        return HandleUndef(st, rgx[2]);
      case 'ifdef':
        return StateIfdef(st, st.table.IsDefined(rgx[2].trim()));
      case 'ifndef':
        return StateIfdef(st, !st.table.IsDefined(rgx[2].trim()));
      case 'else':
        return StateElse(st);
      case 'endif':
        return StateEndif(st);
      case 'elifdef':
        return StateElifdef(st, st.table.IsDefined(rgx[2].trim()));
      case 'elifndef':
        return StateElifdef(st, !st.table.IsDefined(rgx[2].trim()));
      case 'include':
        if (IsTrueState(st)) {
          return await IncludeFile(st, rgx[2], output);
        }
        break;
      default:
        await output(`#${directive} not recognized`);
        break;
    }
  } else if (IsTrueState(st)) {
    // If we're in a "true" state, output the line
    await OutputString(st.table, output, line);
  }
  return st;
}

async function IncludeFile(
  st: NormalState,
  fileBlob: string,
  output: OutputIO,
): Promise<ParseState> {
  const fileMatch = fileBlob.match(Rgx.includePath);
  if (fileMatch === null) {
    return StateError(st, `#include requires a quoted filename`);
  }
  const filename = fileMatch[1];
  // TODO: check include paths for the include file
  const ifDepth = st.conditions.length;
  const reader = readline.createInterface({
    input: fs.createReadStream(filename),
  });
  const res = await ReadFile(reader, st, output);
  if (ifDepth !== res.conditions.length) {
    throw new Error(
      `#include "${filename}" doesn't have balanced #if/#endif's (${ifDepth} vs ${res.conditions.length})`,
    );
  }
  return res;
}

async function ReadFile(
  input: readline.Interface,
  parseState: ParseState,
  output: OutputIO,
): Promise<ParseState> {
  for await (const line of input) {
    switch (parseState.state) {
      case 'normal':
        parseState = await NormalContext(parseState, line, output);
        break;
      case 'define':
        parseState = ConsumeDefine(parseState, line);
        break;
      case 'error':
        err('Parse error: ', parseState.message);
        input.close();
    }
  }
  return parseState;
}

// Entry point for processing a file
export async function ProcessFile(
  symbolTable: SymTable,
  input: readline.Interface,
  output: OutputIO,
): Promise<void> {
  await ReadFile(input, StartState(symbolTable), output);
}
