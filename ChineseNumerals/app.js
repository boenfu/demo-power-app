const { PowerApp } = require("@makeflow/sdk");
const toCN = require("./toCN");

let app = new PowerApp();

app.version("0.1.0", {
  contributions: {
    powerItems: {
      turn: {
        update({ inputs }) {
          return {
            outputs: {
              "cn:result": toCN(inputs.number)
            }
          };
        }
      }
    }
  }
});

app.serve({
  port: 9003
});
