import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb+srv://renethia:zeta2514@cluster0.fhhk8.mongodb.net/?appName=Cluster0';
const dbName = process.env.MONGODB_DB || 'zynext_counter';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', uri.replace(/:([^:@]{4})[^:@]*@/, ':****@')); // Hide password
  console.log('DB:', dbName);

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 30000, // Increased timeout
      connectTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      maxPoolSize: 1,
      readPreference: 'primary'
    });

    console.log('Connecting...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const db = client.db(dbName);
    const collections = await db.collections();
    console.log('Collections:', collections.map(c => c.collectionName));

    // Test insert
    const testDoc = { test: true, timestamp: new Date() };
    const result = await db.collection('clients').insertOne(testDoc);
    console.log('✅ Test insert successful, ID:', result.insertedId);

    // Clean up test doc
    await db.collection('clients').deleteOne({ _id: result.insertedId });
    console.log('✅ Test cleanup successful');

    await client.close();
    console.log('✅ Connection closed.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check MongoDB Atlas dashboard - is cluster PAUSED?');
    console.log('2. Network Access: Allow 0.0.0.0/0 (for testing)');
    console.log('3. Database Access: User has "Atlas admin" role?');
    console.log('4. Connection string format correct?');
    console.log('5. Try MongoDB Compass with same connection string');
  }
}

testConnection();