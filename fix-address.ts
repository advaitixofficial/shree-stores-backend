import { connectDatabase } from './src/config/database';
import { Address } from './src/models/Address';

async function run() {
  await connectDatabase();
  const result = await Address.updateMany({}, { latitude: 25.3176, longitude: 82.9739 });
  console.log('Fixed addresses:', result);
  process.exit(0);
}
run().catch(console.error);
