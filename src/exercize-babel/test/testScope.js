const parser = require("../src/parser");
const { traverse } = require("../src/traverse");

const sourceCode = `
  function a() {}
`;

const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["literal"],
});

traverse(ast, {
  // 删除全局中没有使用过的变量
  Program: {
    enter(path) {
      Object.entries(path.scope.bindings).forEach(([id, binding]) => {
        if (!binding.referenced) {
          // 删除对应的节点
          binding.path.remove();
        }
      });
    },
    exit(path) {
      // let curPath = path;
      // while (curPath) {
      //   console.log(JSON.stringify(path.node, undefined, 4));
      //   curPath = curPath.parentPath;
      // }
    },
  },
  // 函数中没有使用过的变量，直接干掉
  // FunctionDeclaration: {
  //   enter(path) {
  //     Object.entries(path.scope.bindings).forEach(([id, binding]) => {
  //       if (!binding.referenced) {
  //         binding.path.remove();
  //       }
  //     });
  //   },
  //   exit(path) {
  //     let curPath = path;
  //     while (curPath) {
  //       console.log(JSON.stringify(path.node, undefined, 4));
  //       curPath = curPath.parentPath;
  //     }
  //   },
  // },
});

console.log(JSON.stringify(ast, undefined, 4));
