import {
  hasFieldType,
  isArrayOfString,
  isDefined,
  isUndefined,
} from '@freik/typechk';

export type Value = string | undefined;
export type Symbol = {
  value: Value;
};
export type Macro = Symbol & { args: string[] };
export type SymbolTable = {
  AddSymbol: (name: string, value: Value) => void;
  AddMacro: (name: string, args: string[], body: Value) => void;
  IsDefined: (name: string) => boolean;
  IsSymbol: (name: string) => boolean;
  IsMacro: (name: string) => boolean;
  ExpandSymbol: (name: string) => string | undefined;
  ExpandMacro: (name: string, bindings: string[]) => string | undefined;
  GetParent: () => SymbolTable | undefined;
  dump: (prefix?: string) => void;
};

export function DumpSymbol(s: Symbol | Macro) {
  if (hasFieldType(s, 'args', isArrayOfString)) {
    console.log(`Macro: (${s.args.join(', ')})`);
  }
  if (isUndefined(s.value)) {
    console.log(`Value: <undefined>`);
  } else {
    console.log(`Value: '${s.value}'`);
  }
}

function MakeSymbolTable(defOrParent: string[] | SymbolTable): SymbolTable {
  const parent: SymbolTable | null = isArrayOfString(defOrParent)
    ? null
    : (defOrParent as SymbolTable);
  const symbolTable = new Map<string, Symbol>();
  function MakeSymbol(value: Value): Symbol {
    return { value };
  }

  function MakeMacro(args: string[], body: Value): Macro {
    return { ...MakeSymbol(body), args };
  }
  if (isArrayOfString(defOrParent)) {
    for (const define of defOrParent as string[]) {
      const [name, ...args] = define.split('=');
      const sym = MakeSymbol(args.join('='));
      symbolTable.set(name, sym);
    }
  }
  return {
    AddSymbol: (name: string, value: Value): void => {
      symbolTable.set(name, MakeSymbol(value));
    },

    AddMacro: (name: string, args: string[], body: Value): void => {
      symbolTable.set(name, MakeMacro(args, body));
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

    ExpandMacro: (name: string, bindings: string[]): string | undefined => {
      const sym = symbolTable.get(name);
      return isDefined(sym) ? sym.value || '' : name;
    },

    GetParent: (): SymbolTable | undefined => {
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

export function InitializeSymbolTable(defines: string[]): SymbolTable {
  return MakeSymbolTable(defines);
}

export function ChildSymbolTable(parent: SymbolTable): SymbolTable {
  return MakeSymbolTable(parent);
}
