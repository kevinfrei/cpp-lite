import fs from 'fs';
import readline from 'readline';
import {
  DefineState,
  IsTrueState,
  NormalState,
  ParseState,
  StartState,
  StateDefine,
  StateElifdef,
  StateElse,
  StateEndif,
  StateError,
  StateIfdef,
  StateNormal,
} from './parsestate.js';
import { SymbolTable } from './symbols.js';
import { Writer } from './types.js';

// This monstrosity matches a # directive (1 -> directive, 2 -> rest of line)
const directiveRegex = /^\s*#\s*(\w+)\s*((?:\s|\(|$).*)$/;
// 1 -> "valid name for a thing", 2 -> rest of line
const validNameRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)(.*)/;
// 1 -> maybe space, 2 -> token 3 -> rest of line
const nextTokenRegex = /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(.*)$/;
// 1 -> consume to the next nonspace 2 -> rest of line
const nextStartRegex = /^(\s*\S)(.*)$/;
// 1 -> include path
const includePathRegex = /^\s*"(.*)"\s*$/;

function OutputString(st: SymbolTable, output: Writer, line: string): void {
  let remaining = line;
  do {
    let match = remaining.match(nextTokenRegex);
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
      output(initSpace + (token || ''));
    } else {
      // Consume non-token item
      match = remaining.match(nextStartRegex);
      if (match === null) {
        // Trailling spaces, probably...
        output(remaining);
        remaining = '';
      } else {
        output(match[1]);
        remaining = match[2];
      }
    }
  } while (remaining.length > 0);
  output('\n');
}

// Join the list of backslashified lines together into a value
function JoinLines(lines: string[]): string {
  let val: string = '';
  let lastNL = false;
  for (const line of lines) {
    let trimmed = line.trimEnd();
    if (lastNL) {
      val += '\n';
    }
    if (trimmed.endsWith('\\\\')) {
      trimmed = trimmed.substring(0, trimmed.length - 2);
      lastNL = true;
    } else if (trimmed.endsWith('\\')) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
      lastNL = false;
    } else {
      trimmed = line;
      lastNL = false;
    }
    val += trimmed;
  }
  return val;
}

function ConsumeDefine(
  ps: DefineState,
  line: string,
): NormalState | DefineState {
  if (!line.trimEnd().endsWith('\\')) {
    // We've reached the end of the lines:
    // add the lines as the value to the symbol table
    ps.table.AddSymbol(ps.name, JoinLines([...ps.values, line]));
    return StateNormal(ps);
  }
  // Just add this line to the list of lines and keep going
  ps.values.push(line);
  return ps;
}

function HandleDefine(ps: NormalState, line: string): ParseState {
  const def = line.match(validNameRegex);
  if (def === null) {
    return StateError(ps, `Invalid define statement: ${line}`);
  }
  const name = def[1];
  const value = def[2].trimStart();
  if (value.trim().startsWith('(')) {
    // TODO: We have ourselves a macro
  }
  return ConsumeDefine(StateDefine(ps, name), value);
}

async function NormalContext(
  st: NormalState,
  line: string,
  output: Writer,
): Promise<ParseState> {
  const rgx = line.match(directiveRegex);
  if (rgx !== null) {
    const directive = rgx[1];
    switch (directive) {
      case 'define':
        return HandleDefine(st, rgx[2]);
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
        output(`#${directive} not recognized`);
        break;
    }
  } else if (IsTrueState(st)) {
    // If we're in a "true" state, output the line
    OutputString(st.table, output, line);
  }
  return st;
}

async function IncludeFile(
  st: NormalState,
  fileBlob: string,
  output: Writer,
): Promise<ParseState> {
  const fileMatch = fileBlob.match(includePathRegex);
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
  if (ifDepth != res.conditions.length) {
    throw new Error(
      `#include "${filename}" doesn't have balanced #if/#endif's (${ifDepth} vs ${res.conditions.length})`,
    );
  }
  return res;
}

async function ReadFile(
  input: readline.Interface,
  parseState: ParseState,
  output: Writer,
): Promise<ParseState> {
  await input.on('line', async (line: string) => {
    switch (parseState.state) {
      case 'normal':
        parseState = await NormalContext(parseState, line, output);
        break;
      case 'define':
        parseState = ConsumeDefine(parseState, line);
        break;
      case 'error':
        console.error('Parse error: ', parseState.message);
        input.close();
    }
  });
  return parseState;
}

// Entry point for processing a file
export async function ProcessFile(
  symbolTable: SymbolTable,
  input: readline.Interface,
  output: Writer,
): Promise<void> {
  // For each line, first check for directives
  let parseState: ParseState = StartState(symbolTable);
  parseState = await ReadFile(input, parseState, output);
}
