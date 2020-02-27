const PATH = require('path');
const FS = require('fs');

const Koa = require('koa');
const Static = require('koa-static');
const Router = require('koa-router');

const {PowerApp} = require('@makeflow/sdk');

const app = new Koa();

app.use(Static(PATH.join(__dirname, './static')));

// 模拟的统计数据的存储库

const db = {installation: 0, powerItem: 0};

// power app

const powerApp = new PowerApp();

powerApp.version('0.1.0', {
  installation: {
    // 每次安装 + 1
    activate() {
      db.installation += 1;
    },
  },
  contributions: {
    powerItems: {
      demo: {
        // 每次激活 + 1
        activate() {
          db.powerItem += 1;
        },
      },
    },
  },
});

// router

let router = new Router();

router.get('/getStatistics', ctx => {
  let definition = JSON.parse(
    FS.readFileSync(PATH.resolve(__dirname, 'power-app.json'), 'utf-8'),
  );

  definition.statistics = db;
  ctx.body = definition;
});

app
  .use(router.routes())
  .use(powerApp.koa())
  .listen(9003);
