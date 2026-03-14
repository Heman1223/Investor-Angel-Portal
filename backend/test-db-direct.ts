
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing direct PG connection...');
    const url = process.env.DATABASE_URL;
    console.log('URL:', url?.replace(/:[^:@]+@/, ':****@'));

    const client = new Client({
        connectionString: url,
    });

    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT 1');
        console.log('Query result:', res.rows);
    } catch (err: any) {
        console.error('Connection failed:', err.message);
        console.error('Error detail:', err);
    } finally {
        await client.end();
    }
}

test();
