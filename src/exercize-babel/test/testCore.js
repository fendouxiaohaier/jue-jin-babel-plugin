const { transformSync } = require("../src/core/index");

const sourceCode = `
const d = 2;
const e = 4;

function add(a, b) {
    const tmp = 1;
    return a + b;
}

add(c, d);`;

/**
 * @description 替换调用方法中的字面量名称为options.replaceName
 * @param {*} api
 * @param {*} options
 * @returns
 */
function plugin1(api, options) {
  return {
    visitor: {
      Identifier(path) {
        if (path.findParent((p) => p.isCallExpression())) {
          path.replaceWith(api.template.expression(options.replaceName));
        }
      },
    },
  };
}

/**
 * 删除没用引用的变量和函数中没有引用的变量
 * @param {*} api
 * @param {*} options
 * @returns
 */
function plugin2(api, options) {
  return {
    visitor: {
      Program(path) {
        Object.entries(path.scope.bindings).forEach(([id, binding]) => {
          if (!binding.referenced) {
            binding.path.remove();
          }
        });
      },
      FunctionDeclaration(path) {
        Object.entries(path.scope.bindings).forEach(([id, binding]) => {
          if (!binding.referenced) {
            binding.path.remove();
          }
        });
      },
    },
  };
}

/**
 * 插件集
 * @returns
 */
function preset1() {
  return [
    [
      plugin1,
      {
        replaceName: "ddddd",
      },
    ],
    [plugin2],
  ];
}

function preset2(api, options) {
  if (options.target === "chrome") {
    return [
      [
        plugin1,
        {
          replaceName: "ddddd",
        },
      ],
    ];
  } else {
    return [[plugin2]];
  }
}

const { code, map } = transformSync(sourceCode, {
  parserOpts: {
    plugins: ["literal"],
  },
  fileName: "foo.js",
  // plugins: [
  //   [
  //     plugin1,
  //     {
  //       replaceName: "ddddd",
  //     },
  //   ],
  // ],
  presets: [
    // [preset1],
    [
      preset2,
      {
        target: "chrome",
      },
    ],
  ],
});

console.log(code);
// console.log(map);
