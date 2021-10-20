const parser = require("../parser");
const template = require("../../util/template");
const { traverse } = require("../traverse");
const generate = require('../../util/Printer');

function transformSync(code, options) {
  // 第一步，解析为AST
  const ast = parser.parse(code, options.parserOpts);

  // 第二步， 根据plugin和preset合并visitor
  const pluginApi = {
    template,
  };
  const visitors = {};
  // 合并plugin
  options.plugins &&
    options.plugins.forEach(([plugin, options]) => {
      const res = plugin(pluginApi, options);
      Object.assign(visitors, res.visitor);
    });

  // 合并preset
  options.presets &&
    options.presets.reverse().forEach(([preset, options]) => {
      const plugins = preset(pluginApi, options);
      plugins.forEach(([plugin, options]) => {
        const res = plugin(pluginApi, options);
        Object.assign(visitors, res.visitor);
      });
    });

  // 第三步，遍历AST
  traverse(ast, visitors);

  // 第四步，生成目标代码和source-map
  return generate(ast, code, options.fileName);
}

module.exports = {
  transformSync,
};
