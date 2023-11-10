export const Rgx = {
  // This monstrosity matches a # directive (1 -> directive, 2 -> rest of line)
  directive: /^\s*#\s*(\w+)\s*((?:\s|\(|$).*)$/,
  // 1 -> "valid name for a thing", 2 -> rest of line
  validName: /^\s*([a-zA-Z_][a-zA-Z0-9_]*)(.*)/,
  // 1 -> maybe space, 2 -> token 3 -> rest of line
  nextToken: /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(.*)$/,
  // 1 -> consume to the next nonspace 2 -> rest of line
  nextStart: /^(\s*\S)(.*)$/,
  // 1 -> include path
  includePath: /^\s*"(.*)"\s*$/,
};
