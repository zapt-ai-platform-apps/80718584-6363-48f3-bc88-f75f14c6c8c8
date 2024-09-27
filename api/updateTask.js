import { tasks } from '../drizzle/schema.js';
import { authenticateUser } from "./_apiUtils.js"
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const user = await authenticateUser(req);

    const { id, completed } = req.body;

    if (typeof id === 'undefined' || typeof completed === 'undefined') {
      return res.status(400).json({ error: 'Task ID and completion status are required' });
    }
    
    const sql = neon(process.env.NEON_DB_URL);
    const db = drizzle(sql);

    const result = await db.update(tasks)
      .set({ completed })
      .where(eq(tasks.id, id), eq(tasks.userId, user.id))
      .returning();

    res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.status(500).json({ error: 'Error updating task' });
    }
  }
}