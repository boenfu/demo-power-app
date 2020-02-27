const {PowerApp} = require('@makeflow/sdk');
const _ = require('lodash');

const app = new PowerApp();

app.version('0.1.0', {
  contributions: {
    powerGlances: {
      task: {
        initialize: onGlanceHook,
        change: onGlanceHook,
      },
    },
  },
});

async function onGlanceHook({resources, storage}) {
  let tasksDict = storage.get();

  // 将概览的任务信息都存储进 storage
  for (let {
    ref: {id},
    inputs: {stage, user},
    removed,
  } of resources) {
    if (removed || stage !== 'done' || !user || !user.displayName) {
      delete tasksDict[id];
      continue;
    }

    tasksDict[id] = user.displayName;
  }

  await storage.set(tasksDict);

  // {"张三": ["task1", "task2"]}
  let dataDict = _.groupBy(_.toPairs(tasksDict), '[1]');

  let data = Object.entries(dataDict).map(([name, tasks]) => ({
    value: tasks.length,
    name,
  }));

  return getPieData(data);
}

// 构建 饼图 (echarts 的图表) 的 options

function getPieData(data) {
  // https://www.echartsjs.com/examples/zh/editor.html?c=pie-simple
  return {
    dataSet: [
      {
        name: 'tasks',
        data: {
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b} : {c} 个 ({d}%)',
          },
          series: [
            {
              name: '完成比例',
              type: 'pie',
              data,
            },
          ],
        },
      },
    ],
  };
}

// start

app.serve({
  port: 9003,
});
