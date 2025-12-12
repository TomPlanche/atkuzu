import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const keyValueStore = sqliteTable('key_value_store', {
	key: text('key').primaryKey(),
	value: text('value'),
	storeName: text('storeName'),
	createdAt: integer({ mode: 'timestamp' }) // Date
});


export const sessionStore = sqliteTable('session_store', {
	id: text('id').primaryKey(),
	//Not leaving unique since it could be multiple logins from the same user across browsers
	did: text('did').notNull(),
	handle: text('handle').notNull(),
	createdAt: integer({ mode: 'timestamp' }).notNull(), // Date
	expiresAt: integer({ mode: 'timestamp' }).notNull() // Date

});