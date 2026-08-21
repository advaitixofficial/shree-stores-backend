import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
  const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shree-stores';
  // Standardize the URL to connect to the shree-stores-test database
  let testUri = baseUri;
  if (baseUri.includes('?')) {
    const [path, query] = baseUri.split('?');
    testUri = path.replace(/\/([^/]*)$/, '/shree-stores-test') + '?' + query;
  } else {
    testUri = baseUri.replace(/\/([^/]*)$/, '/shree-stores-test');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.connection.close();
  }
});

beforeEach(async () => {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      // Skip system collections
      if (collection.collectionName.startsWith('system.')) continue;
      await collection.deleteMany({});
    }
  }
});
