import app, { ensureDbReady } from '../server/index.js';

export default async function handler(req, res) {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
  return app(req, res);
}
