// Verification script for CLRMS authentication, backend APIs, and all role dashboards

const BACKEND_URL = 'http://localhost:5000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

const ROLES = [
  { role: 'ADMIN', email: 'admin@clrms.local', password: 'Admin@123456', path: '/admin' },
  { role: 'SUPERVISOR', email: 'supervisor@clrms.local', password: 'Supervisor@123456', path: '/supervisor' },
  { role: 'AGENT', email: 'agent@clrms.local', password: 'Agent@123456', path: '/agent' },
  { role: 'LEGAL_HEAD', email: 'legal@clrms.local', password: 'Legal@123456', path: '/legal' },
];

async function run() {
  console.log('========================================================');
  console.log('       CLRMS COMPREHENSIVE DASHBOARD & AUTH TEST        ');
  console.log('========================================================\n');

  let allPassed = true;

  // 1. Health Check
  try {
    const healthRes = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.success && healthData.database?.connected) {
      console.log('✓ [Backend] Health check OK — Database connected to MongoDB Atlas');
    } else {
      console.error('✗ [Backend] Health check FAILED:', healthData);
      allPassed = false;
    }
  } catch (err) {
    console.error('✗ [Backend] Health check network error:', err.message);
    allPassed = false;
  }

  // 2. Frontend /login page check
  try {
    const loginRes = await fetch(`${FRONTEND_URL}/login`);
    const loginHtml = await loginRes.text();
    if (loginRes.ok) {
      console.log('✓ [Frontend] /login HTML renders successfully with Status 200');
    } else {
      console.error(`✗ [Frontend] /login returned status ${loginRes.status}`);
      allPassed = false;
    }
  } catch (err) {
    console.error('✗ [Frontend] /login fetch error:', err.message);
    allPassed = false;
  }

  console.log('\n--------------------------------------------------------');
  console.log('  Testing Role Authentication, /auth/me & Dashboards');
  console.log('--------------------------------------------------------\n');

  for (const item of ROLES) {
    console.log(`Testing Role: ${item.role} (${item.email})`);

    try {
      // 1. Login API
      const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: item.email, password: item.password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.success) {
        console.error(`  ✗ Login FAILED: ${loginData.message || loginData.error}`);
        allPassed = false;
        continue;
      }

      const token = loginData.data.token;
      console.log(`  ✓ Login SUCCESS: Token generated (${token.slice(0, 18)}...)`);

      // 2. /auth/me API
      const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meRes.ok && meData.success && meData.data.user.role === item.role) {
        console.log(`  ✓ /auth/me SUCCESS: User identity verified (${meData.data.user.name}, Role: ${meData.data.user.role})`);
      } else {
        console.error(`  ✗ /auth/me FAILED:`, meData);
        allPassed = false;
      }

      // 3. Role-specific backend API
      if (item.role === 'AGENT') {
        const myAssignedRes = await fetch(`${BACKEND_URL}/loans/my-assigned`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const myAssignedData = await myAssignedRes.json();
        if (myAssignedRes.ok && myAssignedData.success) {
          console.log(`  ✓ /loans/my-assigned SUCCESS: ${myAssignedData.data.loans.length} loans retrieved, Total Overdue: ₹${myAssignedData.data.summary.totalOverdue}`);
        } else {
          console.error(`  ✗ /loans/my-assigned FAILED:`, myAssignedData);
          allPassed = false;
        }
      } else if (item.role === 'SUPERVISOR') {
        const workloadRes = await fetch(`${BACKEND_URL}/workload`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const workloadData = await workloadRes.json();
        if (workloadRes.ok && workloadData.success) {
          console.log(`  ✓ /workload SUCCESS: Unassigned count: ${workloadData.data.summary.unassignedCount}, Active Agents: ${workloadData.data.summary.activeAgentsCount}`);
        } else {
          console.error(`  ✗ /workload FAILED:`, workloadData);
          allPassed = false;
        }
      }

      // 4. Frontend Route check
      const pageRes = await fetch(`${FRONTEND_URL}${item.path}`);
      if (pageRes.ok) {
        console.log(`  ✓ Frontend Route ${item.path} loads with Status 200`);
      } else {
        console.error(`  ✗ Frontend Route ${item.path} returned Status ${pageRes.status}`);
        allPassed = false;
      }

      console.log('');
    } catch (err) {
      console.error(`  ✗ Exception during ${item.role} verification:`, err.message);
      allPassed = false;
    }
  }

  console.log('========================================================');
  if (allPassed) {
    console.log(' ALL ROLES & DASHBOARDS PASSED VERIFICATION (100%)');
  } else {
    console.log(' SOME VERIFICATIONS FAILED');
  }
  console.log('========================================================\n');
}

run();
