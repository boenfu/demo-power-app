const {PowerApp} = require('@makeflow/sdk');
const differenceInDays = require('date-fns/differenceInDays');
const endOfDay = require('date-fns/endOfDay');

const app = new PowerApp();

app.version('0.1.0', {
  contributions: {
    powerGlances: {
      chart: {
        initialize: onGlanceHook,
        change: onGlanceHook,
      },
    },
  },
});

async function onGlanceHook({resources, storage, configs}) {
  let tasksDict = storage.get() || {};

  // 将概览的任务信息都存储进 storage
  for (let {
    ref: {id},
    inputs: {completedAt},
    removed,
  } of resources) {
    if (removed) {
      delete tasksDict[id];
      continue;
    }

    // 值为 undefined 的属性 在 storage 序列化后会被舍弃
    // 所以我们用 0 占位
    tasksDict[id] = completedAt || 0;
  }

  await storage.set(tasksDict);

  let {days, start} = configs;

  return getChartData({days, start, tasks: Object.values(tasksDict)});
}

// 构建 燃尽图 (echarts 的图标) 的 options

function getChartData({days, start, tasks = []}) {
  if (!days || !start || !tasks) {
    return {};
  }

  days = Number(days);
  start = Number(start);

  let max = tasks.length;

  let tempArray = Object.keys(Array(days + 1).fill(0));

  // x 轴刻度
  let labels = tempArray.map((t, index) => {
    let date = new Date(start + 86400000 * t);

    return {
      label: `${!index ? `${date.getFullYear()}-` : ''}${date.getMonth() +
        1}-${date.getDate()}`,
      date: Number(date.getTime()),
    };
  });

  // 实际完成任务线条数据
  let values = Array(days + 1).fill(0);
  let today = Number(endOfDay(Date.now()).getTime());
  let count = max;

  for (let taskCompletedAt of tasks) {
    if (!taskCompletedAt) {
      continue;
    }

    values[differenceInDays(taskCompletedAt, start)] += 1;
  }

  values = values.map((size, index) =>
    today >= labels[index].date ? (count -= size) : undefined,
  );

  let part = max / days;

  // 目标数据
  let targetData = tempArray.map(t => max - Math.round(part * t));

  return {
    dataSet: [
      {
        // name 与 应用定义中的 reports > elements > dataName 对应
        name: 'burndown',
        // 图表类型的 element，data 就是 echarts 的 options
        data: {
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}日 : 剩余{c}任务',
          },
          xAxis: {
            name: '日期',
            type: 'category',
            data: labels.map(({label}) => label),
          },
          grid: {
            left: '4%',
            right: '10%',
            bottom: '2%',
            containLabel: true,
          },
          yAxis: {
            type: 'value',
            name: '任务数量',
            max,
          },
          series: [
            {
              name: '目标进度',
              type: 'line',
              data: targetData,
            },
            {
              name: '实际进度',
              type: 'line',
              data: values,
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
