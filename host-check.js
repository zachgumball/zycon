import { MongoClient } from 'mongodb';

const username = 'renethia';
const password = 'zeta2514';
const dbName = 'zynext_counter';
const hosts = [
  'cluster0-shard-00-00.fhhk8.mongodb.net:27017',
  'cluster0-shard-00-01.fhhk8.mongodb.net:27017',
  'cluster0-shard-00-02.fhhk8.mongodb.net:27017',
];

async function testHost(host) {
  const uri = `mongodb://${username}:${password}@${host}/${dbName}?tls=true&directConnection=true&authSource=admin&retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  try {
    console.log(`Testing ${host}`);
    await client.connect();
    console.log(`  ✅ Connected to ${host}`);
    const db = client.db(dbName);
    const hello = await db.command({ hello: 1 });
    console.log(`  ✅ hello: isWritablePrimary=${hello.isWritablePrimary || hello.ismaster || false}, secondary=${hello.secondary || false}, setName=${hello.setName}`);
  } catch (error) {
    console.error(`  ❌ ${host}:`, error.message);
  } finally {
    await client.close();
  }
}

(async () => {
  for (const host of hosts) {
    await testHost(host);
  }
})();
