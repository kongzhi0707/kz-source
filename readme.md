### node 实现切换源

#### 1）设置源的命名为:

```
npm config set registry  源地址
```

比如我们想设置淘宝镜像，使用命令：npm config set registry https://registry.npm.taobao.org
如果我们想设置 npm 的镜像的话，我们使用命令：npm config set registry https://registry.npmjs.org

#### 2）查看 npm 的 registry 配置项命令如下

```
npm config get registry
```

<a href="https://github.com/kongzhi0707/v-cli#id4">nodejs 编写 cli 命令行工具</a> 可以看之前的文章

因此会使用到如下几个工具：

```
{
  "dependencies": {
    "chalk": "^4.0.0",
    "commander": "^11.1.0",
    "inquirer": "^8.0.0",
    "node-http-ping": "^0.3.1"
  }
}
```

node-http-ping 是 ping 网址的一个库。

最后我的 package.json 配置项如下：

```
{
  "name": "kz-source",
  "version": "1.0.0",
  "description": "npm 切换源",
  "main": "index.js",
  "bin": {
    "kz-source": "./src/index.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "npm",
    "cnpm",
    "yarn"
  ],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "chalk": "^4.0.0",
    "commander": "^11.1.0",
    "inquirer": "^8.0.0",
    "node-http-ping": "^0.3.1"
  }
}
```

目录结构如下:

```
|--- src
| |--- index.js
|--- package.json
|--- registries.json
```

registries.json 是一个 json 数据，默认有哪些源，代码如下：

```
{
  "npm": {
    "home": "https://www.npmjs.org",
    "registry": "https://registry.npmjs.org/",
    "ping": "https://registry.npmjs.org"
  },
  "cnpm": {
    "home": "https://cnpmjs.org",
    "registry": "https://r.cnpmjs.org/",
    "ping": "https://r.cnpmjs.org"
  },
  "taobao": {
    "home": "https://registry.npm.taobao.org",
    "registry": "https://registry.npm.taobao.org/",
    "ping": "https://registry.npm.taobao.org"
  }
}
```

src/index.js 就是我们编写的命令行工具代码。编写完成后，我们执行 npm link, 将当前的代码 软链接到 npm 全局目录下, npm 检测到 package.json 里面存在一个 bin 字段, 它会在全局 npm 包下生存一个可执行文件.

#### 1）kz-source 命令 查看所有可用的命令

我们在命令中执行 kz-source 命令，可以看到有如下命令：

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/1.png" /> <br />

使用 kz-source -V 可以获取到当前的版本号。

#### 2）kz-source ls 查看所有的源

我们可以使用 kz-source ls 查看所有的源，如下：

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/2.png" /> <br />

默认就是我们的 registries.json 默认的配置三个源地址，前面的带 星号 说明是当前的源。

#### 3）kz-source current 命令查看当前的源

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/3.png" /> <br />

#### 4）kz-source use 切换当前的源

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/4.png" /> <br />

当我们选择淘宝源的时候，我们再查看当前的源，是淘宝源，然后查看所有的源，星号 在淘宝上，说明淘宝是当前的源。

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/5.png" /> <br />

#### 5）kz-source ping 测试速度

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/6.png" /> <br />

#### 6）kz-source add 增加一个自定义源

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/7.png" /> <br />

#### 7) kz-source rename 重命名自定义名称

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/8.png" /> <br />

#### 8）kz-source edit 编辑自定义源地址

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/9.png" /> <br />

#### 9）kz-source delete 删除自定义源

<img src="https://raw.githubusercontent.com/kongzhi0707/kz-source/master/images/10.png" /> <br />

src/index.js 所有代码如下(也是参考网上资料的)：

```
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
```
