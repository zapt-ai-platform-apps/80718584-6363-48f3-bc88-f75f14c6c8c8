import { tasks } from '../drizzle/schema.js';
import { authenticateUser } from "./_apiUtils.js"
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const user = await authenticateUser(req);

    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Task description is required' });
    }
    
    const sql = neon(process.env.NEON_DB_URL);
    const db = drizzle(sql);

    const result = await db.insert(tasks).values({ 
      description, 
      userId: user.id
    }).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error saving task:', error);
    if (error.message.includes('Authorization') || error.message.includes('token')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.status(500).json({ error: 'Error saving task' });
    }
  }
}