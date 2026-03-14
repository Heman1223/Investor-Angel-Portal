import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function myFetch(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
  } catch (err) {
    console.error('Fetch error:', err.message);
    return { ok: false, status: 500, error: err.message };
  }
}

async function run() {
  console.log('1. Fetching a startup from the database...');
  const startup = await prisma.startup.findFirst({
    where: {
      investor: { email: 'inv1_new@test.com' }
    },
    include: { investor: true }
  });

  if (!startup) {
    console.log('No startup found to test with.');
    return;
  }
  
  console.log(`Testing with startup: ${startup.name} (${startup.id}), Owner: ${startup.investor.email}`);

  console.log('\n2. Logging in as the investor...');
  const loginRes = await myFetch('http://localhost:6001/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: startup.investor.email, password: 'Password123!' })
  });
  
  if (!loginRes.ok) {
    console.log('Login failed:', loginRes.data);
    return;
  }
  
  const token = loginRes.data.data.accessToken;
  console.log('Login successful.');

  console.log('\n3. Testing manual invite dispatch...');
  const testEmail = `test_invite_${Date.now()}@example.com`;
  const inviteRes = await myFetch(`http://localhost:6001/api/startups/${startup.id}/company-invites`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: testEmail })
  });

  console.log('Invite API Response:', {
    status: inviteRes.status,
    data: inviteRes.data
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
