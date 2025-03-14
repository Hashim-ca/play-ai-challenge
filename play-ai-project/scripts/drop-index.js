// Script to drop the problematic index
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function dropIndex() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    
    // List all indexes on the chats collection
    console.log('Current indexes on chats collection:');
    const indexes = await db.collection('chats').indexes();
    console.log(indexes);
    
    // Drop the problematic index
    try {
      await db.collection('chats').dropIndex('messages.id_1');
      console.log('Successfully dropped messages.id_1 index');
    } catch (error) {
      console.error('Error dropping index:', error.message);
    }
    
    // Verify indexes after dropping
    console.log('Indexes after drop operation:');
    const updatedIndexes = await db.collection('chats').indexes();
    console.log(updatedIndexes);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

dropIndex().catch(console.error); 