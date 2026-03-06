import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:6001/api',
});

async function reproduce() {
    try {
        console.log('--- Testing /api/health ---');
        const health = await api.get('/health');
        console.log('Health:', health.data);

        // We need a token. Let's try to find a user or use a test one if auth is disabled.
        // But auth IS enabled. I'll try to find a valid token from a login if I can, 
        // or just test the public routes or routes that might be failing due to DB issues.
        
        console.log('--- Testing /api/dashboard (without auth) ---');
        try {
            await api.get('/dashboard');
        } catch (err: any) {
            console.log('Dashboard (no auth) expected 401:', err.response?.status);
            if (err.response?.status === 500) {
                console.error('CRITICAL: Dashboard returned 500 even without auth (middleware crash?)');
                console.error(err.response.data);
            }
        }

        console.log('--- Testing /api/documents (without auth) ---');
        try {
            await api.get('/documents');
        } catch (err: any) {
            console.log('Documents (no auth) expected 401:', err.response?.status);
            if (err.response?.status === 500) {
                console.error('CRITICAL: Documents returned 500 even without auth');
                console.error(err.response.data);
            }
        }

    } catch (err: any) {
        console.error('Reproduction failed:', err.message);
    }
}

reproduce();
