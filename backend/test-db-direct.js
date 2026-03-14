
const { Client } = require('pg');
require('dotenv').config();

async function test() {
    console.log('Testing direct PG connection via IP...');
    // Using IP directly to bypass DNS issues
    const connectionString = "postgresql://postgres.dstlxhupmtclrumvojzi:v2C8JiNKvp2hS1wJ@3.39.47.126:5432/postgres?sslmode=no-verify";
    console.log('URL:', connectionString.replace(/:[^:@]+@/, ':****@'));

    const client = new Client({
        connectionString: connectionString,
        connectionTimeoutMillis: 5000, 
    });

    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT 1');
        console.log('Query result:', res.rows);
    } catch (err) {
        console.error('Connection failed:', err.message);
        console.error('Error detail:', err);
    } finally {
        await client.end();
    }
}

test();
