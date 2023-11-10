import { ReadStream } from "fs";
import readline from "readline";

export type CmdLine = {
  includes: string[];
  defines: string[];
  input: string | undefined;
  output: string | undefined;
};
export type OutputIO = {
  (line: string): Promise<void>;
  close: () => Promise<void>;
};
export type StdInputIO = typeof process.stdin & { close: () => void };
export type InputIO = StdInputIO | ReadStream;
export type IOTriple = { rl: readline.Interface, input: InputIO; output: OutputIO }