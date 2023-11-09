import { isUndefined } from '@freik/typechk';
import { SymbolTable } from './symbols.js';

export interface NormalState {
  state: 'normal';
  table: SymbolTable;
  conditions: boolean[];
}
export interface DefineState {
  state: 'define';
  table: SymbolTable;
  conditions: boolean[];
  name: string;
  values: string[];
}
interface ErrorState {
  state: 'error';
  table: SymbolTable;
  conditions: boolean[];
  message: string;
}
export type ParseState = NormalState | DefineState | ErrorState;
export function StartState(table: SymbolTable): NormalState {
  return { state: 'normal', table, conditions: [] };
}
export function StateNormal(ps: ParseState): NormalState {
  return { state: 'normal', table: ps.table, conditions: ps.conditions };
}
export function StateDefine(ps: NormalState, name: string): DefineState {
  return { ...ps, state: 'define', name, values: [] };
}
export function StateError(ps: ParseState, message: string): ErrorState {
  return { ...ps, state: 'error', message };
}
export function StateIfdef(ps: NormalState, condition: boolean): NormalState {
  ps.conditions.push(condition);
  return ps;
}
export function StateElifdef(
  ps: NormalState,
  condition: boolean,
): NormalState | ErrorState {
  if (isUndefined(ps.conditions.pop())) {
    return StateError(ps, 'Unexpected elif');
  }
  ps.conditions.push(condition);
  return ps;
}
export function StateElse(ps: NormalState): NormalState | ErrorState {
  const ifVal = ps.conditions.pop();
  if (ifVal === undefined) {
    return StateError(ps, 'Unexpected else');
  }
  ps.conditions.push(!ifVal);
  return ps;
}
export function StateEndif(ps: NormalState): NormalState | ErrorState {
  if (isUndefined(ps.conditions.pop())) {
    return StateError(ps, 'Unexpected endif');
  }
  return ps;
}
export function TrueState(ps: NormalState): boolean {
  return ps.conditions.length === 0 || ps.conditions[ps.conditions.length - 1];
}