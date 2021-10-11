const { declare } = require("@babel/helper-plugin-utils");

/**
 * 函数不能重新赋值
 */
const noFuncAssignLint = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      // 遍历赋值表达式
      AssignmentExpression(path, state) {
        const errors = state.file.get("errors");
        // 获取表达式左侧的引用
        const assignTarget = path.get("left").toString();
        // 获取变量的引用需要用 path.scope.getBinding
        const binding = path.scope.getBinding(assignTarget);
        if (binding) {
          // 如果引用是函数声明或函数表达式，则将错误信息保存起来
          if (
            binding.path.isFunctionDeclaration() ||
            binding.path.isFunctionExpression() ||
            binding.path.isArrowFunctionExpression()
          ) {
            const tmp = Error.stackTraceLimit;
            Error.stackTraceLimit = 0;
            errors.push(
              path.buildCodeFrameError("can not reassign to function", Error)
            );
            Error.stackTraceLimit = tmp;
          }
        }
      },
    },
    post(file) {
      console.log(file.get("errors"));
    },
  };
});

module.exports = noFuncAssignLint;
