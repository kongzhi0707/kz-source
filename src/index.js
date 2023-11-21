#!/usr/bin/env node

const { program } = require('commander');

// 引入package.json
const PKG = require('../package.json');

// 引入初始源
const registries = require('../registries.json');

const inquirer = require('inquirer');

// 子线程用于执行shell命令
const { exec, execSync } = require('child_process');

// ping 网址的一个库
const ping = require('node-http-ping');

const fs = require('fs');
const chalk = require('chalk'); // console 变颜色
const path = require('path');
program.version(PKG.version); // 设置版本默认命令 -V --version

const whiteList = ['npm', 'cnpm', 'taobao']; // 白名单

// 获取当前源地址 比如 https://registry.npmjs.org/
const getOrigin = async () => {
  return await execSync('npm get registry', { encoding: "utf-8" })
};

// 列出所有的源，如果当前有在使用前面加上 *
program.command('ls').description('查看所有的源').action(async () => {
  const rets = await getOrigin();
  const keys = Object.keys(registries);
  const message = [];

  /**
   * 获取源的key的最大长度 + 3 的含义，
   * 比如淘宝源，最后变成 *taobao-- https://registry.npm.taobao.org/
   * 如果是 npm 源的话，最后拼接成 * npm---- https://registry.npmjs.org/
   */
  const max = Math.max(...keys.map(v => v.length)) + 3;

  keys.forEach(k => {
    // 如果是当前的源的话，前面加一个星号，代表是当前的源
    const newK = registries[k].registry == rets.trim() ? ('* ' + k) : (' ' + k);
    const arrs = new Array(...newK);
    arrs.length = max;
    const prefix = Array.from(arrs).map(v => v ? v : '-').join('');

    message.push(prefix + ' ' + registries[k].registry);
  })
  console.log(message.join('\n'));
});

// 切换源
program.command('use').description('请切换源').action(() => {
  inquirer.prompt([
    {
      type: 'list',
      name: 'selectSource',
      message: "请选择源",
      choices: Object.keys(registries)
    }
  ]).then(result => { 
    const reg = registries[result.selectSource].registry;
    exec(`npm config set registry ${reg}`, null, (err, stdout, stderr) => { 
      if (err) {
        console.error('切换错误', err);
      } else { 
        console.log('切换成功');
      }
    })
  })
});

// 查看当前的源
program.command('current').description('查看当前源').action(async () => {
  const reg = await getOrigin();
  const v = Object.keys(registries).find(k => { 
    if (registries[k].registry === reg.trim()) { 
      return k;
    }
  })
  if (v) {
    console.log(chalk.blue('当前的源:', v));
  } else { 
    console.log(chalk.green('当前的源:', reg));
  }
});

// ping 源
program.command('ping').description('测试源地址的速度').action(() => { 
  inquirer.prompt([
    {
      type: 'list',
      name: 'selectSource',
      message: '请选择源',
      choices: Object.keys(registries)
    }
  ]).then(result => {
    const url = registries[result.selectSource].ping.trim();
    ping(url).then(time => console.log(chalk.blue(`响应时长: ${time}ms`))).catch(() => console.log(chalk.red('--时间超时---')))
  });
})

// 添加源 读写 registries.json 文件实现
program.command('add').description('添加源').action(() => {
  inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '请输入源名称',
      validate(answer) { 
        const keys = Object.keys(registries);
        if (keys.includes(answer)) { 
          return `不能起名${answer}跟保留字冲突`;
        }
        if (!answer) { 
          return '名称不能为空';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'url',
      message: '请输入源地址',
      validate(answer) { 
        if (!answer) { 
          return '源地址不能为空';
        }
        return true;
      }
    }
  ]).then(result => { 
    const del = (url) => { 
      const arr = url.split('');
      return arr[arr.length - 1] === '/' ? arr.pop() && arr.join('') : arr.join('');
    }
    registries[result.name] = {
      home: result.url.trim(),
      registry: result.url.trim(),
      ping: del(result.url.trim()), // 去掉末尾的 / 
    }
    try {
      fs.writeFileSync(path.join(__dirname, '../registries.json'), JSON.stringify(registries, null, 4));
      console.log(chalk.blue('添加完成'));
    } catch (e) { 
      console.log(chalk.red(e));
    }
  })
});

// 删除自定义的源
program.command('delete').description('删除自定义的源').action(() => { 
  const keys = Object.keys(registries);
  if (keys.length === whiteList.length) {
    return console.log(chalk.red('当前无自定义源可以删除'));
  } else { 
    // 删除 白名单中不存在的源，也就是我们自定义的源
    const diff = keys.filter((key) => !whiteList.includes(key));
    inquirer.prompt([
      {
        type: "list",
        name: "sel",
        message: '请选择要删除的源',
        choices: diff
      }
    ]).then(async result => { 
      const current = await getOrigin();
      const setOrigin = registries[result.sel];
      if (current.trim() == setOrigin.registry.trim()) {
        console.log(chalk.red(`当前还在使用该源${registries[result.sel].registry}, 请切换其他源，然后进行删除`));
      } else { 
        try { 
          delete registries[result.sel];
          // 重新写入文件里面
          fs.writeFileSync(path.join(__dirname, '../registries.json'), JSON.stringify(registries, null, 4));
          console.log(chalk.green('SUCCESS 操作完成'));
        } catch (e) {
          console.log(chalk.red(e));
        }
      }
    })
  }
})

// 重命名自定义源名称
program.command('rename').description('重命名自定义源名称').action(() => { 
  const keys = Object.keys(registries);
  if (keys.length === whiteList.length) {
    return console.log(chalk.red('当前无自定义的源可以重命名'));
  } else { 
    const diff = keys.filter((key) => !whiteList.includes(key));
    inquirer.prompt([
      {
        type: "list",
        name: 'sel',
        message: '请选择源名称',
        choices: diff
      },
      {
        type: "input",
        name: "rename",
        message: '请输入新的源名称',
        validate(answer) { 
          const keys = Object.keys(registries);
          if (keys.includes(answer)) { 
            return console.log(chalk.red(`不能起名${answer}, 已存在该源名称`));
          }
          if (!answer.trim()) { 
            return console.log(chalk.red('源名不能为空'));
          }
          return true;
        }
      }
    ]).then(async result => { 
      registries[result.rename] = Object.assign({}, registries[result.sel]);
      delete registries[result.sel];

      try {
        fs.writeFileSync(path.join(__dirname, '../registries.json'), JSON.stringify(registries, null, 4));
        console.log(chalk.greenBright(`SUCCESS 重命名完成 ${result.rename}`));
      } catch (e) { 
        console.log(chalk.red(e));
      }
    })
  }
})

// 编辑自定义源地址
program.command('edit').description('编辑自定义源地址').action(async () => { 
  const keys = Object.keys(registries);
  if (keys.length === whiteList.length) { 
    return console.log(chalk.red('当前无自定义源可以编辑'));
  }
  const diff = keys.filter((key) => !whiteList.includes(key));
  const { sel } = await inquirer.prompt([
    {
      type: "list",
      name: "sel",
      message: "请选择需要编辑的源",
      choices: diff
    }
  ]);
  const { registerUrl } = await inquirer.prompt([{
    type: "input",
    name: "registerUrl",
    message: "输入修改后的源地址",
    default: () => registries[sel].registry,
    validate(registerUrl) { 
      if (!registerUrl.trim()) { 
        return '源地址不能为空';
      }
      return true;
    }
  }])
  const del = (url) => { 
    const arr = url.split('');
    return arr[arr.length - 1] === '/' ? arr.pop() && arr.join('') : arr.join('');
  }
  registries[sel] = {
    home: registerUrl.trim(),
    registry: registerUrl.trim(),
    ping: del(registerUrl.trim())
  }
  try {
    fs.writeFileSync(path.join(__dirname, '../registries.json'), JSON.stringify(registries, null, 4));
    console.log(chalk.blue('修改完成'));
  } catch (e) { 
    console.log(chalk.red(e));
  }
})

program.parse(process.argv);