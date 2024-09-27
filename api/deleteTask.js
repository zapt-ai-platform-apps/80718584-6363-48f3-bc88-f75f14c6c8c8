import { tasks } from '../drizzle/schema.js';
import { authenticateUser } from "./_apiUtils.js"
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const user = await authenticateUser(req);

    const { id } = req.body;

    if (typeof id === 'undefined') {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const sql = neon(process.env.NEON_DB_URL);
    const db = drizzle(sql);

    await db.deleteFrom(tasks)
      .where(eq(tasks.id, id), eq(tasks.userId, user.id));

    res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.status(500).json({ error: 'Error deleting task' });
    }
  }
}