const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.dstlxhupmtclrumvojzi:v2C8JiNKvp2hS1wJ@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});
client.connect()
  .then(() => console.log('Connected to pooler successfully with rejectUnauthorized: false'))
  .catch(e => {
    console.error('Failed to connect to pooler:');
    console.error(e);
  })
  .finally(() => client.end());
