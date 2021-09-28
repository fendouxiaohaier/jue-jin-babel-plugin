const { declare } = require("@babel/helper-plugin-utils");
const importModule = require("@babel/helper-module-imports");

/**
 * @description 自动埋点
 * 有两方面的事情要做：
 * 引入 tracker 模块。如果已经引入过就不引入，没有的话就引入，并且生成个唯一 id 作为标识符
 * 对所有函数在函数体开始插入 tracker 的代码
 *
 * declare 插件如果有错误 则提供错误信息
 */
const autoTrackPlugin = declare((api, options, dirname) => {
  // 声明babel的版本信息
  api.assertVersion(7);

  return {
    visitor: {
      Program: {
        enter(path, state) {
          // 遍历节点
          path.traverse({
            // 遍历import语句
            ImportDeclaration(curPath) {
              // 引用的值 import a from 'aa'; requirePath 就是 aa
              const requirePath = curPath.get("source").node.value;
              if (requirePath === options.trackerPath) {
                const specifierPath = curPath.get("specifiers.0");

                // specifierPath.isImportSpecifier() 表示是这样引入的： import {tracker} from 'tracker';
                if (specifierPath.isImportSpecifier()) {
                  state.trackerImportId = specifierPath.toString();

                  // specifierPath.isImportNamespaceSpecifier() 表示是这样引入的 import * as tracker from 'tracker';
                } else if (specifierPath.isImportNamespaceSpecifier()) {
                  state.trackerImportId = specifierPath.get("local").toString();

                  // specifierPath.isImportDefaultSpecifier() 表示是这样引入的 import tracker from 'tracker';
                } else if (specifierPath.isImportDefaultSpecifier()) {
                  // 这种方式不知道怎么获取 state.trackerImportId
                  state.trackerImportId = specifierPath.get("local").toString();
                }

                // 如果遍历到了tracker 则停止遍历
                path.stop();
              }
            },
          });
          // 如果没有引用tracker
          if (!state.trackerImportId) {
            // 引用tracker模块 并用 generateUid 生成唯一 id，然后放到 state
            state.trackerImportId = importModule.addDefault(path, "tracker", {
              nameHint: path.scope.generateUid("tracker"),
            }).name;
          }

          // 生成调用 tracker 模块的 AST，使用 template.statement
          state.trackerAST = api.template.statement(
            `${state.trackerImportId}()`
          )();
        },
      },
      "ClassMethod|ArrowFunctionExpression|FunctionExpression|FunctionDeclaration"(
        path,
        state
      ) {
        // 获取方法的函数体
        const bodyPath = path.get("body");
        // 有函数体的直接插入埋点代码
        if (bodyPath.isBlockStatement()) {
          bodyPath.node.body.unshift(state.trackerAST);
          // 没有函数体到的要包括以下，然后处理下返回值
        } else {
          const ast = api.template.statement(
            `{${state.trackerImportId}();return PREV_BODY;}`
          )({ PREV_BODY: bodyPath.node });
          bodyPath.replaceWith(ast);
        }
      },
    },
  };
});
module.exports = autoTrackPlugin;
