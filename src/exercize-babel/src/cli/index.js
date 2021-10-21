#!/usr/bin/env node

const commander = require("commander");
const glob = require("glob");
const { cosmiconfigSync } = require("cosmiconfig");
const fsPromises = require('fs').promises;
const path = require('path');
const myBabel = require('../core');

// 注册命令行参数
commander.option("--out-dir <outDir>", "输出目录");
commander.option("--watch", "监听文件变动");

commander.parse(process.argv);

// 对参数验证
if (process.argv.length <= 2) {
  commander.outputHelp();
  process.exit(0);
}

const cliOpts = commander.opts();

// 验证第一个参数
if (!commander.args[0]) {
  console.error("没有指定待编译文件");
  commander.outputHelp();
  process.exit(1);
}

// 验证第二个参数
if (!cliOpts.outDir) {
  console.error("没有指定输出目录");
  commander.outputHelp();
  process.exit(1);
}

// 对 glob 字符串做解析，拿到具体的文件路径
const filenames = glob.sync(commander.args[0]);

// 查找babel的配置文件
const explorerSync = cosmiconfigSync("myBabel");
const searchResult = explorerSync.search();
// 验证是否存在babel配置文件
if (!searchResult) {
  console.error("没有babel配置文件");
  commander.outputHelp();
  process.exit(1);
}

// 整合所有的配置项
const options = {
  babelOptions: searchResult.config,
  cliOptions: {
    ...cliOpts,
    filenames,
  },
};

/**
 * 定义编译的方法
 * @param {*} fileNames
 */
function compile(fileNames) {
  fileNames.forEach(async (filename) => {
    const fileContent = await fsPromises.readFile(filename, "utf-8");
    const baseFileName = path.basename(filename);
    const sourceMapFileName = baseFileName + ".map.json";

    // 编译的过程
    const res = myBabel.transformSync(fileContent, {
      ...options.babelOptions,
      fileName: baseFileName,
    });
    // 解析完成后将sourceMapUrl加在目标代码后面
    const generatedFile =
      res.code + "\n" + "//# sourceMappingURL=\n" + sourceMapFileName;

    //如果目录不存在则创建
    try {
      await fsPromises.access(options.cliOptions.outDir);
    } catch (e) {
      await fsPromises.mkdir(options.cliOptions.outDir);
    }
    // 拼接输出的路径
    const distFilePath = path.join(options.cliOptions.outDir, baseFileName);
    const distSourceMapPath = path.join(
      options.cliOptions.outDir,
      baseFileName + ".map.json"
    );

    await fsPromises.writeFile(distFilePath, generatedFile);
    await fsPromises.writeFile(distSourceMapPath, res.map);
  });
}

// 监听文件变化
// if (cliOpts.watch) {
//   const chokidar = require("chokidar");

//   chokidar.watch(commander.args[0]).on("all", (event, path) => {
//     console.log("检测到文件变动，编译：" + path);
//     compile([path]);
//   });
// }

// 开始执行编译代码
compile(options.cliOptions.filenames);
