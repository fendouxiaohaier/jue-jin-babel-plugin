const { declare } = require("@babel/helper-plugin-utils");

const base54 = (function () {
  var DIGITS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
  return function (num) {
    var ret = "";
    do {
      ret = DIGITS.charAt(num % 54) + ret;
      num = Math.floor(num / 54);
    } while (num > 0);
    return ret;
  };
})();

/**
 * 代码混淆
 */
const mangle = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("uid", 0);
    },
    visitor: {
      /**
  export type Scopable =
  | BlockStatement
  | CatchClause
  | DoWhileStatement
  | ForInStatement
  | ForStatement
  | FunctionDeclaration
  | FunctionExpression
  | Program
  | ObjectMethod
  | SwitchStatement
  | WhileStatement
  | ArrowFunctionExpression
  | ClassExpression
  | ClassDeclaration
  | ForOfStatement
  | ClassMethod
  | ClassPrivateMethod
  | StaticBlock
  | TSModuleBlock;
       */

  
      // 批量遍历声明语句集合
      Scopable: {
        exit(path, state) {
          // if(!toplevel && !path.scope.parent) {
          //     return;
          // }
          // if(path.scope.hasEval) {
          //     return;
          // }
          let uid = state.file.get("uid");
          // path.scope.bindings 
          Object.entries(path.scope.bindings).forEach(([key, binding]) => {
            if (binding.mangled) return;
            binding.mangled = true;
            const newName = path.scope.generateUid(base54(uid++));
            binding.path.scope.rename(key, newName);
          });
          state.file.set("uid", uid);
        },
      },
    },
  };
});

module.exports = mangle;
