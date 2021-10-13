const { createMacro } = require("babel-plugin-macros");
const path = require("path");
const fs = require("fs");

/**
 * references： 所有引用 macro 的 path
 * state： macro 之间传递数据的方式，能拿到 filename
 * babel：各种 api，和 babel plugin 的第一个参数一样。
 */
function logMacro({ references, state, babel }) {
  const { default: referredPaths = [] } = references;

  referredPaths.forEach((referredPath) => {
    // 参入参数目录路径的绝对路径
    const dirPath = path.join(
      path.dirname(state.filename),
      referredPath.parentPath.get("arguments.0").node.value
    );
    // 读取目录下的文件
    const fileNames = fs.readdirSync(dirPath);

    // 生成有目录下文件名组成的数组
    const ast = babel.types.arrayExpression(
      fileNames.map((fileName) => babel.types.stringLiteral(fileName))
    );

    // 替换AST节点
    referredPath.parentPath.replaceWith(ast);
  });
}

// createMacro 用于创建 macro
module.exports = createMacro(logMacro);
