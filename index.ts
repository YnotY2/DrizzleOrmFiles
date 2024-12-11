// This file is responsible for initiating client conn
// to the database. We are using postgres.js async library
// When using with Drizzle it will be non I/O blocking natively

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

// Ensure the DATABASE_URL is available in the environment variables
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Create a connection to the PostgreSQL database using postgres.js
const client = postgres(env.DATABASE_URL);

// Initialize the Drizzle ORM client with the postgres.js client
export const db = drizzle(client); // This allows the Drizzle client instance to be used across the application
