import { pgTable, serial, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  userId: uuid('user_id').notNull(),
});