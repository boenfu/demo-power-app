const {PowerApp} = require('@makeflow/sdk');
const isToday = require('date-fns/isToday');
const startOfToday = require('date-fns/startOfToday');

const app = new PowerApp();

app.version('0.1.0', {
  contributions: {
    powerItems: {
      WorkDay: {
        action: {
          async create({inputs}) {
            try {
              let {
                task,
                assignee: {id: currentUser, displayName},
                receiver: {id: receiver},
                team: {id: team},
                procedure: {id: procedure},
              } = inputs;

              // 匹配任务负责人今日有完成任务的概览
              for await (let {storage, api} of app.getContextIterable(
                'power-glance',
                {
                  storage: {
                    [currentUser]: startOfToday().getTime(),
                  },
                },
              )) {
                let tasksDict = storage.get('task') || {};

                let tasks = Object.values(tasksDict).filter(
                  ({user, completedAt}) =>
                    user === currentUser && isToday(completedAt),
                );

                //创建任务
                await api.createTask({
                  team,
                  procedure,
                  brief: `${new Date().toLocaleDateString()} ${displayName} 的每日报表`,
                  description: `今日完成任务数:${tasks.length}\n${tasks
                    .map(({brief, num}) => `#${num} - ${brief}`)
                    .join('\n')}`,
                  assignee: receiver,
                  associatedTasks: [{type: 'blocked-by', task}],
                });
              }

              return {
                stage: 'done',
              };
            } catch (error) {}
          },
        },
      },
    },
    powerGlances: {
      WorkDay: {
        initialize: onGlanceHook,
        change: onGlanceHook,
      },
    },
  },
});

async function onGlanceHook({resources, storage}) {
  let tasksDict = storage.get() || {};

  tasksDict.task = tasksDict.task || {};

  // 记录完成的任务的情况
  for (let {
    ref: {id},
    inputs: {brief, num, assignee, completedAt},
    removed,
  } of resources) {
    completedAt = Number(completedAt);

    if (removed || !isToday(completedAt) || !assignee) {
      delete tasksDict.task[id];
      continue;
    }

    let user = assignee.id;

    tasksDict.task[id] = {brief, num, user, completedAt};

    tasksDict[user] = startOfToday().getTime();
  }

  await storage.set(tasksDict);
}

// start

app.serve({
  port: 9003,
});
