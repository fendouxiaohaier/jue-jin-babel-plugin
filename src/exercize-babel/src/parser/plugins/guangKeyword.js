const acorn = require("acorn");

const Parser = acorn.Parser;
const tt = acorn.tokTypes;
const TokenType = acorn.TokenType;

// 注册一个新的 token 类型来标识它
Parser.acorn.keywordTypes["guang"] = new TokenType("guang", {
  keyword: "guang",
});

module.exports = function (Parser) {
  return class extends Parser {
    // 1. 添加一个keyword
    parse(program) {
      let newKeywords =
        "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this const class extends export import super";
      newKeywords += " guang";
      this.keywords = new RegExp(
        "^(?:" + newKeywords.replace(/ /g, "|") + ")$"
      );
      return super.parse(program);
    }

    parseStatement(context, topLevel, exports) {
      var startType = this.type;

      // 当前处理到的 token 的类型,识别出 token 的类型为 guang 的时候，就组装成一个 AST
      if (startType == Parser.acorn.keywordTypes["guang"]) {
        var node = this.startNode();
        return this.parseGuangStatement(node);
      } else {
        // 不是我们扩展的 token，则调用父类的 parseStatement 处理
        return super.parseStatement(context, topLevel, exports);
      }
    }

    parseGuangStatement(node) {
      // 消费这个 token
      this.next();
      // 组装一个新的token
      return this.finishNode(Object.assign(node, { value: "guang" }), "GuangStatement");
    }
  };
};
