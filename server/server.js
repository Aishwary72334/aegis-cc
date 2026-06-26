import app from './app.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const PORT = process.env.PORT || 5002;

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` AEGIS SECURE ENGINE ONLINE              `);
  console.log(` Port: ${PORT}                            `);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'} `);
  console.log(` Timestamp: ${new Date().toISOString()}  `);
  console.log(`=========================================`);
});

// Graceful shutdown listeners for process security
const shutdown = () => {
  console.log('[AEGIS Secure Engine] Initiating shutdown sequence...');
  server.close(() => {
    console.log('[AEGIS Secure Engine] Server terminated safely.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
