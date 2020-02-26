const { PowerApp } = require("@makeflow/sdk");
const differenceInDays = require("date-fns/differenceInDays");
const endOfDay = require("date-fns/endOfDay");

const app = new PowerApp();

app.version("0.1.0", {
  contributions: {
    powerGlances: {
      chart: {
        initialize: handler,
        change: handler
      }
    }
  }
});

async function handler({ resources, storage, configs }) {
  let tasksDict = storage.get() || {};

  for (let {
    ref: { id },
    inputs: { completedAt },
    removed
  } of resources) {
    if (removed) {
      delete tasksDict[id];
      continue;
    }

    tasksDict[id] = completedAt || 0;
  }

  await storage.set(tasksDict);

  let { days, start } = configs;

  return getChartData({ days, start, tasks: Object.values(tasksDict) });
}

function getChartData({ days, start, tasks = [] }) {
  if (!days || !start || !tasks) {
    return {};
  }

  days = Number(days);
  start = Number(start);

  let max = tasks.length;

  let arr = Object.keys(Array(days + 1).fill(0));

  let labels = arr.map((t, index) => {
    let date = new Date(start + 86400000 * t);

    return {
      label: `${!index ? `${date.getFullYear()}-` : ""}${date.getMonth() +
        1}-${date.getDate()}`,
      date: Number(date.getTime())
    };
  });

  let today = Number(endOfDay(Date.now()).getTime());
  let values = Array(days + 1).fill(0);
  let count = max;

  for (let taskCompletedAt of tasks) {
    if (!taskCompletedAt) {
      continue;
    }

    values[differenceInDays(taskCompletedAt, start)] += 1;
  }

  values = values.map((size, index) =>
    today >= labels[index].date ? (count -= size) : undefined
  );

  let part = max / days;

  let target = arr.map(t => max - part * t);

  return {
    dataSet: [
      {
        name: "burndown",
        data: {
          tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b}日 : 剩余{c}任务"
          },
          xAxis: {
            name: "日期",
            type: "category",
            data: labels.map(({ label }) => label)
          },
          grid: {
            left: "4%",
            right: "10%",
            bottom: "2%",
            containLabel: true
          },
          yAxis: {
            type: "value",
            name: "任务数量",
            max
          },
          series: [
            {
              name: "目标进度",
              type: "line",
              data: target
            },
            {
              name: "实际进度",
              type: "line",
              data: values
            }
          ]
        }
      }
    ]
  };
}

// start

app.koa({
  port: 9003
});
