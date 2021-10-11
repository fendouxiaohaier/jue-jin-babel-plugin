const { declare } = require("@babel/helper-plugin-utils");

/**
 * 我们的目标是检查出遍历方向是否和终止条件的判断一致，也就是说当 update 为 ++ 时，test 应为为 <、<=；当 update 为 -- 时，test 应为 >、>=。如果不一致就报错。
 */
const forDirectionLint = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      ForStatement(path, state) {
        const errors = state.file.get("errors");

        // 判断条件 比如 >= > < <=
        const testOperator = path.node.test.operator;
        // 操作符 比如 ++ --
        const updateOperator = path.node.update.operator;

        let shouldUpdateOperator;
        if (["<", "<="].includes(testOperator)) {
          shouldUpdateOperator = "++";
        } else if ([">", ">="].includes(testOperator)) {
          shouldUpdateOperator = "--";
        }

        if (shouldUpdateOperator !== updateOperator) {
          const tmp = Error.stackTraceLimit;
          Error.stackTraceLimit = 0;
          // 生成错误信息 并收集起来
          errors.push(
            path.get("update").buildCodeFrameError("for direction error", Error)
          );
          Error.stackTraceLimit = tmp;
        }
      },
    },
    post(file) {
      // 最后打印出来
      console.log(file.get("errors"));
    },
  };
});

module.exports = forDirectionLint;
