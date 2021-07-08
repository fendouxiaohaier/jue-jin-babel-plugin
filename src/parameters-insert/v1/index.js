const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

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
    }
}
`;


// 将源码转为 AST
const ast = parser.parse(sourceCode, {
  sourceType: "unambiguous",
  plugins: ['jsx'],
});

// 打印输出ast看看
console.log(JSON.stringify(ast));

traverse(ast, {
  CallExpression(path, state) {
    if (
      // 如果是表达式
      types.isMemberExpression(path.node.callee) &&
      // 如果表达式的方法名是 console
      path.node.callee.object.name === "console" &&
      // 如果表达式调用的方法名称包是 ['log', 'info', 'error', 'debug'] 之一
      ["log", "info", "error", "debug"].includes(path.node.callee.property.name)
    ) {
      // 获取当前节点的起始位置信息
      const { line, column } = path.node.loc.start;
      // 在表达式的参数前插入一个字符串字面量节点 `filename: (${line}, ${column})`
      path.node.arguments.unshift(
        // 利用types直接创建一个字符串字面量
        types.stringLiteral(`filename: (${line}, ${column})`)
      );
    }
  },
});

const { code, map } = generate(ast);
console.log(code);

// 使用node 命令执行代码并查看结果
