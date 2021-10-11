const { transformFromAstSync } = require('@babel/core');
const  parser = require('@babel/parser');
const typeCheckerPlugin = require('./plugin/call-type-checker');

const sourceCode = `
    function add(a: number, b: number): number{
        return a + b;
    }
    add(1, '2');
`;

const ast = parser.parse(sourceCode, {
    sourceType: 'unambiguous',
    plugins: ['typescript']
});

const { code } = transformFromAstSync(ast, sourceCode, {
    plugins: [[typeCheckerPlugin, {
        fix: true
    }]],
    comments: true
});
