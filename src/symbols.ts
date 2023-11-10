/* eslint-disable no-console */
import {
  hasFieldType,
  isArrayOfString,
  isDefined,
  isUndefined,
} from '@freik/typechk';

export type Val = string | undefined;
export type Sym = {
  value: Val;
};
export type Macro = Sym & { args: string[] };
export type SymTable = {
  AddSym: (name: string, value: Val) => void;
  RemoveSym: (name: string) => boolean;
  AddMacro: (name: string, args: string[], body: Val) => void;
  IsDefined: (name: string) => boolean;
  IsSymbol: (name: string) => boolean;
  IsMacro: (name: string) => boolean;
  ExpandSymbol: (name: string) => string | undefined;
  ExpandMacro: (name: string, bindings: string[]) => string | undefined;
  GetParent: () => SymTable | undefined;
  dump: (prefix?: string) => void;
};

export function DumpSymbol(s: Sym | Macro) {
  if (hasFieldType(s, 'args', isArrayOfString)) {
    console.log(`Macro: (${s.args.join(', ')})`);
  }
  if (isUndefined(s.value)) {
    console.log(`Value: <undefined>`);
  } else {
    console.log(`Value: '${s.value}'`);
  }
}

function MakeSymbolTable(defOrParent: string[] | SymTable): SymTable {
  const parent: SymTable | null = isArrayOfString(defOrParent)
    ? null
    : defOrParent;
  const symbolTable = new Map<string, Sym>();
  function MakeSymbol(value: Val): Sym {
    return { value };
  }

  function MakeMacro(args: string[], body: Val): Macro {
    return { ...MakeSymbol(body), args };
  }
  if (isArrayOfString(defOrParent)) {
    for (const define of defOrParent) {
      const [name, ...args] = define.split('=');
      const sym = MakeSymbol(args.join('='));
      symbolTable.set(name, sym);
    }
  }
  return {
    AddSym: (name: string, value: Val): void => {
      symbolTable.set(name, MakeSymbol(value));
    },

    RemoveSym: (name: string): boolean => {
      // Don't worry about parent tables for RemoveSym,
      // since it's only used in Macro expansion and we shouldn't
      // ever try to remove a symbol when we have a parent

      // assert(symbolTable.parent === null);
      return symbolTable.delete(name);
    },

    AddMacro: (name: string, args: string[], body: Val): void => {
      const symName = args.some((arg) => arg.startsWith('*'))
        ? '**'
        : `${args.length}*${name}`;
      symbolTable.set(symName, MakeMacro(args, body));
    },

    IsDefined: (name: string): boolean => {
      return (
        symbolTable.has(name) || (parent !== null && parent.IsDefined(name))
      );
    },

    IsSymbol: (name: string): boolean => {
      const sym = symbolTable.get(name);
      if (isUndefined(sym)) {
        return parent !== null && parent.IsSymbol(name);
      }
      return !hasFieldType(symbolTable.get(name), 'args', isArrayOfString);
    },

    IsMacro: (name: string): boolean => {
      const sym = symbolTable.get(name);
      if (isUndefined(sym)) {
        return parent !== null && parent.IsMacro(name);
      }
      return hasFieldType(symbolTable.get(name), 'args', isArrayOfString);
    },

    ExpandSymbol: (name: string): string | undefined => {
      const sym = symbolTable.get(name);
      if (isDefined(sym)) {
        return sym.value || '';
      } else if (parent !== null) {
        return parent.ExpandSymbol(name);
      }
      return undefined;
    },

    ExpandMacro: (
      name: string /* , bindings: string[]*/,
    ): string | undefined => {
      const sym = symbolTable.get(name);
      return isDefined(sym) ? sym.value || '' : name;
    },

    GetParent: (): SymTable | undefined => {
      return parent !== null ? parent : undefined;
    },

    dump: (prefix?: string) => {
      const pfx = prefix || '';
      for (const [key, val] of symbolTable) {
        console.log(`${pfx}Symbol ${key}: `);
        DumpSymbol(val);
      }
      if (parent) {
        parent.dump('parent:' + pfx);
      }
    },
  };
}

export function InitializeSymbolTable(defines: string[]): SymTable {
  return MakeSymbolTable(defines);
}

export function ChildSymbolTable(parent: SymTable): SymTable {
  return MakeSymbolTable(parent);
}
