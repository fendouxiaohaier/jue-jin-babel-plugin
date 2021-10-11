const { declare } = require("@babel/helper-plugin-utils");

function resolveType(targetType) {
  const tsTypeAnnotationMap = {
    TSStringKeyword: "string",
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
      // 遍历赋值表达式
      AssignmentExpression(path, state) {
        const errors = state.file.get("errors");

        // 获取右侧值得类型
        const rightType = resolveType(path.get("right").getTypeAnnotation());
        // 获取赋值左侧的token
        const leftBinding = path.scope.getBinding(path.get("left"));
        // 获取左侧变量关联类型
        const leftType = resolveType(
          leftBinding.path.get("id").getTypeAnnotation()
        );
        // 类型不一致则记录
        if (leftType !== rightType) {
          const tmp = Error.stackTraceLimit;
          Error.stackTraceLimit = 0;
          errors.push(
            path
              .get("right")
              .buildCodeFrameError(
                `${rightType} can not assign to ${leftType}`,
                Error
              )
          );
          Error.stackTraceLimit = tmp;
        }
      },
    },
    post(file) {
      console.log(file.get("errors"));
    },
  };
});

module.exports = noFuncAssignLint;
