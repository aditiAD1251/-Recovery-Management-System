import {
  calculateDPD,
  determineBucket,
  determineStatus,
  computeLoanDelinquency,
} from '../services/dpdService.js';
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
    throw new Error(`Step 4 Test Failed: ${testName}`);
  }
}

async function runStep4Tests() {
  const BASE_URL = 'http://localhost:5000/api/v1';

  console.log('====================================================');
  console.log('   CLRMS STEP 4 DPD ENGINE & LOAN API TEST SUITE    ');
  console.log('====================================================\n');

  const now = new Date();
  const getPastDate = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const getFutureDate = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // [1] Testing DPD Calculation Math & Edge Cases
  console.log('[1] Testing DPD Calculation Formula & Boundary Edge Cases');

  assert(calculateDPD(0, getPastDate(45), now) === 0, 'DPD is 0 when overdue amount is 0');
  assert(calculateDPD(-500, getPastDate(45), now) === 0, 'DPD is 0 when overdue amount is negative');
  assert(calculateDPD(10000, null, now) === 0, 'DPD is 0 when firstMissedDueDate is null');
  assert(calculateDPD(10000, getFutureDate(10), now) === 0, 'DPD is 0 when firstMissedDueDate is in the future');
  assert(calculateDPD(10000, getPastDate(0), now) === 0, 'DPD is 0 on due date day itself');
  assert(calculateDPD(10000, getPastDate(15), now) === 15, 'DPD is 15 for 15 days past due');
  assert(calculateDPD(10000, getPastDate(30), now) === 30, 'DPD is 30 for 30 days past due');
  assert(calculateDPD(10000, getPastDate(45), now) === 45, 'DPD is 45 for 45 days past due');
  assert(calculateDPD(10000, getPastDate(75), now) === 75, 'DPD is 75 for 75 days past due');
  assert(calculateDPD(10000, getPastDate(90), now) === 90, 'DPD is 90 for 90 days past due');
  assert(calculateDPD(10000, getPastDate(125), now) === 125, 'DPD is 125 for 125 days past due');

  // [2] Testing Delinquency Bucketing Logic
  console.log('\n[2] Testing Delinquency Bucketing Classification (0-30, 31-60, 61-90, 90+)');

  assert(determineBucket(0, 1000) === '0-30', 'DPD 0 maps to 0-30 bucket');
  assert(determineBucket(15, 1000) === '0-30', 'DPD 15 maps to 0-30 bucket');
  assert(determineBucket(30, 1000) === '0-30', 'DPD 30 maps to 0-30 bucket');
  assert(determineBucket(31, 1000) === '31-60', 'DPD 31 maps to 31-60 bucket');
  assert(determineBucket(45, 1000) === '31-60', 'DPD 45 maps to 31-60 bucket');
  assert(determineBucket(60, 1000) === '31-60', 'DPD 60 maps to 31-60 bucket');
  assert(determineBucket(61, 1000) === '61-90', 'DPD 61 maps to 61-90 bucket');
  assert(determineBucket(75, 1000) === '61-90', 'DPD 75 maps to 61-90 bucket');
  assert(determineBucket(90, 1000) === '61-90', 'DPD 90 maps to 61-90 bucket');
  assert(determineBucket(91, 1000) === '90+', 'DPD 91 maps to 90+ bucket (NPA)');
  assert(determineBucket(150, 1000) === '90+', 'DPD 150 maps to 90+ bucket (NPA)');
  assert(determineBucket(90, 0) === '0-30', 'Zero overdue amount always maps to 0-30 bucket');

  // [3] Testing Status Transitions & Terminal Status Preservation
  console.log('\n[3] Testing Terminal Status Preservation (SETTLED / CLOSED)');

  assert(determineStatus(45, 10000, 'SETTLED') === 'SETTLED', 'SETTLED status is preserved and not overwritten');
  assert(determineStatus(120, 50000, 'CLOSED') === 'CLOSED', 'CLOSED status is preserved and not overwritten');
  assert(determineStatus(0, 0, 'DELINQUENT') === 'CURRENT', 'Paid off account transitions from DELINQUENT to CURRENT');
  assert(determineStatus(45, 10000, 'CURRENT') === 'DELINQUENT', 'Overdue 45 DPD account transitions to DELINQUENT');
  assert(determineStatus(95, 10000, 'DELINQUENT') === 'DEFAULT', 'Overdue 95 DPD account transitions to DEFAULT / NPA');

  // [4] Testing Delinquency Engine Composite Function
  console.log('\n[4] Testing computeLoanDelinquency composite function');

  const delinquentResult = computeLoanDelinquency({
    overdueAmount: 25000,
    firstMissedDueDate: getPastDate(50),
  }, now);
  assert(delinquentResult.dpd === 50 && delinquentResult.bucket === '31-60' && delinquentResult.status === 'DELINQUENT', 'Delinquency computation computes DPD 50, 31-60, DELINQUENT');

  const settledResult = computeLoanDelinquency({
    overdueAmount: 25000,
    firstMissedDueDate: getPastDate(120),
    status: 'SETTLED',
  }, now);
  assert(settledResult.status === 'SETTLED' && settledResult.dpd === 0, 'Settled loan returns status SETTLED with DPD 0');

  // [5] Unit Testing RBAC Authorization Rules on Loan Endpoints
  console.log('\n[5] Testing RBAC Authorization Rules on Loan Endpoints');

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

  // Create Loan & Recalculate DPD (ADMIN, SUPERVISOR)
  assert(testRoleAccess('ADMIN', ['ADMIN', 'SUPERVISOR']) === 200, 'ADMIN granted access to create loan and recalculate DPD');
  assert(testRoleAccess('SUPERVISOR', ['ADMIN', 'SUPERVISOR']) === 200, 'SUPERVISOR granted access to create loan and recalculate DPD');
  assert(testRoleAccess('AGENT', ['ADMIN', 'SUPERVISOR']) === 403, 'AGENT denied access (403) to create loan or recalculate DPD');
  assert(testRoleAccess('LEGAL_HEAD', ['ADMIN', 'SUPERVISOR']) === 403, 'LEGAL_HEAD denied access (403) to create loan');

  // Delete Loan (ADMIN ONLY)
  assert(testRoleAccess('ADMIN', ['ADMIN']) === 200, 'ADMIN granted access to delete/close loan');
  assert(testRoleAccess('SUPERVISOR', ['ADMIN']) === 403, 'SUPERVISOR denied access (403) to delete loan');

  // [6] Testing Unauthenticated HTTP Requests
  console.log('\n[6] Testing HTTP Endpoint Security (Unauthenticated 401)');

  const noAuthLoans = await fetch(`${BASE_URL}/loans`);
  assert(noAuthLoans.status === 401, 'GET /loans without token returns HTTP 401');

  const noAuthSummary = await fetch(`${BASE_URL}/loans/summary`);
  assert(noAuthSummary.status === 401, 'GET /loans/summary without token returns HTTP 401');

  const noAuthRecalc = await fetch(`${BASE_URL}/loans/recalculate-dpd`, { method: 'POST' });
  assert(noAuthRecalc.status === 401, 'POST /loans/recalculate-dpd without token returns HTTP 401');

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed}/${total} Step 4 Tests Passed Successfully!`);
  console.log('====================================================\n');
}

runStep4Tests().catch((err) => {
  console.error('Step 4 test error:', err);
  process.exit(1);
});
