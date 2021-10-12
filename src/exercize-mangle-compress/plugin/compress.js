const { declare } = require("@babel/helper-plugin-utils");

function canExistAfterCompletion(path) {
  return (
    path.isFunctionDeclaration() ||
    path.isVariableDeclaration({
      kind: "var",
    })
  );
}

const compress = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("uid", 0);
    },
    visitor: {
      // 删除不会执行的代码
      BlockStatement(path) {
        const statementPaths = path.get("body");
        let purge = false;
        for (let i = 0; i < statementPaths.length; i++) {
          /* 别名 
            export type CompletionStatement =
            | BreakStatement
            | ContinueStatement
            | ReturnStatement
            | ThrowStatement; 
          */
          // 遇到结束语句
          if (statementPaths[i].isCompletionStatement()) {
            purge = true;
            continue;
          }

          /* 排除函数声明和 */
          if (purge && !canExistAfterCompletion(statementPaths[i])) {
            statementPaths[i].remove();
          }
        }
      },
      /* export type Scopable =
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
      Scopable(path) {
        Object.entries(path.scope.bindings).forEach(([key, binding]) => {
          // 如果变量没有被引用
          if (!binding.referenced) {
            // 如果是初始化变量，并且初始化调用的是函数
            if (binding.path.get("init").isCallExpression()) {
              // 如果包含注释 PURE，则表示没有副作用，直接删除
              const comments = binding.path.get("init").node.leadingComments;
              if (comments && comments[0]) {
                if (comments[0].value.includes("PURE")) {
                  binding.path.remove();
                  return;
                }
              }
            }
            // 如果右侧赋值的是有副作用的，则只保留右侧部分
            if (!path.scope.isPure(binding.path.node.init)) {
              binding.path.parentPath.replaceWith(
                api.types.expressionStatement(binding.path.node.init)
              );
            } else {
              // 如果右侧的赋值是没有副作用的，则直接删除
              binding.path.remove();
            }
          }
        });
      },
    },
  };
});

module.exports = compress;
