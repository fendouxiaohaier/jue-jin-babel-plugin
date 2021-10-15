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
  Identifier: {
    enter(path) {
      // test 将字面量变为'bbbbbbbb'
      path.node.name = "bbbbbbbb";
    },
    exit(path) {
      let curPath = path;
      while(curPath) {
        console.log(JSON.stringify(path.node, undefined, 4));
        curPath = curPath.parentPath
      }
    }
  }
});

console.log(JSON.stringify(ast, undefined, 4));
