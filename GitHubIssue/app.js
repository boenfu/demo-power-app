const crypto = require('crypto');
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const {PowerApp} = require('@makeflow/sdk');

const app = new Koa();

const powerApp = new PowerApp();

// 定义版本
powerApp.version('0.1.0', {
  // 监听 App 安装的钩子，将配置存入 storage
  installation: {
    async activate({storage, configs: {procedures, team, ...rest}}) {
      await storage.set({
        ...rest,
        procedure: procedures[0].id,
        team: team.id,
      });
    },
    async update({storage, configs: {procedures, team, ...rest}}) {
      await storage.set({
        ...rest,
        procedure: procedures[0].id,
        team: team.id,
      });
    },
  },
});

// router

let router = new Router();

// 接收 GitHub WebHook 的路由
// 见 GitHub 文档 https://developer.github.com/webhooks/

router.post('/git', async ctx => {
  let {
    header: {
      // 事件类型
      'x-github-event': event,
      // secret 加密后的 签名
      'x-hub-signature': signature,
    },
    body,
  } = ctx.request;

  let {
    action,
    issue,
    repository: {full_name},
  } = body;

  // 不是打开 issue 的 hook 不处理
  if (event !== 'issues' || action !== 'opened') {
    ctx.body = 'ok';
    return;
  }

  // 查找 storage 中 和 hook 的仓库名匹配的安装信息
  for await (let {storage, api} of powerApp.getContextIterable('installation', {
    storage: {
      repo: full_name,
    },
  })) {
    let secret = storage.get('secret');

    // 验证 makeflow 应用设置页填入的密钥
    if (
      signature.replace('sha1=', '') !==
      crypto
        .createHmac('sha1', secret)
        .update(JSON.stringify(body))
        .digest('hex')
    ) {
      continue;
    }

    let team = storage.get('team');
    let procedure = storage.get('procedure');

    let {title: brief, body: description} = issue;

    // 调用 api 创建 任务
    await api.createTask({team, procedure, brief, description});
  }

  ctx.body = 'ok';
});

app
  .use(bodyParser())
  .use(powerApp.koa())
  .use(router.routes())
  .listen(9003);
