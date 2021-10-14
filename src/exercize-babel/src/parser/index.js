const acorn = require("acorn");

const syntaxPlugins = {
  literal: require("./plugins/literal"),
  guangKeyword: require("./plugins/guangKeyword"),
};

const defaultOptions = {
  plugins: [],
};

/**
 * @description 一个基于acorn扩展的解析AST的工具
 * @param {string} code 源码
 * @param {Object} options 配置
 * @returns
 */
function parse(code, options) {
  // 1.合并配置项
  const resolvedOptions = Object.assign({}, defaultOptions, options);
  // 2.acorn 继承插件
  const newParser = resolvedOptions.plugins.reduce((Parser, pluginName) => {
    let plugin = syntaxPlugins[pluginName];
    return plugin ? Parser.extend(plugin) : Parser;
  }, acorn.Parser);
  // 3.返回解析后的AST
  return newParser.parse(code, {
    locations: true, // 要指定 locations 为 true，也就是保留 AST 在源码中的位置信息
  });
};

module.exports = { parse };
