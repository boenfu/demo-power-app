const {PowerApp} = require('@makeflow/sdk');
// 一段网上找的数字转中文的代码
const toCN = require('./toCN');

let app = new PowerApp();

app.version('0.1.0', {
  contributions: {
    powerItems: {
      turn: {
        update({inputs}) {
          return {
            // 往任务添加输出
            outputs: {
              'cn:result': toCN(inputs.number),
            },
          };
        },
      },
    },
  },
});

app.serve({
  port: 9003,
});
