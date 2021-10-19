const types = require("../util/type");
const Scope = require("../util/Scope");
class NodePath {
  /**
   * Path节点
   * @param {*} node 当前节点
   * @param {*} parent 当前节点的父节点
   * @param {*} parentPath 当前节点的父节点对应的path
   * @param {*} key 当前节点在父节点的哪个key属性下
   * @param {*} listKey 当前节点在父节点的哪个key下，key对应的属性值可能是数组，如果是数组的话就要知道是什么属性的什么下标
   */
  constructor(node, parent, parentPath, key, listKey) {
    this.node = node;
    this.parent = parent;
    this.parentPath = parentPath;
    this.key = key;
    this.listKey = listKey;

    // 盘点当前节点类型
    Object.keys(types).forEach((key) => {
      if (key.startsWith("is")) {
        this[key] = types[key].bind(this, node);
      }
    });
  }

  // 在获取scope的时候才去创建scope，避免一开始就创建scope，暂用内存
  get scope() {
    if (this.__scope) {
      return this.__scope;
    }
    const isBlock = this.isBlock();
    const parentScope = this.parentPath && this.parentPath.scope;
    return (this.__scope = isBlock
      ? new Scope(parentScope, this)
      : parentScope);
  }

  /**
   * 在type文件中声明了哪些是Block类型
   * @returns
   */
  isBlock() {
    return types.astDefinitionsMap.get(this.node.type).isBlock;
  }

  // 用node替换当前节点
  replaceWith(node) {
    // 当前节点对应的path对应的listKey存在，则表示此节点对应的父节点的key对应的值是一个数组
    if (this.listKey) {
      this.parent[this.key].splice(this.listKey, 1, node);
    } else {
      this.parent[this.key] = node;
    }
  }

  //与replaceWith相似
  remove() {
    // 当前节点对应的path对应的listKey存在，则表示此节点对应的父节点的key对应的值是一个数组
    // 这里为什么是 !== undefined， 因为listKey可能为0，如果没有 !== undefined 这个判断，则当listKey===0时，
    // 会进入到else中，则改变了parent的key对应的数据结构，会影响后序遍历
    if (this.listKey !== undefined) {
      this.parent[this.key].splice(this.listKey, 1);
    } else {
      this.parent[this.key] = null;
    }
  }

  /**
   * find 是顺着 path 链向上查找 AST，并且把节点传入回调函数，如果找到了就返回节点的 path。区别是 find 包含当前节点
   * @param {*} callback
   */
  find(callback) {
    let curPath = this;

    // 不符合添加继续遍历
    while (curPath && !callback(curPath)) {
      curNode = curPath.parentPath;
    }

    // 符合条件 返回
    return curPath;
  }

  /**
   * find 是顺着 path 链向上查找 AST，并且把节点传入回调函数，如果找到了就返回节点的 path。区别是 findParent 不包含当前节点
   * @param {*} callback
   */
  findParent(callback) {
    let curPath = this.parentPath;

    // 不符合添加继续遍历
    while (curPath && !callback(curPath)) {
      curNode = curPath.parentPath;
    }

    // 符合条件 返回
    return curPath;
  }

  /**
   * traverse 的 api 是基于上面实现的 /src/traverse/index，
   * 但是有一点不同，path.traverse 不需要再遍历当前节点，直接遍历子节点即可
   * @param {*} visitors
   */
  traverse(visitors) {
    const { traverse } = require("../src/traverse/index");
    const definition = types.astDefinitionsMap.get(this.node.type);

    if (definition.visitor) {
      definition.visitor.forEach((key) => {
        const prop = this.node[key];
        if (Array.isArray(prop)) {
          // 如果该属性是数组
          prop.forEach((childNode, index) => {
            traverse(childNode, visitors, this.node, this, key, index);
          });
        } else {
          traverse(prop, visitors, this.node, this, key, index);
        }
      });
    }
  }

  /**
   * 给节点加个标记，遍历的过程中如果发现了这个标记就跳过子节点遍历
   * 需要/src/traverse/index配合，遍历的过程中如果发现了这个标记就跳过子节点遍历
   */
  skip() {
    this.node.__shouldSkip = true;
  }

  toString() {
    // 需要配合 generate 包
    // return generate(this.node).code;
  }
}

module.exports = NodePath;

// 并发代码 写耍得
// function sendRequest(urls, num, callback) {
//   (function request(res) {
//     urls.length
//       ? Promise.all(urls.splice(0, num).map((url) => fetch(url))).then((r) =>
//           request(res.concat(r))
//         )
//       : callback(res);
//   })([]);
// }
