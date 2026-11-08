import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';

await connectDatabase();
const server = app.listen(env.PORT, () =>
  console.info(`Ostras Rewards API listening on ${env.PORT}`),
);
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.info(`${signal} received; closing API.`);
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 15000);
  deadline.unref();
  server.close(async () => {
    await mongoose.disconnect();
    clearTimeout(deadline);
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
