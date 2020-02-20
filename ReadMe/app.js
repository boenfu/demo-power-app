const PATH = require("path");

const Koa = require("koa");
const static = require("koa-static");
const Router = require("koa-router");

const { PowerApp } = require("@makeflow/sdk");

const app = new Koa();

app.use(static(PATH.join(__dirname, "./static")));

// power app

const powerApp = new PowerApp({
  db: {
    type: "mongo",
    options: {
      uri: "mongodb://mongo:27017",
      name: "readme"
    }
  }
});

powerApp.version("0.1.0", {
  contributions: {
    powerItems: {
      readme: {
        async activate({ inputs, storage }) {
          await storage.set({
            [inputs.user.id]: inputs.link
          });
        }
      }
    }
  }
});

// router

let router = new Router();

router.get("/confirm", ctx => {
  let { link, user } = ctx.query;

  try {
    user = JSON.parse(user).id;

    let params = {
      [user]: JSON.parse(link)
    };

    powerApp.emitChanges("power-item", params, async ({ storage, api }) => {
      await storage.set(user, undefined);
      await api.updatePowerItem({ stage: "done" });
    });

    ctx.body = "ok";
  } catch (error) {
    ctx.body = error;
  }
});

app.use(router.routes());

// start

powerApp.koaWith(app, {
  path: "/mf",
  port: 9003
});
