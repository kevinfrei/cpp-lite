import { hasFieldType, isArrayOfString } from '@freik/typechk';

export type Value = string | string[] | undefined;
export type Symbol = {
  value: Value;
};
export type Macro = Symbol & { args: string[] };
export type SymbolTable = {
  AddSymbol: (name: string, value: Value) => void;
  AddMacro: (name: string, args: string[], body: Value) => void;
  dump: () => void;
};

export function DumpSymbol(s: Symbol | Macro) {
  if (hasFieldType(s, 'args', isArrayOfString)) {
    console.log(`Args: (${s.args.join(', ')})`);
  }
  console.log(`Value: ${s.value === undefined ? '<undefined>' : s.value}`);
}

export function InitializeSymbolTable(defines: string[]): SymbolTable {
  const symbolTable = new Map<string, Symbol>();
  function MakeSymbol(value: Value): Symbol {
    return { value };
  }

  function MakeMacro(args: string[], body: Value): Macro {
    return { ...MakeSymbol(body), args };
  }
  for (const define of defines) {
    const [name, ...args] = define.split('=');
    const sym = MakeSymbol(args.join('='));
    symbolTable.set(name, sym);
  }
  return {
    AddSymbol: (name: string, value: Value) => {
      symbolTable.set(name, MakeSymbol(value));
    },

    AddMacro: (name: string, args: string[], body: Value) => {
      symbolTable.set(name, MakeMacro(args, body));
    },
    dump: () => {
      for (const [key, val] of symbolTable) {
        console.log(`Symbol ${key}: `);
        DumpSymbol(val);
      }
    },
  };
}
