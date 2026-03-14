const baseUrl = 'http://localhost:6001/api';

async function fetchApi(path: string, options: any = {}): Promise<any> {
    const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, data };
    return data;
}

async function runTest() {
    try {
        console.log("1. Registering investor...");
        const invRes = await fetchApi('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name: 'Inv1', email: 'inv1_800@test.com', password: 'password123' })
        });
        const invToken = invRes.data.accessToken;

        console.log("2. Creating startup...");
        const startupRes = await fetchApi('/startups', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Startup Test',
                sector: 'Tech',
                stage: 'Seed',
                entryValuation: 1000000,
                investedAmount: 50000,
                investmentDate: '2026-01-01',
                equityPercent: 5,
                founderName: 'Founder 1',
                founderEmail: 'founder1_800@test.com'
            }),
            headers: { Authorization: `Bearer ${invToken}` }
        });
        const startupId = startupRes.data.id;

        console.log("3. Registering founder...");
        const fndRes = await fetchApi('/auth/register/company-local', {
            method: 'POST',
            body: JSON.stringify({ name: 'Founder 1', email: 'founder1_800@test.com', password: 'password123' })
        });
        const fndToken = fndRes.data.accessToken;

        console.log("4. Getting pending invites for founder...");
        const invsRes = await fetchApi('/company/invites', {
            headers: { Authorization: `Bearer ${fndToken}` }
        });
        const invites = invsRes.data;
        if (!Array.isArray(invites) || invites.length === 0) {
            console.log("No invites found!", invites);
            return;
        }
        console.log("First invite object status:", invites[0].status);
        const inviteId = invites[0]._id;
        console.log("Found invite ID:", inviteId);

        console.log("5. Accepting invite...");
        const acceptRes = await fetchApi(`/company/invites/${inviteId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${fndToken}` }
        });
        console.log("Success! accepted invite.");

        console.log("6. Verifying startup status...");
        const startupCheck = await fetchApi(`/startups/${startupId}`, {
            headers: { Authorization: `Bearer ${invToken}` }
        });
        console.log("Final startup status:", startupCheck.data?.status);

    } catch (e: any) {
        console.error("API Error:", e.status, e.data);
    }
}
runTest();
