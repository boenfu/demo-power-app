const crypto = require("crypto");
const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");

const { PowerApp } = require("@makeflow/sdk");

const app = new Koa();

// power app

const powerApp = new PowerApp();

powerApp.version("0.1.0", {
  installation: {
    activate: handler,
    update: handler
  }
});

async function handler({ storage, configs: { procedures, team, ...rest } }) {
  try {
    await storage.set({
      ...rest,
      procedure: procedures[0].id,
      team: team.id
    });
  } catch (error) {}
}

// router

let router = new Router();

router.post("/git", async ctx => {
  let {
    header: { "x-github-event": event, "x-hub-signature": signature },
    body
  } = ctx.request;

  let {
    action,
    issue,
    repository: { full_name }
  } = body;

  if (event !== "issues" || action !== "opened") {
    ctx.body = "ok";
    return;
  }

  await powerApp.emitChanges(
    "installation",
    { repo: full_name },
    async ({ storage, api }) => {
      let secret = storage.get("secret");

      if (
        signature.replace("sha1=", "") !==
        crypto
          .createHmac("sha1", secret)
          .update(JSON.stringify(body))
          .digest("hex")
      ) {
        return;
      }

      let team = storage.get("team");
      let procedure = storage.get("procedure");

      let { title: brief, body: description } = issue;

      await api.createTask({ team, procedure, brief, description });
    }
  );

  ctx.body = "ok";
});

app.use(bodyParser()).use(router.routes());

// start

powerApp.koaWith(app, {
  port: 9003
});
