
/**
 * 维护这样一份数据：不同的 AST 有哪些可以遍历的属性。
 */
const astDefinitionsMap = new Map();

astDefinitionsMap.set('Program', {
    visitor: ['body']
});
astDefinitionsMap.set('VariableDeclaration', {
    visitor: ['declarations']
});
astDefinitionsMap.set('VariableDeclarator', {
    visitor: ['id', 'init']
});
astDefinitionsMap.set('Identifier', {});
astDefinitionsMap.set('NumericLiteral', {});
astDefinitionsMap.set('FunctionDeclaration', {
    visitor: ['id', 'params', 'body']
});
astDefinitionsMap.set('BlockStatement', {
    visitor: ['body']
});
astDefinitionsMap.set('ReturnStatement', {
    visitor: ['argument']
});
astDefinitionsMap.set('BinaryExpression', {
    visitor: ['left', 'right']
});
astDefinitionsMap.set('ExpressionStatement', {
    visitor: ['expression']
});
astDefinitionsMap.set('CallExpression', {
    visitor: ['callee', 'arguments']
});


function traverse(node, visitors) {
  // 获取节点类型对应的可以遍历的属性
  const definition = astDefinitionsMap.get(node.type);

  // 获取对应类型的遍历方法
  let visitorFuncs = visitors[node.type] || {};

  if (typeof visitorFuncs === "function") {
    visitorFuncs = {
      enter: visitorFuncs,
    };
  }

  visitorFuncs.enter && visitorFuncs.enter(node);

  // 根据definition定义，继续遍历节点对应属性的节点
  if (definition.visitor) {
    definition.visitor.forEach((key) => {
      const prop = node[key];
      if (Array.isArray(prop)) {
        // 如果该属性是数组
        prop.forEach((childNode) => {
          traverse(childNode, visitors);
        });
      } else {
        traverse(prop, visitors);
      }
    });
  }
  visitorFuncs.exit && visitorFuncs.exit(node);
}

module.exports = { traverse };
