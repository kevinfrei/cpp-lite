import { isString } from '@freik/typechk';
import readline from 'readline';
import { SymbolTable, Value } from './symbols.js';
import { Writer } from './types.js';

type LineProc =
  | null
  | ((st: SymbolTable, input: string, output: Writer) => LineProc | null);

// These regex's are all "consumers"
// A consumer puts the valid value in capture 1 and the rest of the line in capture 2
// This monstrosity matches a # directive
const directiveRegex = /^\s*#\s*(\w+)\s*((?:\s|\(|$).*)$/;
// This is the "valid name for a thing" consumer
const validNameRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)(.*)/;

// Join the list of backslashified lines together into a value
function JoinLines(lines: string[]): Value {
  let val: string | string[] = '';
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed.endsWith('\\\\')) {
      // This gets a new line after the current line
      if (isString(val)) {
        val = [val + line.substring(0, trimmed.length - 2)];
      } else {
        val.push(line.substring(0, trimmed.length - 2));
      }
    } else {
      if (isString(val)) {
        val = val + line.substring(0, trimmed.length - 1);
      } else {
        val[val.length - 1] =
          val[val.length - 1] + line.substring(0, trimmed.length - 1);
      }
    }
  }
  return val;
}

function CollectLines(name: string, values: string[]): LineProc {
  return (st: SymbolTable, line: string, output: Writer): LineProc => {
    if (!line.trimEnd().endsWith('\\')) {
      // We've reached the end of the continuation, add the lines as the value to the symbol table
      st.AddSymbol(name, JoinLines(values));
      return NoContext;
    }
    // Oh yeah, this weirdo recursion couldn't possibly go wrong :/
    return CollectLines(name, [...values, line]);
  };
}

function HandleDefine(
  symbolTable: SymbolTable,
  line: string,
  output: Writer,
): LineProc {
  const def = line.match(validNameRegex);
  if (def === null) {
    output(`Invalid define statement: ${line}`);
    return null;
  }
  const name = def[1];
  const value = def[2].trimStart();
  if (value.trimEnd().endsWith('\\')) {
    // We need to add lines to the value: we're in a different context
    return CollectLines(name, [value]);
  }
  symbolTable.AddSymbol(name, value);
  return NoContext;
}

function NoContext(st: SymbolTable, line: string, output: Writer): LineProc {
  const rgx = line.match(directiveRegex);
  if (rgx !== null) {
    const directive = rgx[1];
    switch (directive) {
      case 'define':
        return HandleDefine(st, rgx[2], output);
      case 'include':
      case 'ifdef':
      case 'ifndef':
      case 'else':
      case 'endif':
      case 'elifdef':
      case 'elifndef':
        output(`#${directive} directive not yet supported`);
        break;
      default:
        output(`#${directive} not recognized`);
        break;
    }
  } else {
    output('line read: ' + line);
  }
  return NoContext;
}

export async function ProcessFile(
  symbolTable: SymbolTable,
  input: readline.Interface,
  output: Writer,
): Promise<void> {
  // For each line, first check for directives
  let proc: LineProc = NoContext;
  await input.on('line', async (line: string) => {
    if (proc !== null) {
      proc = proc(symbolTable, line, output);
      symbolTable.dump();
    }
  });
}
