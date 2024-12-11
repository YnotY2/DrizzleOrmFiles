import {
	pgTable,
	varchar,
	timestamp,
	boolean,
	integer,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core'; // PostgreSQL Core Imports

// This schema.ts is basically an init-db.psql file but using Drizzle ORM syntax instead ^_^
// Drizzle ORM will ensure type-safe code across the entire project
// Drizzle ORM will handle db operations fully asynchronous.

// The lines of code under the returns for each table are called 'Indexes'
// They are used to find the direct path within the database to the data specified to fetch
// These implemented indexes greatly improve the speed of which data is exchanged within
// psql -U postgres -d database -f ./init-db.

// Users Table
export const usersTable = pgTable(
	'users',
	{
		id: varchar('id', { length: 36 }).primaryKey().default('gen_random_uuid()'),
		user_name: varchar('user_name', { length: 255 }).notNull().unique(), // Unique username for login [NOT NULL
		password_hash: varchar('password_hash', { length: 255 }).notNull(), // Hashed password [NOT NULL]
		created_at: timestamp('created_at').defaultNow(), // Default CURRENT_TIMESTAMP
		updated_at: timestamp('updated_at').defaultNow(), // Default CURRENT_TIMESTAMP
		is_active: boolean('is_active').default(true), // Soft delete flag, useful for disabling accounts
		last_login: timestamp('last_login') // Track the last time the user logged in (nullable by default)
	},
	(table) => {
		return {
			userNameIdx: uniqueIndex('user_name_idx').on(table.user_name), // Index for user_name (unique)
			lastLoginIdx: index('last_login_idx').on(table.last_login) // Index for last_login for faster search
		};
	}
);

// Sessions Table
export const sessionsTable = pgTable(
	'sessions',
	{
		id: varchar('id', { length: 64 }).primaryKey(), // Change to varchar to store hashed session ID
		user_id: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }), // Foreign Key with user-id and delrecords on cascade [NOT NULL]
		token: varchar('token', { length: 512 }).notNull().unique(), // The access token (JWT) [NOT NULL]
		refresh_token: varchar('refresh_token', { length: 512 }).notNull().unique(), // The refresh token [NOT NULL]
		created_at: timestamp('created_at').defaultNow(), // Default CURRENT_TIMESTAMP
		expires_at: timestamp('expires_at'), // When the access token expires
		revoked_at: timestamp('revoked_at'), // When the session was revoked (nullable)
		last_used_at: timestamp('last_used_at'), // Last time the session was accessed (nullable)
		user_agent: varchar('user_agent', { length: 1024 }), // Stores the user agent (browser/device info)
		ip_address: varchar('ip_address', { length: 45 }), // Stores the IP address (IPv4 and IPv6)
		status: varchar('status', { length: 50 }).default('active'), // Session status (active, revoked, expired)
		timeout_minutes: integer('timeout_minutes'), // Optional: Idle timeout before session is expired
		refresh_token_expires_at: timestamp('refresh_token_expires_at'), // Expiration time for the refresh token
		last_refresh_at: timestamp('last_refresh_at').defaultNow() // Tracks when the refresh token was last used
	},
	(table) => {
		return {
			userIdx: index('sessions_user_id_idx').on(table.user_id), // Index for user_id in sessions (unique name)
			tokenIdx: uniqueIndex('sessions_token_idx').on(table.token), // Unique index for token
			refreshTokenIdx: uniqueIndex('sessions_refresh_token_idx').on(table.refresh_token) // Unique index for refresh_token
		};
	}
);

// Password Reset Tokens Table
export const passwordResetsTable = pgTable(
	'password_resets',
	{
		id: varchar('id', { length: 36 }).primaryKey().default('gen_random_uuid()'),
		user_id: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }),
		// Foreign Key with user-id and delrecords on cascade [NOT NULL]
		reset_token: varchar('reset_token', { length: 255 }).notNull().unique(), // The token generated for changing password [NOT NULL]
		created_at: timestamp('created_at').defaultNow(), // Default CURRENT_TIMESTAMP
		expires_at: timestamp('expires_at'), // Token expiration time
		used_at: timestamp('used_at') // Mark when the token was used (nullable)
	},
	(table) => {
		return {
			userIdx: index('password_resets_user_id_idx').on(table.user_id), // Index for user_id in password_resets (unique name)
			resetTokenIdx: uniqueIndex('password_resets_reset_token_idx').on(table.reset_token) // Unique index for reset_token
		};
	}
);

// Password Change Request Logs Table
export const passwordChangeRequestsLogsTable = pgTable(
	'password_change_requests_logs',
	{
		id: varchar('id', { length: 36 }).primaryKey().default('gen_random_uuid()'),
		user_id: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }), // Foreign Key with user-id and delete records on cascade [NOT NULL]
		request_time: timestamp('request_time').defaultNow(), // When the request was made
		status: varchar('status', { length: 50 }), // Status of the request (pending, success, failed)
		ip_address: varchar('ip_address', { length: 255 }), // The IP address from which the request was made
		user_agent: varchar('user_agent', { length: 255 }) // The user agent from which the request was made
	},
	(table) => {
		return {
			userIdx: index('password_change_requests_logs_user_id_idx').on(table.user_id), // Index for user_id in logs (unique name)
			requestTimeIdx: index('password_change_requests_logs_request_time_idx').on(table.request_time) // Index for request_time
		};
	}
);

// Failed Login Attempts Table (Brute-force protection)
export const failedLoginAttemptsTable = pgTable(
	'failed_login_attempts',
	{
		id: varchar('id', { length: 36 }).primaryKey().default('gen_random_uuid()'),
		user_id: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }), // Foreign Key with user-id and cascade delete
		failed_attempts_count: integer('failed_attempt_count').default(0), // Count of failed login attempts
		last_failed_attempt: timestamp('last_failed_attempt').defaultNow(), // Timestamp of last failed attempt
		lockout_until: timestamp('lockout_until') // Timestamp of lockout duration
	},
	(table) => {
		return {
			userIdx: index('failed_login_attempts_user_id_idx').on(table.user_id), // Index for user_id in failed login attempts (unique name)
			lastFailedAttemptIdx: index('failed_login_attempts_last_failed_attempt_idx').on(
				table.last_failed_attempt
			) // Index for last_failed_attempt
		};
	}
);

// Audit Logs Table
export const auditLogsTable = pgTable(
	'audit_logs',
	{
		id: varchar('id', { length: 36 }).primaryKey().default('gen_random_uuid()'),
		user_id: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: 'cascade' }), // Foreign Key with user-id and delrecords on cascade [NOT NULL]
		ip_address: varchar('ip_address', { length: 255 }), // The IP address from which the request was made
		user_agent: varchar('user_agent', { length: 255 }), // The user agent from which the request was made
		action: varchar('action', { length: 255 }).notNull(), // Description of the action (`Account-Funded, 'Password-Changed', 'Account-Created', 'Account-Lockout') [NOT NULL]
		created_at: timestamp('created_at').defaultNow() // Default CURRENT_TIMESTAMP
	},
	(table) => {
		return {
			userIdx: index('audit_logs_user_id_idx').on(table.user_id), // Index for user_id in audit logs (unique name)
			actionIdx: index('audit_logs_action_idx').on(table.action), // Index for action
			createdAtIdx: index('audit_logs_created_at_idx').on(table.created_at) // Index for created_at
		};
	}
);


