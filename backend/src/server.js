import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';

await connectDatabase();
const server = app.listen(env.PORT, () => console.info(`Ostras Rewards API listening on ${env.PORT}`));

async function shutdown(signal) {
  console.info(`${signal} received; closing API.`);
  server.close(async () => {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
