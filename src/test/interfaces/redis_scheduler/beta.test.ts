import { expect } from 'chai';
import { GetClient } from '@ajs.local/redis/beta';
import {
  setHandler,
  addTask,
  removeTask,
  enableListener,
  disableListener,
  runTasks,
} from '@ajs.local/redis_scheduler/beta';

const RedisKey = 'SchedulerUtil.Tasks';

async function cleanupRedis() {
  const client = await GetClient();
  await client.del(RedisKey);
}

describe('Redis Scheduler - setHandler', () => {
  it('should register a handler', async () => RegisterHandlerTest());
  it('should reject handler names containing :', async () => RejectColonInNameTest());
});

describe('Redis Scheduler - addTask', () => {
  it('should add a task to the sorted set', async () => AddTaskTest());
  it('should throw for unknown handler', async () => AddTaskUnknownHandlerTest());
});

describe('Redis Scheduler - removeTask', () => {
  it('should remove a task from the sorted set', async () => RemoveTaskTest());
  it('should throw for unknown handler', async () => RemoveTaskUnknownHandlerTest());
});

describe('Redis Scheduler - enableListener / disableListener', () => {
  it('should enable and disable the listener', async () => EnableDisableListenerTest());
});

describe('Redis Scheduler - runTasks', () => {
  it('should execute due tasks', async () => RunDueTasksTest());
  it('should not execute future tasks', async () => SkipFutureTasksTest());
});

describe('Redis Scheduler - retry logic', () => {
  it('should retry failed tasks up to 3 times', async () => RetryFailedTasksTest());
});

async function RegisterHandlerTest() {
  let called = false;
  setHandler('test-register', () => {
    called = true;
  });
  expect(called).to.equal(false);
}

async function RejectColonInNameTest() {
  try {
    setHandler('invalid:name', () => {});
    expect.fail('should have thrown');
  } catch (err) {
    expect((err as Error).message).to.include('may not contain');
  }
}

async function AddTaskTest() {
  await cleanupRedis();
  setHandler('test-add', () => {});

  const dueTime = Date.now() + 60000;
  await addTask('test-add', dueTime, 'task-data');

  const client = await GetClient();
  const members = await client.zrange(RedisKey, 0, -1);
  expect(members).to.include('test-add:task-data');

  await cleanupRedis();
}

async function AddTaskUnknownHandlerTest() {
  try {
    await addTask('nonexistent-handler', Date.now(), 'data');
    expect.fail('should have thrown');
  } catch (err) {
    expect((err as Error).message).to.include('Unknown SchedulerUtil handler');
  }
}

async function RemoveTaskTest() {
  await cleanupRedis();
  setHandler('test-remove', () => {});

  const client = await GetClient();
  await client.zadd(RedisKey, Date.now() + 60000, 'test-remove:remove-data');

  await removeTask('test-remove', 'remove-data');

  const members = await client.zrange(RedisKey, 0, -1);
  expect(members).to.not.include('test-remove:remove-data');

  await cleanupRedis();
}

async function RemoveTaskUnknownHandlerTest() {
  try {
    await removeTask('nonexistent-handler', 'data');
    expect.fail('should have thrown');
  } catch (err) {
    expect((err as Error).message).to.include('Unknown SchedulerUtil handler');
  }
}

async function EnableDisableListenerTest() {
  await enableListener();
  await disableListener();
}

async function RunDueTasksTest() {
  await cleanupRedis();
  const results: string[] = [];
  setHandler('test-run', (taskInfo: string) => {
    results.push(taskInfo);
  });

  const client = await GetClient();
  await client.zadd(RedisKey, Date.now() - 1000, 'test-run:payload1');
  await client.zadd(RedisKey, Date.now() - 500, 'test-run:payload2');

  await runTasks();

  expect(results).to.include('payload1');
  expect(results).to.include('payload2');

  const remaining = await client.zrange(RedisKey, 0, -1);
  expect(remaining).to.have.length(0);

  await cleanupRedis();
}

async function SkipFutureTasksTest() {
  await cleanupRedis();
  const results: string[] = [];
  setHandler('test-future', (taskInfo: string) => {
    results.push(taskInfo);
  });

  const client = await GetClient();
  await client.zadd(RedisKey, Date.now() + 60000, 'test-future:future-data');

  await runTasks();

  expect(results).to.have.length(0);

  const remaining = await client.zrange(RedisKey, 0, -1);
  expect(remaining).to.have.length(1);

  await cleanupRedis();
}

async function RetryFailedTasksTest() {
  await cleanupRedis();
  let callCount = 0;
  setHandler('test-retry', () => {
    callCount++;
    throw new Error('intentional failure');
  });

  const client = await GetClient();
  await client.zadd(RedisKey, Date.now() - 1000, 'test-retry:retry-data');

  await runTasks();
  expect(callCount).to.equal(1);

  const retryMembers = await client.zrange(RedisKey, 0, -1);
  expect(retryMembers).to.have.length(1);
  expect(retryMembers[0]).to.match(/^RETRY-1:test-retry:retry-data$/);

  await cleanupRedis();
}
