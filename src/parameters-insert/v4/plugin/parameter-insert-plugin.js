// targetCalleeName 结果 [ 'console.log', 'console.info', 'console.error', 'console.debug' ]
const targetCalleeName = ["log", "info", "error", "debug"].map(
  (item) => `console.${item}`
);

const parametersInsertPlugin = ({types, template}) => {
  return {
    visitor: {
      CallExpression(path, state) {
        // 不再遍历新创建的节点
        if (path.node.isNew) {
          return;
        }

        // calleeName 为 表达式代码
        // const calleeName = generate(path.node.callee).code;
        const calleeName = path.get('callee').toString();
        // 如果目标表达式中包含表达式代码
        if (targetCalleeName.includes(calleeName)) {

          // 获取当前节点的起始位置信息
          const { line, column } = path.node.loc.start;

          // 利用template快速创建节点
          const newNode = template.expression(
            `console.log("${state.file.filename || 'unknown filename'}: (${line}, ${column})")`
          )();
          // 为新创建的节点设置isNew=true属性，
          // 因为traverse会重复遍历新创建的节点，但是新创建的节点并不需要重复遍历
          newNode.isNew = true;

          // 如果该节点的父节点是 JSXElement 节点
          if (path.findParent((path) => path.isJSXElement())) {
            // 则将节点替换为数组格式
            path.replaceWith(types.arrayExpression([newNode, path.node]));
            // 跳过接下来的子节点的遍历
            path.skip();
          } else {
            // 如果父节点不是 JSXElement 节点，则在当前节点的基础之前插入新建节点
            path.insertBefore(newNode);
          }
        }
      },
    },
  };
};

module.exports = parametersInsertPlugin;
