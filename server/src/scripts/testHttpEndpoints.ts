import { generateToken } from '../utils/jwt.js';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`HTTP Endpoint Test Failed: ${testName}`);
  }
}

async function testHttpEndpoints() {
  const BASE_URL = 'http://localhost:5000/api/v1';

  console.log('====================================================');
  console.log('       CLRMS STEP 2 HTTP ENDPOINT TEST SUITE        ');
  console.log('====================================================\n');

  // Generate valid test JWTs for each role
  const adminToken = generateToken({
    id: '65f000000000000000000001',
    email: 'admin@clrms.local',
    role: 'ADMIN',
  });

  const agentToken = generateToken({
    id: '65f000000000000000000003',
    email: 'agent@clrms.local',
    role: 'AGENT',
  });

  const supervisorToken = generateToken({
    id: '65f000000000000000000002',
    email: 'supervisor@clrms.local',
    role: 'SUPERVISOR',
  });

  const legalToken = generateToken({
    id: '65f000000000000000000004',
    email: 'legal@clrms.local',
    role: 'LEGAL_HEAD',
  });

  // 1. Test POST /api/v1/auth/login validation (empty body)
  console.log('[1] Testing Login Validation');
  const emptyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(emptyLoginRes.status === 400, 'POST /auth/login with empty body returns HTTP 400 Bad Request');

  const invalidEmailRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalidemail', password: '123' }),
  });
  assert(invalidEmailRes.status === 400, 'POST /auth/login with invalid email returns HTTP 400 Bad Request');

  // 2. Test GET /api/v1/auth/me without token
  console.log('\n[2] Testing Unauthenticated Access');
  const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
  assert(noTokenRes.status === 401, 'GET /auth/me without Authorization header returns HTTP 401');

  // 3. Test GET /api/v1/auth/me with invalid token
  const badTokenRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: 'Bearer invalid.token.signature' },
  });
  assert(badTokenRes.status === 401, 'GET /auth/me with corrupted token returns HTTP 401');

  // 4. Test RBAC Protected Test Routes
  console.log('\n[3] Testing Role-Based Authorization on Protected Routes');

  // Direct RBAC check with mock middleware testing
  const noAuthAdminRes = await fetch(`${BASE_URL}/test/admin`);
  assert(noAuthAdminRes.status === 401, 'GET /test/admin without token returns HTTP 401');

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed}/${total} HTTP Endpoint Tests Passed!`);
  console.log('====================================================\n');
}

testHttpEndpoints().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
