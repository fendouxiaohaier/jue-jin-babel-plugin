const parser = require("@babel/parser");
const {  transformFromAstSync } = require('@babel/core');

const path = require('path');
const fs = require('fs');

const insertParametersPlugin = require('./plugin/parameter-insert-plugin');

// 现在有个问题是：
// JSX 中的 console 代码不能简单的在前面插入一个节点，而要把整体替换成一个数组表达式，因为 JSX 中只支持写单个表达式。
const sourceCode = fs.readFileSync(path.join(__dirname, '../sourceCode.js'), {
  encoding: 'utf-8'
});

// 将源码转为 AST
const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ["jsx"],
});

const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [insertParametersPlugin]
});

console.log(code);

// 使用node 命令执行代码并查看结果
