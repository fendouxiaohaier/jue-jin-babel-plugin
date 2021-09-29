const { declare } = require("@babel/helper-plugin-utils");
const fse = require("fs-extra");
const path = require("path");
const generate = require("@babel/generator").default;

// 需要生成唯一的 intal 的 key
let intlIndex = 0;
function nextIntlKey() {
  ++intlIndex;
  return `intl${intlIndex}`;
}

/**
 * @description：语言国际化
 * 插件需要完成三件事：
 * 1、如果没有引入 intl 模块，就自动引入，并且生成唯一的标识符，不和作用域的其他声明冲突
 * 2、把字符串和模版字符串替换为 intl.t 的函数调用的形式
 * 3、把收集到的值收集起来，输出到一个资源文件中
 */
const autoTrackPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  if (!options.outputDir) {
    throw new Error("outputDir in empty");
  }

  /**
   * @description 生成替换节点的一个方法
   * 要判断是否在 JSXAttribute 下，如果是，则必须要包裹在 JSXExpressionContainer 节点中（也就是{}）
   * 如果是模版字符串字面量(TemplateLiteral)，还要把 expressions 作为参数传入
   * @param {*} path 
   * @param {*} value 
   * @param {*} intlUid 
   * @returns 
   */
  function getReplaceExpression(path, value, intlUid) {
    // start 处理模板字符串
    const expressionParams = path.isTemplateLiteral()
      ? path.node.expressions.map((item) => generate(item).code)
      : null;
    let replaceExpression = api.template.ast(
      `${intlUid}.t('${value}'${
        expressionParams ? "," + expressionParams.join(",") : ""
      })`
    ).expression;
    // end 处理模板字符串

    // 这个判断是 要判断是否在 JSXAttribute 下，如果是，则必须要包裹在 JSXExpressionContainer 节点中（也就是{}）
    if (
      path.findParent((p) => p.isJSXAttribute()) &&
      !path.findParent((p) => p.isJSXExpressionContainer())
    ) {
      replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
    }

    // 其他的直接返回
    return replaceExpression;
  }

  /**
   * @description save 方法则是收集替换的 key 和 value，保存到 file对象中 中
   * @param {*} file 
   * @param {*} key 
   * @param {*} value 
   */
  function save(file, key, value) {
    const allText = file.get("allText");
    allText.push({
      key,
      value,
    });
    file.set("allText", allText);
  }

  return {
    pre(file) {
      file.set("allText", []);
    },
    visitor: {
      Program: {
        enter(path, state) {
          // start 如果没有引入 intl 模块，就自动引入，并且生成唯一的标识符，不和作用域的其他声明冲突
          let imported;
          path.traverse({
            ImportDeclaration(p) {
              const source = p.node.source.value;
              if (source === "intl") {
                imported = true;

                // 如果已经引用了 还需要通过 specifiers 获取下对应的id
              }
            },
          });
          if (!imported) {
            const uid = path.scope.generateUid("intl");
            const importAst = api.template.ast(`import ${uid} from 'intl'`);
            path.node.body.unshift(importAst);
            state.intlUid = uid;
          }
          // end 如果没有引入 intl 模块，就自动引入，并且生成唯一的标识符，不和作用域的其他声明冲突
          
          path.traverse({
            // start 所有的有 /*i18n-disable*/ 注释的字符串和模版字符串节点打个标记，用于之后跳过处理。然后把这个注释节点从 ast 中去掉。
            "StringLiteral|TemplateLiteral"(path) {
              if (path.node.leadingComments) {
                path.node.leadingComments = path.node.leadingComments.filter(
                  (comment, index) => {
                    if (comment.value.includes("i18n-disable")) {
                      path.node.skipTransform = true;
                      return false;
                    }
                    return true;
                  }
                );
              }
              // /*i18n-disable*/注释在引用上，整个模块跳过
              if (path.findParent((p) => p.isImportDeclaration())) {
                path.node.skipTransform = true;
              }
            },
            // end 所有的有 /*i18n-disable*/ 注释的字符串和模版字符串节点打个标记，用于之后跳过处理。然后把这个注释节点从 ast 中去掉。
          });
        },
      },

      // 处理 StringLiteral 和 TemplateLiteral 节点，用 state.intlUid + '.t' 的函数调用语句来替换原节点
      // 替换完以后要用 path.skip 跳过新生成节点的处理，不然就会进入无限循环
      StringLiteral(path, state) {
        if (path.node.skipTransform) {
          return;
        }
        let key = nextIntlKey();
        save(state.file, key, path.node.value);

        const replaceExpression = getReplaceExpression(
          path,
          key,
          state.intlUid
        );
        path.replaceWith(replaceExpression);
        path.skip();
      },
      TemplateLiteral(path, state) {
        if (path.node.skipTransform) {
          return;
        }
        const value = path
          .get("quasis")
          .map((item) => item.node.value.raw)
          .join("{placeholder}");
        if (value) {
          let key = nextIntlKey();
          save(state.file, key, value);

          const replaceExpression = getReplaceExpression(
            path,
            key,
            state.intlUid
          );
          path.replaceWith(replaceExpression);
          path.skip();
        }
        // path.get('quasis').forEach(templateElementPath => {
        //     const value = templateElementPath.node.value.raw;
        //     if(value) {
        //         let key = nextIntlKey();
        //         save(state.file, key, value);

        //         const replaceExpression = getReplaceExpression(templateElementPath, key, state.intlUid);
        //         templateElementPath.replaceWith(replaceExpression);
        //     }
        // });
        // path.skip();
      },
    },
    post(file) {
      const allText = file.get("allText");
      const intlData = allText.reduce((obj, item) => {
        obj[item.key] = item.value;
        return obj;
      }, {});

      const content = `const resource = ${JSON.stringify(
        intlData,
        null,
        4
      )};\nexport default resource;`;
      fse.ensureDirSync(options.outputDir);
      fse.writeFileSync(path.join(options.outputDir, "zh_CN.js"), content);
      fse.writeFileSync(path.join(options.outputDir, "en_US.js"), content);
    },
  };
});
module.exports = autoTrackPlugin;
