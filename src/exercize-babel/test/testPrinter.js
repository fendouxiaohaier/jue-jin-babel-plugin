const parser = require("../src/parser");
const { traverse } = require("../src/traverse");
const generate = require('../util/Printer');

const sourceCode = `
call(a, b)
`;

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["literal"],
});

traverse(ast, {
  Identifier: {
    enter(path) {
      // test 将字面量变为'bbbbbbbb'
      //path.node.name = "bbbbbbbb";

      // 测试这段
      if (path.findParent((p) => p.isCallExpression())) {
        path.replaceWith({ type: "Identifier", name: "bbbbbbb" });
      }
    },
    exit(path) {
      // let curPath = path;
      // while (curPath) {
      //   console.log(JSON.stringify(path.node, undefined, 4));
      //   curPath = curPath.parentPath;
      // }
    },
  },
});

// 打印目标ast
console.log(JSON.stringify(ast, undefined, 4));
// 打印目标源码
const {code, map} = generate(ast, sourceCode, 'foo.js');
console.log(code);