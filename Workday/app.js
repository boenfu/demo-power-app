const { PowerApp } = require("@makeflow/sdk");
const isToday = require("date-fns/isToday");
const startOfToday = require("date-fns/startOfToday");

const app = new PowerApp();

app.version("0.1.0", {
  contributions: {
    powerItems: {
      WorkDay: {
        action: {
          async create({ inputs }) {
            try {
              let {
                task,
                assignee: { id: currentUser, displayName },
                receiver: { id: receiver },
                team: { id: team },
                procedure: { id: procedure }
              } = inputs;

              await app.emitChanges(
                "power-glance",
                {
                  [currentUser]: startOfToday().getTime()
                },
                async ({ storage, api }) => {
                  let tasksDict = storage.get("task") || {};

                  let tasks = Object.values(tasksDict).filter(
                    ({ user, completedAt }) =>
                      user === currentUser && isToday(completedAt)
                  );
                  await api.createTask({
                    team,
                    procedure,
                    brief: `${new Date().toLocaleDateString()} ${displayName} 的每日报表`,
                    description: `今日完成任务数:${tasks.length}\n${tasks
                      .map(({ brief, num }) => `#${num} - ${brief}`)
                      .join("\n")}`,
                    assignee: receiver,
                    associatedTasks: [{ type: "blocked-by", task }]
                  });
                }
              );

              return {
                stage: "done"
              };
            } catch (error) {}
          }
        }
      }
    },
    powerGlances: {
      WorkDay: {
        initialize: handler,
        change: handler
      }
    }
  }
});

async function handler({ resources, storage }) {
  let tasksDict = storage.get() || {};

  tasksDict.task = tasksDict.task || {};

  for (let {
    ref: { id },
    inputs: { brief, num, assignee, completedAt },
    removed
  } of resources) {
    completedAt = Number(completedAt);

    if (removed || !isToday(completedAt) || !assignee) {
      delete tasksDict.task[id];
      continue;
    }

    let user = assignee.id;

    tasksDict.task[id] = { brief, num, user, completedAt };

    tasksDict[user] = startOfToday().getTime();
  }

  await storage.set(tasksDict);
}

// start

app.koa({
  port: 9003
});
