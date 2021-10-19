/**
 * 用于在Scope中记录声明，
 * scope 中记录着 bindings，也就是声明，
 * 每个声明会记录在哪里声明的，被哪里引用的
 */
class Binding {
  constructor(id, path, scope, kind) {
    this.id = id;
    this.path = path;
    this.referenced = false;
    this.referencePaths = [];
  }
}

class Scope {
  constructor(parentScope, path) {
    /** 父节点的scope */
    this.parent = parentScope;
    /** 声明 */
    this.bindings = {};
    /** 当前Scope对应的path */
    this.path = path;

    // 遍历path，注册 VariableDeclarator 类型的声明和
    // FunctionDeclaration 类型的声明
    path.traverse({
      VariableDeclarator: (childPath) => {
        this.registerBinding(childPath.node.id.name, childPath);
      },
      // 遇到函数作用域要跳过遍历，因为它有自己独立的作用域
      FunctionDeclaration: (childPath) => {
        childPath.skip();
        this.registerBinding(childPath.node.id.name, childPath);
      },
    });

    /**
     * 记录完 binding 之后，再扫描所有引用该 binding 的地方，也就是扫描所有的 identifier。
     * 这里要排除声明语句里面的 identifier，那个是定义变量不是引用变量
     */
    path.traverse({
      Identifier: (childPath) => {
        if (
          !childPath.findParent(
            (p) => p.isVariableDeclarator() || p.isFunctionDeclaration()
          )
        ) {
          const id = childPath.node.name;
          const binding = this.getBinding(id);
          if (binding) {
            binding.referenced = true;
            binding.referencePaths.push(childPath);
          }
        }
      },
    });
  }

  /**
   * @description 注册声明
   * @param {*} id 声明对应的key
   * @param {*} path 声明对应的value
   */
  registerBinding(id, path) {
    this.bindings[id] = new Binding(id, path);
  }

  /**
   * @description 在自身作用域，通过key获取声明
   * @param {*} id
   * @returns
   */
  getOwnBinding(id) {
    return this.bindings[id];
  }

  /**
   * @description 和getOwnBinding区别在于向上查找
   * @param {*} id
   * @returns
   */
  getBinding(id) {
    let res = this.getOwnBinding(id);
    if (res === undefined && this.parent) {
      res = this.parent.getOwnBinding(id);
    }
    return res;
  }

  /**
   * @description 判断当前key是否绑定了声明
   * @param {*} id
   * @returns
   */
  hasBinding(id) {
    return !!this.getBinding(id);
  }
}

module.exports = Scope;
