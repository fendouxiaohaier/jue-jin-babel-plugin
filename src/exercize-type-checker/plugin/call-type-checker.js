const { declare } = require("@babel/helper-plugin-utils");

function resolveType(targetType) {
  const tsTypeAnnotationMap = {
    TSStringKeyword: "string",
    TSNumberKeyword: "number",
  };
  switch (targetType.type) {
    case "TSTypeAnnotation":
      return tsTypeAnnotationMap[targetType.typeAnnotation.type];
    case "NumberTypeAnnotation":
      return "number";
    case "StringTypeAnnotation":
      return "string";
  }
}

function noStackTraceWrapper(cb) {
  const tmp = Error.stackTraceLimit;
  Error.stackTraceLimit = 0;
  cb && cb(Error);
  Error.stackTraceLimit = tmp;
}

const noFuncAssignLint = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set("errors", []);
    },
    visitor: {
      // 对调用表达式进行遍历
      CallExpression(path, state) {
        const errors = state.file.get("errors");

        // path.get("arguments") 为获取调用参数
        // argumentsTypes: 所有调用参数的类型集合
        const argumentsTypes = path.get("arguments").map((item) => {
          return resolveType(item.getTypeAnnotation());
        });
        // 获取关联的函数token
        const calleeName = path.get("callee").toString();
        const functionDeclarePath = path.scope.getBinding(calleeName).path;
      
        // functionDeclarePath.get("params") 获取函数声明的参数token
        // declareParamsTypes: 获取到函数声明参数的类型集合
        const declareParamsTypes = functionDeclarePath
          .get("params")
          .map((item) => {
            return resolveType(item.getTypeAnnotation());
          });

        // 调用参数和声明参数类型进行对比，一旦出现类型不同，则进行提示
        argumentsTypes.forEach((item, index) => {
          if (item !== declareParamsTypes[index]) {
            noStackTraceWrapper((Error) => {
              errors.push(
                path
                  .get("arguments." + index)
                  .buildCodeFrameError(
                    `${item} can not assign to ${declareParamsTypes[index]}`,
                    Error
                  )
              );
            });
          }
        });
      },
    },
    post(file) {
      console.log(file.get("errors"));
    },
  };
});

module.exports = noFuncAssignLint;
