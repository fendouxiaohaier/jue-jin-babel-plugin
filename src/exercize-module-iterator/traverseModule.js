const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const path = require("path");
const DependencyNode = require("./DependencyNode");

const visitedModules = new Set();

const IMPORT_TYPE = {
  deconstruct: "deconstruct",
  default: "default",
  namespace: "namespace",
};
const EXPORT_TYPE = {
  all: "all",
  default: "default",
  named: "named",
};

/**
 * 根据文件类型，获取解析文件为AST所需的插件
 * @param {*} modulePath 模块路径
 * @returns
 */
function resolveBabelSyntaxPlugins(modulePath) {
  const plugins = [];
  // tsx jsx 文件 需要 jsx 插件
  if ([".tsx", ".jsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("jsx");
  }

  // ts tsx 文件需要 typescript 插件
  if ([".ts", ".tsx"].some((ext) => modulePath.endsWith(ext))) {
    plugins.push("typescript");
  }
  return plugins;
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (e) {}
  return false;
}

/**
 *
 * @param {string} modulePath import 的模块路径，如果没有文件后缀，则尝试添加路径，如果是目录，则尝试添加补齐
 * @returns 返回完整的引用模块路径
 */
function completeModulePath(modulePath) {
  const EXTS = [".tsx", ".ts", ".jsx", ".js"];
  if (modulePath.match(/\.[a-zA-Z]+$/)) {
    return modulePath;
  }

  function tryCompletePath(resolvePath) {
    for (let i = 0; i < EXTS.length; i++) {
      let tryPath = resolvePath(EXTS[i]);
      if (fs.existsSync(tryPath)) {
        return tryPath;
      }
    }
  }

  function reportModuleNotFoundError(modulePath) {
    throw "module not found: " + modulePath;
  }

  if (isDirectory(modulePath)) {
    const tryModulePath = tryCompletePath((ext) =>
      path.join(modulePath, "index" + ext)
    );
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  } else if (!EXTS.some((ext) => modulePath.endsWith(ext))) {
    const tryModulePath = tryCompletePath((ext) => modulePath + ext);
    if (!tryModulePath) {
      reportModuleNotFoundError(modulePath);
    } else {
      return tryModulePath;
    }
  }
  return modulePath;
}

/**
 *
 * @param {string} curModulePath
 * @param {string} requirePath
 * @returns {string} 返回requirePath相对于curModulePath的完整路径
 */
function moduleResolver(curModulePath, requirePath) {
  // requirePath 的绝对路径
  requirePath = path.resolve(path.dirname(curModulePath), requirePath);

  // 过滤掉第三方模块
  if (requirePath.includes("node_modules")) {
    return "";
  }

  requirePath = completeModulePath(requirePath);

  if (visitedModules.has(requirePath)) {
    return "";
  } else {
    visitedModules.add(requirePath);
  }
  return requirePath;
}

/**
 *
 * @param {string} curModulePath 模块路径
 * @param {*} dependencyGraphNode 模块信息节点
 * @param {Object} allModules 所有模块集合,一个对象
 */
function traverseJsModule(curModulePath, dependencyGraphNode, allModules) {
  // 1.根据 curModulePath 读取文件内容
  const moduleFileContent = fs.readFileSync(curModulePath, {
    encoding: "utf-8",
  });

  // 2.在节点信息中保存路径
  dependencyGraphNode.path = curModulePath;

  // 3 解析内容为AST
  const ast = parser.parse(moduleFileContent, {
    sourceType: "unambiguous",
    plugins: resolveBabelSyntaxPlugins(curModulePath),
  });

  // 4.遍历AST
  traverse(ast, {
    // 4.1遍历 import 语句
    ImportDeclaration(path) {
      // 4.1.1 获取引用模块的路径
      const subModulePath = moduleResolver(
        curModulePath,
        path.get("source.value").node
      );
      if (!subModulePath) {
        return;
      }

      // 4.1.2 获取引用模块的指定变量
      const specifierPaths = path.get("specifiers");
      dependencyGraphNode.imports[subModulePath] = specifierPaths.map(
        (specifierPath) => {
          // import {bar as boo, foo} from './index'; 这种方式引入
          if (specifierPath.isImportSpecifier()) {
            return {
              type: IMPORT_TYPE.deconstruct, // 类型
              imported: specifierPath.get("imported").node.name, // 引用进来的名称
              local: specifierPath.get("local").node.name, // 作用域别名
            };
            // import b from 'index'; 这种方式引入
          } else if (specifierPath.isImportDefaultSpecifier()) {
            return {
              type: IMPORT_TYPE.default, // 类型
              local: specifierPath.get("local").node.name, // 作用域别名
            };
            // import * as f from 'index'; 这种方式引入
          } else {
            return {
              type: IMPORT_TYPE.namespace, // 类型
              local: specifierPath.get("local").node.name, // 作用域别名
            };
          }
        }
      );

      const subModule = new DependencyNode();
      // 4.1.3 递归继续遍历子模块
      traverseJsModule(subModulePath, subModule, allModules);
      dependencyGraphNode.subModules[subModule.path] = subModule;
    },

    // 4.2遍历导出语句
    ExportDeclaration(path) {
      // export {a} 这种方式导出
      if (path.isExportNamedDeclaration()) {
        const specifiers = path.get("specifiers");
        dependencyGraphNode.exports = specifiers.map((specifierPath) => ({
          type: EXPORT_TYPE.named,  // 类型
          exported: specifierPath.get("exported").node.name, // 导出名
          local: specifierPath.get("local").node.name, // 导出别名
        }));
      
      // export default a; 这种方式导出
      } else if (path.isExportDefaultDeclaration()) {
        let exportName;
        const declarationPath = path.get("declaration");
        // isAssignmentExpression() 针对 export default a = bar() 这种情况
        if (declarationPath.isAssignmentExpression()) {
          exportName = declarationPath.get("left").toString();
        } else {
          exportName = declarationPath.toString();
        }
        dependencyGraphNode.exports.push({
          type: EXPORT_TYPE.default,
          exported: exportName,
        });
      
      // export const a; 这种方式导出
      } else {
        dependencyGraphNode.exports.push({
          type: EXPORT_TYPE.all,
          exported: path.get("exported").node.name,
          source: path.get("source").node.value,
        });
      }
    },
  });

  // 所有的模块信息保存到 allModules 对象中
  allModules[curModulePath] = dependencyGraphNode;
}

// 调用入口
// curModulePath 为入口文件路径
module.exports = function (curModulePath) {
  const dependencyGraph = {
    root: new DependencyNode(),
    allModules: {},
  };

  traverseJsModule(
    curModulePath,
    dependencyGraph.root,
    dependencyGraph.allModules
  );
  return dependencyGraph;
};
