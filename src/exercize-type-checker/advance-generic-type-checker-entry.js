const { transformFromAstSync } = require("@babel/core");
const parser = require("@babel/parser");
const typeCheckerPlugin = require("./plugin/advance-generic-type-checker");

const sourceCode = `
    type Res<Param> = Param extends 1 ? number : string;
    function add<T>(a: T, b: T) {
        return a + b;
    }
    add<Res<1>>(1, '2');
`;

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["typescript"],
});

const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [
    [
      typeCheckerPlugin,
      {
        fix: true,
      },
    ],
  ],
  comments: true,
});
