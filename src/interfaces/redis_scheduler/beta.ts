import { RegisteringProxy } from '@ajs/core/beta';
import { GetClient } from '@ajs.local/redis/beta';
import { RedisClientType } from 'redis';

/**
 * Handler function type for processing scheduled tasks
 * @param taskInfo - A string containing the task data, typically JSON-formatted
 */
type HandlerType = (taskInfo: string) => void | Promise<void>;

/** Redis key used to store scheduled tasks in a sorted set */
const RedisKey = 'SchedulerUtil.Tasks';

/** Map of registered task handlers by name */
const handlers = new Map<string, HandlerType>();
/** Proxy for registering/unregistering task handlers */
const proxy = new RegisteringProxy<(handlerName: string, handler: HandlerType) => void>();
proxy.onRegister((handlerName: string, handler: HandlerType) => {
  if (handlerName.indexOf(':') !== -1) {
    throw new Error('SchedulerUtil handler name may not contain `:`');
  }
  handlers.set(handlerName, handler);
}, true);
proxy.onUnregister((handlerName) => {
  handlers.delete(handlerName);
});

/**
 * Registers a handler function for a specific task type
 *
 * @param handlerName - Unique identifier for the task type (must not contain ':')
 * @param handler - Function that processes tasks of this type
 *
 * @example
 * ```typescript
 * import { setHandler } from '@ajs/redis_scheduler/1';
 *
 * // Register a handler for email tasks
 * setHandler('send-email', async (taskInfo) => {
 *   const emailData = JSON.parse(taskInfo);
 *   await sendEmail({
 *     to: emailData.recipient,
 *     subject: emailData.subject,
 *     body: emailData.body
 *   });
 * });
 * ```
 */
export function setHandler(handlerName: string, handler: HandlerType) {
  proxy.register(handlerName, handler);
}

/** Redis subscriber client for receiving task updates */
let subscriber: RedisClientType;

/**
 * Enables the task execution listener
 * This starts monitoring for scheduled tasks and executes them when due
 *
 * @example
 * ```typescript
 * import { enableListener } from '@ajs/redis_scheduler/1';
 *
 * // During application startup
 * async function startApp() {
 *   // Register task handlers
 *   // ...
 *
 *   // Start the task listener
 *   await enableListener();
 *   console.log('Task scheduler is now active');
 * }
 * ```
 */
export async function enableListener() {
  subscriber = (await GetClient()).duplicate();

  await subscriber.subscribe('SchedulerUtil', (message, channel) => {
    if (channel === 'SchedulerUtil') {
      switch (message) {
        case 'update':
          void updateTimer();
          break;
      }
    }
  });

  void updateTimer();
}

/**
 * Disables the task execution listener
 * This stops the scheduler from processing any further tasks
 *
 * @example
 * ```typescript
 * import { disableListener } from '@ajs/redis_scheduler/1';
 *
 * // During application shutdown
 * async function stopApp() {
 *   await disableListener();
 *   console.log('Task scheduler stopped');
 * }
 * ```
 */
export async function disableListener() {
  await subscriber.disconnect();
}

/**
 * Schedules a task to be executed at a specific time
 *
 * @param handlerName - The registered handler name that will process this task
 * @param dueTime - Unix timestamp (milliseconds) when the task should be executed
 * @param taskInfo - String containing any data needed by the handler (typically JSON)
 * @throws Error if the handler name is not registered
 *
 * @example
 * ```typescript
 * import { addTask } from '@ajs/redis_scheduler/1';
 *
 * // Schedule a task for future execution
 * async function schedulePasswordReminder(userId: string) {
 *   // Schedule for 3 days from now
 *   const dueTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
 *
 *   const taskInfo = JSON.stringify({
 *     userId,
 *     type: 'password_reminder',
 *     createdAt: new Date().toISOString()
 *   });
 *
 *   await addTask('send-email', dueTime, taskInfo);
 *   console.log(`Password reminder scheduled for user ${userId}`);
 * }
 * ```
 */
export async function addTask(handlerName: string, dueTime: number, taskInfo: string) {
  if (!handlers.has(handlerName)) {
    throw new Error('Unknown SchedulerUtil handler: ' + handlerName);
  }

  const client = await GetClient();
  await client.zAdd(RedisKey, { score: dueTime, value: handlerName + ':' + taskInfo });
  if (!locked) {
    void client.publish('SchedulerUtil', 'update');
  }
}

/**
 * Removes a previously scheduled task
 *
 * @param handlerName - The handler name associated with the task
 * @param taskInfo - The exact task info string used when scheduling the task
 * @throws Error if the handler name is not registered
 *
 * @example
 * ```typescript
 * import { removeTask } from '@ajs/redis_scheduler/1';
 *
 * // Cancel a previously scheduled reminder
 * async function cancelReminder(userId: string) {
 *   const taskInfo = JSON.stringify({
 *     userId,
 *     type: 'password_reminder',
 *     createdAt: '2023-04-05T12:00:00.000Z' // Must match exactly
 *   });
 *
 *   await removeTask('send-email', taskInfo);
 *   console.log(`Reminder canceled for user ${userId}`);
 * }
 * ```
 */
export async function removeTask(handlerName: string, taskInfo: string) {
  if (!handlers.has(handlerName)) {
    throw new Error('Unknown SchedulerUtil handler: ' + handlerName);
  }
  const client = await GetClient();
  await client.zRem(RedisKey, taskInfo);
}

/** Flag to prevent concurrent task execution */
let locked = false;
/** Timer for scheduling the next task check */
let timer: NodeJS.Timeout;

/**
 * Updates the timer for the next task execution
 * This is called internally whenever the task schedule changes
 */
export async function updateTimer() {
  if (locked) {
    return;
  }

  const client = await GetClient();
  const taskInfo = (await client.zRange(RedisKey, 0, 0))[0];
  if (taskInfo) {
    const score = (await client.zScore(RedisKey, taskInfo))!;
    if (score < Date.now()) {
      await runTasks();
    } else {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => void runTasks(), Math.min(score - Date.now(), 86400000));
    }
  }
}

/**
 * Executes all due tasks
 * This is called internally by the timer when tasks are due for execution
 * It includes automatic retry logic for failed tasks
 */
export async function runTasks() {
  locked = true;
  const client = await GetClient();
  const tasks = await client.zRange(RedisKey, Date.now(), 0, { REV: true, BY: 'SCORE' });
  if (tasks.length > 0) {
    await client.zRem(RedisKey, tasks);
    for (const task of tasks) {
      const m = task.match(/^(?:RETRY-(\d)+:)?([^:]*):(.*)$/);
      try {
        if (m && handlers.has(m[2])) {
          await handlers.get(m[2])!(m[3]);
        }
      } catch (err) {
        console.error(err);
        if (m) {
          const retryCount = m[1] ? parseInt(m[1]) : 0;
          if (retryCount < 3) {
            await client.zAdd(RedisKey, {
              score: Date.now() + 5000,
              value: `RETRY-${retryCount + 1}:${m[2]}:${m[3]}`,
            });
          }
        }
      }
    }
  }
  locked = false;
  await updateTimer();
}
