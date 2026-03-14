const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function myFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function run() {
  try {
    console.log('1. Logging in as investor...');
    const loginRes = await myFetch('http://localhost:6001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'investor@portfolioos.com', password: 'Demo@2024' })
    });
    const investorToken = loginRes.data.accessToken;
    console.log('Investor login successful.');

    console.log('\n2. Creating a new startup with an invite...');
    const startupData = {
      name: `Test Startup ${Date.now()}`,
      sector: 'FinTech',
      stage: 'Seed',
      investmentDate: new Date().toISOString().split('T')[0],
      entryValuation: 5000000,
      investedAmount: 500000,
      equityPercent: 10,
      founderEmail: `founder_${Date.now()}@example.com`
    };
    
    const createRes = await myFetch('http://localhost:6001/api/startups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${investorToken}` },
      body: JSON.stringify(startupData)
    });
    const startupId = createRes.data.id || createRes.data._id;
    console.log('Startup created successfully:', startupId);

    console.log('\n3. Waiting briefly for invite to be created...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n4. Fetching the invite from DB...');
    const invite = await prisma.companyInvite.findFirst({
      where: { startupId, email: startupData.founderEmail },
      orderBy: { invitedAt: 'desc' }
    });
    console.log('Invite found:', invite ? invite.token : 'NOT FOUND');

    if (invite) {
      console.log('\n5. Creating the founder account and accepting the invite...');
      const registerRes = await myFetch('http://localhost:6001/api/auth/register/company', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Founder',
          email: startupData.founderEmail,
          password: 'Password123!',
          inviteToken: invite.token
        })
      });
      const founderToken = registerRes.data.accessToken;
      console.log('Founder account created & invite accepted.');

      console.log('\n6. Checking founder dashboard...');
      const dashRes = await myFetch('http://localhost:6001/api/company/me/startups', {
        headers: { Authorization: `Bearer ${founderToken}` }
      });
      const companies = dashRes.data;
      console.log(`Founder has access to ${companies.length} company/companies.`);
      if (companies.length > 0) {
        console.log(`Company name: ${companies[0].name}, Status: ${companies[0].status}`);
      }

      console.log('\n7. Checking investor dashboard to see if startup became active...');
      const invDashRes = await myFetch('http://localhost:6001/api/startups', {
        headers: { Authorization: `Bearer ${investorToken}` }
      });
      const updatedStartup = invDashRes.data.find(s => s.id === startupId || s._id === startupId);
      console.log(`Startup status for investor: ${updatedStartup.status}`);
    }

  } catch (err) {
    console.error('Test failed:');
    console.error(err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
