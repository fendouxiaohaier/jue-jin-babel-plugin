const parser = require("../src/parser");
const { traverse } = require("../src/traverse");

const sourceCode = `
const d = 2;
`;

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["literal"],
});

traverse(ast, {
  Identifier(node) {
    // test 将字面量变为'bbbbbbbb'
    node.name = "bbbbbbbb";
  },
});

console.log(JSON.stringify(ast, undefined, 4));
