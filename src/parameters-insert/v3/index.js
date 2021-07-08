const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types");
import template from "@babel/template";

// 现在有个问题是：
// JSX 中的 console 代码不能简单的在前面插入一个节点，而要把整体替换成一个数组表达式，因为 JSX 中只支持写单个表达式。
const sourceCode = `
console.log(1);

function func() {
    console.info(2);
}

export default class Clazz {
    say() {
        console.debug(3);
    }
    render() {
        return <div>{console.error(4)}</div>
        // 转为下面这样
        // <div>{[console.log('filename.js(11,22)'), console.log(111)]}</div>
    }
}
`;

// 将源码转为 AST
const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["jsx"],
});

// targetCalleeName 结果 [ 'console.log', 'console.info', 'console.error', 'console.debug' ]
const targetCalleeName = ["log", "info", "error", "debug"].map(
  (item) => `console.${item}`
);

traverse(ast, {
  CallExpression(path, state) {
    // 不再遍历新创建的节点
    if (path.node.isNew) {
      return;
    }

    // calleeName 为 表达式代码
    const calleeName = generate(path.node.callee).code;
    // 如果目标表达式中包含表达式代码
    if (targetCalleeName.includes(calleeName)) {
      // 获取当前节点的起始位置信息
      const { line, column } = path.node.loc.start;

      // 利用template快速创建节点
      const newNode = template.expression(
        `console.log("filename: (${line}, ${column})")`
      )();
      // 为新创建的节点设置isNew=true属性，因为traverse会重复遍历新创建的节点，但是新创建的节点并不需要重复遍历
      newNode.isNew = true;

      // 如果该节点的父节点是JSXElement节点
      if (path.findParent((path) => path.isJSXElement())) {
        path.replaceWith(types.arrayExpression([newNode, path.node]));
        path.skip();
      } else {
        path.insertBefore(newNode);
      }
    }
  },
});

const { code, map } = generate(ast);
console.log(code);

// 使用node 命令执行代码并查看结果
