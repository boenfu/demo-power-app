const PATH = require('path');

const Koa = require('koa');
const Static = require('koa-static');
const Router = require('koa-router');

const {PowerApp} = require('@makeflow/sdk');

const app = new Koa();

app.use(Static(PATH.join(__dirname, './static')));

// power app

const powerApp = new PowerApp({
  // 使用 mongo 做 db
  db: {
    type: 'mongo',
    options: {
      uri: 'mongodb://mongo:27017',
      name: 'readme',
    },
  },
});

powerApp.version('0.1.0', {
  contributions: {
    powerItems: {
      readme: {
        // 存储用户ID 和要读的 链接地址
        async activate({inputs, storage}) {
          await storage.set({
            [inputs.user.id]: inputs.link,
          });
        },
      },
    },
  },
});

// router

let router = new Router();

// 确认阅读页的请求地址
router.get('/confirm', async ctx => {
  let {link, user} = ctx.query;

  try {
    user = JSON.parse(user).id;

    // 匹配对应用户 ID 和 链接的 power item
    for await (let {storage, api} of powerApp.getContextIterable('power-item', {
      storage: {[user]: JSON.parse(link)},
    })) {
      await storage.set(user, undefined);
      // 完成对应超级项
      await api.updatePowerItem({stage: 'done'});
    }

    ctx.body = 'ok';
  } catch (error) {
    ctx.body = error;
  }
});

app
  .use(router.routes())
  // 设置中间件的 path
  .use(powerApp.koa('/mf'))
  .listen(9003);
