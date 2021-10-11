const { transformFromAstSync } = require("@babel/core");
const parser = require("@babel/parser");
const noFuncAssignLintPlugin = require("./plugins/no-func-reassign-lint");

const sourceCode = `
    function foo() {
    }
    foo = bar;
    var a = function hello() {
    hello = 123;
    };

`;

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
});

const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [noFuncAssignLintPlugin],
  filename: "input.js",
});
