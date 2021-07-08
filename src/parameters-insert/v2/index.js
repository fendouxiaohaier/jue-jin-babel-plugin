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

// targetCalleeName 结果 [ 'console.log', 'console.info', 'console.error', 'console.debug' ]
const targetCalleeName = ['log', 'info', 'error', 'debug'].map(item => `console.${item}`);

traverse(ast, {
  CallExpression(path, state) {
    // calleeName 为 表达式代码
    const calleeName = generate(path.node.callee).code;
    // 如果目标表达式中包含表达式代码
    if (targetCalleeName.includes(calleeName)) {
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
