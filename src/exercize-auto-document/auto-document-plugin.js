const { declare } = require("@babel/helper-plugin-utils");
// 解析注释的插件
const doctrine = require("doctrine");
const fse = require("fs-extra");
const path = require("path");
const renderer = require("./renderer");

function parseComment(commentStr) {
  if (!commentStr) {
    return;
  }
  return doctrine.parse(commentStr, {
    unwrap: true,
  });
}

/**
 * @description 根据文档配置信息和格式化类型 ，生成对应文档类型
 * @param {*} docs 文档数据
 * @param {*} format 格式化类型
 * @returns 返回文档
 */
function generate(docs, format = "json") {
  if (format === "markdown") {
    return {
      ext: ".md",
      content: renderer.markdown(docs),
    };
  } else if (format === "html") {
    return {
      ext: ".html",
      content: renderer.html(docs),
    };
  } else {
    return {
      ext: ".json",
      content: renderer.json(docs),
    };
  }
}

// 根据 babel 的参数的类型 返回 js 的参数的返回类型
function resolveType(tsType) {
  const typeAnnotation = tsType.typeAnnotation;
  if (!typeAnnotation) {
    return;
  }
  switch (typeAnnotation.type) {
    case "TSStringKeyword":
      return "string";
    case "TSNumberKeyword":
      return "number";
    case "TSBooleanKeyword":
      return "boolean";
  }
}

const autoDocumentPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("docs", []);
    },
    visitor: {
      // 遍历函数 
      FunctionDeclaration(path, state) {
        const docs = state.file.get("docs");
        docs.push({
          type: "function",
          name: path.get("id").toString(),  // 获取函数名
          // path.get("params") 获取到参数数组
          params: path.get("params").map((paramPath) => {
            return {
              name: paramPath.toString(),  // 参数名
              // paramPath.getTypeAnnotation() 参数 babel 对象
              type: resolveType(paramPath.getTypeAnnotation()),  // 参数类型
            };
          }),
          // path.get("returnType").getTypeAnnotation() 返回值 babel 对象
          return: resolveType(path.get("returnType").getTypeAnnotation()),  // 返回值类型
          // 获取注释， path.node.leadingComments 获取babel注释对象
          doc:
            path.node.leadingComments &&
            parseComment(path.node.leadingComments[0].value),
        });

        // docs 保存在file对象中
        state.file.set("docs", docs);
      },

      // 遍历类
      ClassDeclaration(path, state) {
        const docs = state.file.get("docs");
        const classInfo = {
          type: "class",
          name: path.get("id").toString(),  // 类名
          constructorInfo: {},
          methodsInfo: [],
          propertiesInfo: [],
        };

        // 注释信息
        if (path.node.leadingComments) {
          classInfo.doc = parseComment(path.node.leadingComments[0].value);
        }

        // 如果是类  继续遍历
        path.traverse({
          // 遍历类中的属性
          ClassProperty(path) {
            classInfo.propertiesInfo.push({
              name: path.get("key").toString(),  // 属性名
              type: resolveType(path.getTypeAnnotation()),  // 属性类型
              // [path.node.leadingComments, path.node.trailingComments] 这里获取两种注释 
              // 一种是leadingComments 放在前面的
              // 一种是trailingComments 放在后面的
              doc: [path.node.leadingComments, path.node.trailingComments]
                .filter(Boolean)
                .map((comment) => {
                  return parseComment(comment.value);
                })
                .filter(Boolean),
            });
          },

          // 遍历类中的方法
          ClassMethod(path) {
            // 判断方法类型是构造函数
            if (path.node.kind === "constructor") {
              classInfo.constructorInfo = {
                // 构造函数中的参数信息
                params: path.get("params").map((paramPath) => {
                  return {
                    name: paramPath.toString(),
                    type: resolveType(paramPath.getTypeAnnotation()),
                    doc: parseComment(path.node.leadingComments[0].value),
                  };
                }),
              };
            } else {
              // 实例方法
              classInfo.methodsInfo.push({
                name: path.get("key").toString(),  // 方法名
                doc: parseComment(path.node.leadingComments[0].value), // 注释
                // 实例方法的参数的相关信息，包括参数名、参数类型
                params: path.get("params").map((paramPath) => {
                  return {
                    name: paramPath.toString(),
                    type: resolveType(paramPath.getTypeAnnotation()),
                  };
                }),
                // 实例方法返回类型
                return: resolveType(path.getTypeAnnotation()),
              });
            }
          },
        });
        docs.push(classInfo);
        state.file.set("docs", docs);
      },
    },

    post(file) {
      const docs = file.get("docs");
      const res = generate(docs, options.format);
      fse.ensureDirSync(options.outputDir);
      // 写入对应的文件
      fse.writeFileSync(
        path.join(options.outputDir, "docs" + res.ext),
        res.content
      );
    },
  };
});

module.exports = autoDocumentPlugin;
