const { declare } = require("@babel/helper-plugin-utils");

function resolveType(targetType, referenceTypesMap = {}) {
  const tsTypeAnnotationMap = {
    TSStringKeyword: "string",
    TSNumberKeyword: "number",
  };
  switch (targetType.type) {
    case "TSTypeAnnotation":
      if (targetType.typeAnnotation.type === "TSTypeReference") {
        return referenceTypesMap[targetType.typeAnnotation.typeName.name];
      }
      return tsTypeAnnotationMap[targetType.typeAnnotation.type];
    case "NumberTypeAnnotation":
      return "number";
    case "StringTypeAnnotation":
      return "string";
    case "TSNumberKeyword":
      return "number";
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
      CallExpression(path, state) {
        const errors = state.file.get("errors");
        
        // 获取调用时泛型参数类型
        const realTypes = path.node.typeParameters.params.map((item) => {
          return resolveType(item);
        });

        // 获取实参类型集合
        const argumentsTypes = path.get("arguments").map((item) => {
          return resolveType(item.getTypeAnnotation());
        });

        // 获取函数引用
        const calleeName = path.get("callee").toString();
        const functionDeclarePath = path.scope.getBinding(calleeName).path;

        // 将泛型参数与类型对应起来放入realTypeMap
        const realTypeMap = {};
        functionDeclarePath.node.typeParameters.params.map((item, index) => {
          realTypeMap[item.name] = realTypes[index];
        });

        // 收集函数形参的参数类型，以数组形式放入declareParamsTypes
        const declareParamsTypes = functionDeclarePath
          .get("params")
          .map((item) => {
            return resolveType(item.getTypeAnnotation(), realTypeMap);
          });

        // 进行对比
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
