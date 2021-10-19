const NodePath = require("../../util/NodePath");
const type = require("../../util/type");

/**
 * 遍历AST
 * @param {*} node 当前节点
 * @param {*} visitors 遍历方法
 * @param {*} parent 当前节点的父节点
 * @param {*} parentPath 当前节点的父节点对应的path
 * @param {*} key 当前节点在父节点的哪个key属性下
 * @param {*} listKey 当前节点在父节点的哪个key下，key对应的属性值可能是数组，如果是数组的话就要知道是什么属性的什么下标
 */
function traverse(node, visitors, parent, parentPath, key, listKey) {
  // 获取节点类型对应的可以遍历的属性
  const definition = type.astDefinitionsMap.get(node.type);

  // 获取对应类型的遍历方法
  let visitorFuncs = visitors[node.type] || {};

  if (typeof visitorFuncs === "function") {
    visitorFuncs = {
      enter: visitorFuncs,
    };
  }

  const path = new NodePath(node, parent, parentPath, key, listKey);

  visitorFuncs.enter && visitorFuncs.enter(path);

  // 如果当前节点有 __shouldSkip 属性，则跳过当前节点的子节点的遍历
  if (node.__shouldSkip) {
    delete node.__shouldSkip;
    return;
  }

  // 根据definition定义，继续遍历节点可以遍历的属性对应的节点
  if (definition.visitor) {
    definition.visitor.forEach((key) => {
      const childNodes = node[key];
      if (Array.isArray(childNodes)) {
        // 如果该属性是数组
        childNodes.forEach((childNode, index) => {
          traverse(childNode, visitors, node, path, key, index);
        });
      } else {
        traverse(childNodes, visitors, node, path, key);
      }
    });
  }

  visitorFuncs.exit && visitorFuncs.exit(path);
}

module.exports = { traverse };
