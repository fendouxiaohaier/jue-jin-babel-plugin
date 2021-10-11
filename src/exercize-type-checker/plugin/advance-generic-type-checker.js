const { declare } = require("@babel/helper-plugin-utils");

function typeEval(node, params) {
  let checkType;
  if (node.checkType.type === "TSTypeReference") {
    checkType = params[node.checkType.typeName.name];
  } else {
    checkType = resolveType(node.checkType);
  }
  const extendsType = resolveType(node.extendsType);
  if (checkType === extendsType || checkType instanceof extendsType) {
    return resolveType(node.trueType);
  } else {
    return resolveType(node.falseType);
  }
}

// 拿例子举例 targetType 是 Res<1>
function resolveType(targetType, referenceTypesMap = {}, scope) {
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
    case "TSTypeReference":
      // typeAlias 是保存的 类型别名的香瓜信息
      const typeAlias = scope.getData(targetType.typeName.name);
      // 获取别名的参数，这里获取到Res<1>中的为1
      const paramTypes = targetType.typeParameters.params.map((item) => {
        return resolveType(item);
      });

      // typeAlias.paramNames 为类型别名中的参数信息，这里为[Param]
      // 最后获取到的params为 {Param: 1}
      const params = typeAlias.paramNames.reduce((obj, name, index) => {
        obj[name] = paramTypes[index];
        return obj;
      }, {});

      // typeAlias.body 为类型别名右侧的表单式
      return typeEval(typeAlias.body, params);
    
    // 字面量类型,直接返回值
    case "TSLiteralType":
      return targetType.literal.value;
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
      // 遍历type别名表达式,这里的作用是把类型别名相关信息保存下来
      TSTypeAliasDeclaration(path) {

        // path.get("id").toString() 获取type的名称
        // 获取别名中泛型的名称
        // 举例： type Res<Param> = Param extends 1 ? number : string;
        // path.get("id").toString() 为 Res
        // path.node.typeParameters.params.map((item) => { return item.name }) 为 别名的泛型参数名，这里为 [Param]
        path.scope.setData(path.get("id").toString(), {
          paramNames: path.node.typeParameters.params.map((item) => {
            return item.name;
          }),

          // 获取别名右侧表达式 也就是这一趴： Param extends 1 ? number : string;
          body: path.getTypeAnnotation(),
        });

        // 暂时不知道 path.get("params") 是什么东西
        // 后面也没看到用
        path.scope.setData(path.get("params"));
      },
      // 遍历函数调用表达式
      CallExpression(path, state) {
        const errors = state.file.get("errors");

        // path.node.typeParameters.params 获取泛型
        // realTypes 保存获取到的计算后的泛型类型
        // 拿 add<Res<1>>(1, '2'); 举例
        // 得到 realTypes 为 类型别名的结果 [string]
        const realTypes = path.node.typeParameters.params.map((item) => {
          // Item 是这一趴： Res<1>
          return resolveType(item, {}, path.scope);
        });

        const argumentsTypes = path.get("arguments").map((item) => {
          return resolveType(item.getTypeAnnotation());
        });
        const calleeName = path.get("callee").toString();
        const functionDeclarePath = path.scope.getBinding(calleeName).path;
        const realTypeMap = {};
        functionDeclarePath.node.typeParameters.params.map((item, index) => {
          realTypeMap[item.name] = realTypes[index];
        });
        const declareParamsTypes = functionDeclarePath
          .get("params")
          .map((item) => {
            return resolveType(item.getTypeAnnotation(), realTypeMap);
          });

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
