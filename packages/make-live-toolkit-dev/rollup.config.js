/* eslint-disable @typescript-eslint/no-var-requires */
const typescript = require("@rollup/plugin-typescript");

/**
 * @type {import('rollup').RollupOptions}
 */
module.exports = {
  input: "./src/index.ts",
  output: {
    file: "dist/index.js",
    format: "cjs",
  },
  plugins: [typescript()],
};
