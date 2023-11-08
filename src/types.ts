export type CmdLine = {
  includes: string[];
  defines: string[];
  input: string | undefined;
  output: string | undefined;
};
export type Writer = (arg: string) => void;
