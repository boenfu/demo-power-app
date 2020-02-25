const PATH = require("path");
const FS = require("fs");

const Koa = require("koa");
const static = require("koa-static");
const Router = require("koa-router");

const { PowerApp } = require("@makeflow/sdk");

const app = new Koa();

app.use(static(PATH.join(__dirname, "./static")));

// mock db

const db = { installation: 0, powerItem: 0 };

// power app

const powerApp = new PowerApp();

powerApp.version("0.1.0", {
  installation: {
    activate() {
      db.installation += 1;
    }
  },
  contributions: {
    powerItems: {
      demo: {
        activate() {
          db.powerItem += 1;
        }
      }
    }
  }
});

// router

let router = new Router();

router.get("/getStatistics", ctx => {
  let definition = JSON.parse(
    FS.readFileSync(PATH.resolve(__dirname, "power-app.json"), "utf-8")
  );

  definition.statistics = db;
  ctx.body = definition;
});

app.use(router.routes());

// start

powerApp.koaWith(app, {
  port: 9003
});
