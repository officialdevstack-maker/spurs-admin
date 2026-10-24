const Module = require("module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (r, ...rest) {
  if (r === "server-only") return require.resolve("./_noop.cjs");
  return orig.call(this, r, ...rest);
};
