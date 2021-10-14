const parser = require("../src/parser");

const sourceCode = `
const d = 2;
guang;
`;

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["literal", "guangKeyword"],
});

console.log(ast, undefined, 4);
