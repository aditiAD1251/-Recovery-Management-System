import { generateToken } from '../utils/jwt.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { UserRole } from '../types/user.js';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test Failed: ${testName}`);
  }
}

async function runStep3Tests() {
  const BASE_URL = 'http://localhost:5000/api/v1';

  console.log('====================================================');
  console.log('   CLRMS STEP 3 MASTER DATA & RBAC TEST SUITE       ');
  console.log('====================================================\n');

  // [1] Unit Testing RBAC authorizeRoles Middleware
  console.log('[1] Unit Testing authorizeRoles Middleware Logic');

  const testRoleAccess = (userRole: UserRole, allowedRoles: UserRole[]): number => {
    let statusCode = 200;
    const req: any = { user: { id: 'test', name: 'Test', email: 'test@clrms.local', role: userRole, isActive: true } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        return data;
      },
    };
    const next = () => {
      statusCode = 200;
    };

    const middleware = authorizeRoles(...allowedRoles);
    middleware(req, res, next);
    return statusCode;
  };

  assert(testRoleAccess('ADMIN', ['ADMIN']) === 200, 'ADMIN granted access to ADMIN-only route');
  assert(testRoleAccess('SUPERVISOR', ['ADMIN']) === 403, 'SUPERVISOR denied access (403) to ADMIN-only route');
  assert(testRoleAccess('AGENT', ['ADMIN']) === 403, 'AGENT denied access (403) to ADMIN-only route');
  assert(testRoleAccess('LEGAL_HEAD', ['ADMIN']) === 403, 'LEGAL_HEAD denied access (403) to ADMIN-only route');

  assert(testRoleAccess('SUPERVISOR', ['ADMIN', 'SUPERVISOR']) === 200, 'SUPERVISOR granted access to agent list');
  assert(testRoleAccess('ADMIN', ['ADMIN', 'SUPERVISOR']) === 200, 'ADMIN granted access to agent list');
  assert(testRoleAccess('AGENT', ['ADMIN', 'SUPERVISOR']) === 403, 'AGENT denied access (403) to agent list');
  assert(testRoleAccess('LEGAL_HEAD', ['ADMIN', 'SUPERVISOR']) === 403, 'LEGAL_HEAD denied access (403) to agent list');

  // [2] HTTP Endpoint Unauthenticated Access Tests
  console.log('\n[2] Testing HTTP Endpoint Security (Unauthenticated 401)');

  const usersNoAuth = await fetch(`${BASE_URL}/users`);
  assert(usersNoAuth.status === 401, 'GET /users without token returns HTTP 401 Unauthorized');

  const regNoAuth = await fetch(`${BASE_URL}/regions`);
  assert(regNoAuth.status === 401, 'GET /regions without token returns HTTP 401 Unauthorized');

  const agentsNoAuth = await fetch(`${BASE_URL}/agents`);
  assert(agentsNoAuth.status === 401, 'GET /agents without token returns HTTP 401 Unauthorized');

  // [3] HTTP Endpoint Corrupted Token Tests
  console.log('\n[3] Testing Invalid / Corrupted Token Handling');
  const badTokenUsers = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: 'Bearer corrupted.token.payload' },
  });
  assert(badTokenUsers.status === 401, 'GET /users with corrupted token returns HTTP 401');

  const badTokenRegions = await fetch(`${BASE_URL}/regions`, {
    headers: { Authorization: 'Bearer corrupted.token.payload' },
  });
  assert(badTokenRegions.status === 401, 'GET /regions with corrupted token returns HTTP 401');

  const badTokenAgents = await fetch(`${BASE_URL}/agents`, {
    headers: { Authorization: 'Bearer corrupted.token.payload' },
  });
  assert(badTokenAgents.status === 401, 'GET /agents with corrupted token returns HTTP 401');

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed}/${total} Step 3 Tests Passed Successfully!`);
  console.log('====================================================\n');
}

runStep3Tests().catch((err) => {
  console.error('Step 3 Test Error:', err);
  process.exit(1);
});
