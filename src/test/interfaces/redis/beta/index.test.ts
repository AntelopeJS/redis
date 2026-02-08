import { expect } from 'chai';
import { GetClient } from '@ajs.local/redis/beta';

describe('Redis Interface - GetClient', () => {
  it('should return a functional Redis client', async () => GetClientTest());
});

describe('Redis Interface - Key/Value Operations', () => {
  it('should set and get a value', async () => SetGetTest());
  it('should delete a key', async () => DelTest());
  it('should return null for non-existent key', async () => GetNonExistentTest());
});

describe('Redis Interface - Hash Operations', () => {
  it('should set and get hash fields', async () => HSetHGetTest());
  it('should get all hash fields', async () => HGetAllTest());
  it('should delete a hash field', async () => HDelTest());
});

describe('Redis Interface - List Operations', () => {
  it('should push and pop from list', async () => ListPushPopTest());
  it('should get a range of list elements', async () => LRangeTest());
});

describe('Redis Interface - Sorted Set Operations', () => {
  it('should add and retrieve sorted set members', async () => ZAddZRangeTest());
  it('should get score of a member', async () => ZScoreTest());
  it('should remove a member', async () => ZRemTest());
});

describe('Redis Interface - Expiration', () => {
  it('should set expiration and check TTL', async () => ExpireTTLTest());
});

describe('Redis Interface - Pub/Sub', () => {
  it('should publish and receive messages', async () => PubSubTest());
});

async function GetClientTest() {
  const client = await GetClient();
  expect(client.set).to.be.a('function');
  expect(client.get).to.be.a('function');
  expect(client.del).to.be.a('function');
  expect(client.duplicate).to.be.a('function');
}

async function SetGetTest() {
  const client = await GetClient();
  await client.set('test:key', 'hello');
  const value = await client.get('test:key');
  expect(value).to.equal('hello');
  await client.del('test:key');
}

async function DelTest() {
  const client = await GetClient();
  await client.set('test:del', 'value');
  const deleted = await client.del('test:del');
  expect(deleted).to.equal(1);
  const value = await client.get('test:del');
  expect(value).to.equal(null);
}

async function GetNonExistentTest() {
  const client = await GetClient();
  const value = await client.get('test:nonexistent');
  expect(value).to.equal(null);
}

async function HSetHGetTest() {
  const client = await GetClient();
  await client.hset('test:hash', 'field1', 'value1');
  const value = await client.hget('test:hash', 'field1');
  expect(value).to.equal('value1');
  await client.del('test:hash');
}

async function HGetAllTest() {
  const client = await GetClient();
  await client.hset('test:hash:all', 'name', 'Alice');
  await client.hset('test:hash:all', 'age', '30');
  const all = await client.hgetall('test:hash:all');
  expect(all).to.deep.equal({ name: 'Alice', age: '30' });
  await client.del('test:hash:all');
}

async function HDelTest() {
  const client = await GetClient();
  await client.hset('test:hash:del', 'field', 'value');
  await client.hdel('test:hash:del', 'field');
  const value = await client.hget('test:hash:del', 'field');
  expect(value).to.equal(null);
  await client.del('test:hash:del');
}

async function ListPushPopTest() {
  const client = await GetClient();
  await client.lpush('test:list', 'a');
  await client.rpush('test:list', 'b');
  const left = await client.lpop('test:list');
  const right = await client.rpop('test:list');
  expect(left).to.equal('a');
  expect(right).to.equal('b');
}

async function LRangeTest() {
  const client = await GetClient();
  await client.rpush('test:list:range', 'a', 'b', 'c');
  const range = await client.lrange('test:list:range', 0, -1);
  expect(range).to.deep.equal(['a', 'b', 'c']);
  await client.del('test:list:range');
}

async function ZAddZRangeTest() {
  const client = await GetClient();
  await client.zadd('test:zset', 1, 'a');
  await client.zadd('test:zset', 2, 'b');
  await client.zadd('test:zset', 3, 'c');
  const members = await client.zrange('test:zset', 0, -1);
  expect(members).to.deep.equal(['a', 'b', 'c']);
  await client.del('test:zset');
}

async function ZScoreTest() {
  const client = await GetClient();
  await client.zadd('test:zset:score', 42, 'member');
  const score = await client.zscore('test:zset:score', 'member');
  expect(Number(score)).to.equal(42);
  await client.del('test:zset:score');
}

async function ZRemTest() {
  const client = await GetClient();
  await client.zadd('test:zset:rem', 1, 'a');
  await client.zadd('test:zset:rem', 2, 'b');
  await client.zrem('test:zset:rem', 'a');
  const members = await client.zrange('test:zset:rem', 0, -1);
  expect(members).to.deep.equal(['b']);
  await client.del('test:zset:rem');
}

async function ExpireTTLTest() {
  const client = await GetClient();
  await client.set('test:expire', 'temp');
  await client.expire('test:expire', 10);
  const ttl = await client.ttl('test:expire');
  expect(ttl).to.be.greaterThan(0);
  expect(ttl).to.be.at.most(10);
  await client.del('test:expire');
}

async function PubSubTest() {
  const client = await GetClient();
  const subscriber = client.duplicate();

  const received: string[] = [];
  await subscriber.subscribe('test:channel');
  subscriber.on('message', (_channel: string, message: string) => {
    received.push(message);
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  await client.publish('test:channel', 'hello');
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(received).to.deep.equal(['hello']);
  await subscriber.unsubscribe('test:channel');
  await subscriber.quit();
}
