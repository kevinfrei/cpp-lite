import {
  DefineState,
  NormalState,
  ParseState,
  StateDefine,
  StateError,
  StateMacro,
  StateNormal,
} from './parsestate.js';
import { Rgx } from './regexes.js';

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
export function ConsumeDefine(
  ps: DefineState,
  line: string,
): NormalState | DefineState {
  if (!line.trimEnd().endsWith('\\')) {
    // We've reached the end of the lines:
    // add the lines as the value to the symbol table
    if (ps.args === undefined) {
      ps.table.AddSym(ps.name, JoinLines([...ps.values, line]));
    } else {
      ps.table.AddMacro(ps.name, ps.args, JoinLines([...ps.values, line]));
    }
    return StateNormal(ps);
  }
  // Just add this line to the list of lines and keep going
  ps.values.push(line);
  return ps;
}
export function HandleDefine(ps: NormalState, line: string): ParseState {
  const def = line.match(Rgx.validName);
  if (def === null) {
    return StateError(ps, `Invalid define statement: ${line}`);
  }
  const name = def[1];
  const value = def[2].trimStart();
  if (value.trim().startsWith('(')) {
    // TODO: We have ourselves a macro

    // For varargs macros, they should be registered as "**<macroname>"
    // There can be only a *single* macro with varargs.
    // For all other macros, they should be registered as "<num-args>*<macroname>"
    // Then lookup should first look for the precise <n>*<name>. Upon failure,
    // fall back to looking for **<name>.

    // So, initially, parse the arg names, make the list, add it
    const close = value.indexOf(')');
    if (close < 0) {
      return StateError(
        ps,
        `Missing closing paren on macro definition ${name}`,
      );
    }
    const args: string[] = [];
    const argList = value.substring(1, close).split(',');
    for (const arg of argList) {
      let argName = arg.trim();
      if (argName.endsWith(')')) {
        argName = argName.substring(0, argName.length - 1);
      }
      const varArg = argName.startsWith('...');
      if (varArg) {
        argName = argName.substring(3);
      }
      if (argName.length === 0) {
        return StateError(
          ps,
          `Empty argument name in macro definition ${name}`,
        );
      }
      const m = argName.match(Rgx.nextToken);
      if (m !== null && (m[2] === undefined || m[2].length === 0)) {
        args.push(varArg ? '*' + m[1] : m[1]);
        continue;
      }
      return StateError(
        ps,
        `Invalid argument name in macro definition ${name}: "${argName}"`,
      );
    }
    if (argList.length !== args.length) {
      throw new Error(
        `Internal error: Macro definition ${name} has mismatched number of arguments.`,
      );
    }
    return ConsumeDefine(StateMacro(ps, name, args), value);
  }
  return ConsumeDefine(StateDefine(ps, name), value);
}
export function HandleUndef(ps: NormalState, line: string): ParseState {
  const undef = line.match(Rgx.validName);
  if (undef === null) {
    return StateError(ps, `Invalid undef statement: ${line}`);
  }
  ps.table.RemoveSym(undef[1]);
  return ps;
}
