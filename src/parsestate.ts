import { isUndefined } from '@freik/typechk';
import { SymTable } from './symbols.js';

export interface BaseState {
  table: SymTable;
  conditions: boolean[];
}
export interface NormalState extends BaseState {
  state: 'normal';
}
export interface DefineState extends BaseState {
  state: 'define';
  name: string;
  args?: string[];
  values: string[];
}
export interface MacroState extends BaseState {
  state: 'macro';
}
export interface ErrorState extends BaseState {
  state: 'error';
  message: string;
}
export type ParseState = NormalState | DefineState | ErrorState;
export function StartState(table: SymTable): NormalState {
  return { state: 'normal', table, conditions: [] };
}
export function StateNormal(ps: ParseState): NormalState {
  return { state: 'normal', table: ps.table, conditions: ps.conditions };
}
export function StateDefine(ps: NormalState, name: string): DefineState {
  return { ...ps, state: 'define', name, values: [] };
}
export function StateMacro(
  ps: NormalState,
  name: string,
  args: string[],
): DefineState {
  return { ...ps, state: 'define', name, args, values: [] };
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
export function IsTrueState(ps: NormalState): boolean {
  return ps.conditions.length === 0 || ps.conditions.every((val) => val);
}
