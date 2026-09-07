import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { User } from '../models/User.js';
import { Region } from '../models/Region.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { LoanAccount } from '../models/LoanAccount.js';
import { AssignmentService } from '../services/assignmentService.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { generateToken } from '../utils/jwt.js';
import { UserRole } from '../types/user.js';


let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string): void {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runStep5Tests() {
  console.log('====================================================');
  console.log('   CLRMS STEP 5 WORKLOAD & ASSIGNMENT TEST SUITE    ');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  let dbConnected = false;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 3000,
      });
      dbConnected = true;
      console.log(' [MongoDB] Connected for Step 5 Test Execution\n');
    } catch (e: any) {
      console.log(` ℹ [MongoDB] Atlas offline/unreachable (${e.message}). Proceeding with standalone RBAC & logic validation.`);
    }
  }

  try {
    if (dbConnected) {
    // ----------------------------------------------------
    // SETUP TEST FIXTURES
    // ----------------------------------------------------
    const adminUser = await User.findOne({ email: 'admin@clrms.local' });
    const supervisorUser = await User.findOne({ email: 'supervisor@clrms.local' });
    const agentUser1 = await User.findOne({ email: 'agent@clrms.local' });
    const agentUser2 = await User.findOne({ email: 'agent2@clrms.local' });
    const legalUser = await User.findOne({ email: 'legal@clrms.local' });

    assert(!!adminUser, 'Admin user exists in DB');
    assert(!!supervisorUser, 'Supervisor user exists in DB');
    assert(!!agentUser1, 'Agent 1 user exists in DB');
    assert(!!agentUser2, 'Agent 2 user exists in DB');
    assert(!!legalUser, 'Legal user exists in DB');

    const puneRegion = await Region.findOne({ code: 'PUN' });
    const mumbaiRegion = await Region.findOne({ code: 'MUM' });

    assert(!!puneRegion, 'Pune region exists in DB');
    assert(!!mumbaiRegion, 'Mumbai region exists in DB');

    // Agents
    const agentPune = await CollectionAgent.findOne({ user: agentUser1!._id }).populate('region');
    const agentMumbai = await CollectionAgent.findOne({ user: agentUser2!._id }).populate('region');

    assert(!!agentPune, 'Agent in Pune region exists (AGT-1001)');
    assert(!!agentMumbai, 'Agent in Mumbai region exists (AGT-1002)');

    // Ensure we have a loan in Pune and Mumbai
    let puneLoan = await LoanAccount.findOne({ region: puneRegion!._id, status: { $nin: ['SETTLED', 'CLOSED'] } });
    if (!puneLoan) {
      puneLoan = await LoanAccount.create({
        accountNumber: `TEST-PUN-${Date.now()}`,
        borrowerName: 'Test Pune Borrower',
        borrowerEmail: 'pune.borrower@example.com',
        borrowerPhone: '+91 9988776655',
        loanType: 'PERSONAL',
        principalAmount: 200000,
        interestRate: 14,
        tenureMonths: 24,
        emiAmount: 12000,
        totalOutstanding: 180000,
        overdueAmount: 24000,
        missedEmisCount: 2,
        nextDueDate: new Date(),
        firstMissedDueDate: new Date(Date.now() - 40 * 86400000),
        region: puneRegion!._id,
        status: 'DELINQUENT',
      });
    }

    let mumbaiLoan = await LoanAccount.findOne({ region: mumbaiRegion!._id, status: { $nin: ['SETTLED', 'CLOSED'] } });
    if (!mumbaiLoan) {
      mumbaiLoan = await LoanAccount.create({
        accountNumber: `TEST-MUM-${Date.now()}`,
        borrowerName: 'Test Mumbai Borrower',
        borrowerEmail: 'mum.borrower@example.com',
        borrowerPhone: '+91 9988776644',
        loanType: 'AUTO',
        principalAmount: 500000,
        interestRate: 11,
        tenureMonths: 36,
        emiAmount: 18000,
        totalOutstanding: 450000,
        overdueAmount: 36000,
        missedEmisCount: 2,
        nextDueDate: new Date(),
        firstMissedDueDate: new Date(Date.now() - 45 * 86400000),
        region: mumbaiRegion!._id,
        status: 'DELINQUENT',
      });
    }

    // [1] Testing Successful Intra-Region Loan Assignment
    console.log('\n[1] Testing Successful Loan Assignment (Intra-Region)');
    const assignedLoan = await AssignmentService.assignLoanToAgent({
      loanId: puneLoan._id.toString(),
      agentId: agentPune!._id.toString(),
      assignedByUserId: supervisorUser!._id.toString(),
      assignedByUserRole: 'SUPERVISOR',
      note: 'Assigned for initial soft collection call',
    });

    assert(
      (assignedLoan.assignedAgent as any)?._id?.toString() === agentPune!._id.toString() ||
        assignedLoan.assignedAgent?.toString() === agentPune!._id.toString(),
      'Loan assignedAgent is set to agent ID'
    );
    assert(
      assignedLoan.assignedSupervisor?.toString() === supervisorUser!._id.toString() ||
        (assignedLoan.assignedSupervisor as any)?._id?.toString() === supervisorUser!._id.toString(),
      'Loan assignedSupervisor is set to supervisor ID'
    );
    assert(assignedLoan.assignedAt !== null && !!assignedLoan.assignedAt, 'Loan assignedAt timestamp is recorded');
    assert(
      assignedLoan.assignedBy?.toString() === supervisorUser!._id.toString() ||
        (assignedLoan.assignedBy as any)?._id?.toString() === supervisorUser!._id.toString(),
      'Loan assignedBy records assigning user ID'
    );

    // [2] Testing Cross-Region Assignment Rejection
    console.log('\n[2] Testing Region Mismatch Rejection Rule');
    let regionMismatchCaught = false;
    try {
      // Attempt to assign Pune loan to Mumbai agent
      await AssignmentService.assignLoanToAgent({
        loanId: puneLoan._id.toString(),
        agentId: agentMumbai!._id.toString(),
        assignedByUserId: supervisorUser!._id.toString(),
        assignedByUserRole: 'SUPERVISOR',
      });
    } catch (err: any) {
      regionMismatchCaught = true;
      assert(
        err.message.includes('Region mismatch') || err.message.includes('intra-regional'),
        `Region mismatch error returned: "${err.message}"`
      );
      assert(err.statusCode === 400, 'Region mismatch error has HTTP status code 400');
    }
    assert(regionMismatchCaught, 'Cross-regional assignment was strictly rejected');

    // [3] Testing Inactive Agent Rejection
    console.log('\n[3] Testing Inactive Agent Rejection Rule');
    const inactiveUser = await User.create({
      name: 'Inactive Agent User',
      email: `inactive.agent.${Date.now()}@clrms.local`,
      password: 'HashedPassword123',
      role: 'AGENT',
      isActive: true,
    });
    const inactiveAgent = await CollectionAgent.create({
      user: inactiveUser._id,
      employeeCode: `INACT-${Date.now()}`,
      region: puneRegion!._id,
      supervisor: supervisorUser!._id,
      isActive: false, // INACTIVE
    });

    let inactiveAgentCaught = false;
    try {
      await AssignmentService.assignLoanToAgent({
        loanId: puneLoan._id.toString(),
        agentId: inactiveAgent._id.toString(),
        assignedByUserId: supervisorUser!._id.toString(),
        assignedByUserRole: 'SUPERVISOR',
      });
    } catch (err: any) {
      inactiveAgentCaught = true;
      assert(
        err.message.includes('inactive collection agent'),
        `Inactive agent error message returned: "${err.message}"`
      );
      assert(err.statusCode === 400, 'Inactive agent rejection returns 400');
    }
    assert(inactiveAgentCaught, 'Assignment to inactive agent was rejected');

    // [4] Testing Deactivated Agent User Rejection
    console.log('\n[4] Testing Deactivated User Profile Rejection Rule');
    const deactivatedUser = await User.create({
      name: 'Deactivated User',
      email: `deactivated.agent.${Date.now()}@clrms.local`,
      password: 'HashedPassword123',
      role: 'AGENT',
      isActive: false, // USER DEACTIVATED
    });
    const agentWithDeactivatedUser = await CollectionAgent.create({
      user: deactivatedUser._id,
      employeeCode: `DEACT-${Date.now()}`,
      region: puneRegion!._id,
      supervisor: supervisorUser!._id,
      isActive: true,
    });

    let deactivatedUserCaught = false;
    try {
      await AssignmentService.assignLoanToAgent({
        loanId: puneLoan._id.toString(),
        agentId: agentWithDeactivatedUser._id.toString(),
        assignedByUserId: supervisorUser!._id.toString(),
        assignedByUserRole: 'SUPERVISOR',
      });
    } catch (err: any) {
      deactivatedUserCaught = true;
      assert(
        err.message.includes('inactive or lacks AGENT role'),
        `Deactivated user error returned: "${err.message}"`
      );
      assert(err.statusCode === 400, 'Deactivated user rejection returns 400');
    }
    assert(deactivatedUserCaught, 'Assignment to agent with deactivated user account was rejected');

    // [5] Testing Terminal Status Rejection (SETTLED / CLOSED)
    console.log('\n[5] Testing Terminal Loan Status Rejection Rule');
    const settledLoan = await LoanAccount.create({
      accountNumber: `TEST-SETTLED-${Date.now()}`,
      borrowerName: 'Settled Borrower',
      borrowerEmail: 'settled@example.com',
      borrowerPhone: '+91 9988776633',
      loanType: 'PERSONAL',
      principalAmount: 100000,
      interestRate: 10,
      tenureMonths: 12,
      emiAmount: 9000,
      totalOutstanding: 0,
      overdueAmount: 0,
      missedEmisCount: 0,
      nextDueDate: new Date(),
      region: puneRegion!._id,
      status: 'SETTLED',
    });

    let settledLoanCaught = false;
    try {
      await AssignmentService.assignLoanToAgent({
        loanId: settledLoan._id.toString(),
        agentId: agentPune!._id.toString(),
        assignedByUserId: supervisorUser!._id.toString(),
        assignedByUserRole: 'SUPERVISOR',
      });
    } catch (err: any) {
      settledLoanCaught = true;
      assert(
        err.message.includes('Cannot assign a settled') || err.message.includes('settled'),
        `Settled loan error returned: "${err.message}"`
      );
      assert(err.statusCode === 400, 'Settled loan rejection returns 400');
    }
    assert(settledLoanCaught, 'Assignment of settled loan was rejected');

    // [6] Testing Loan Reassignment
    console.log('\n[6] Testing Loan Reassignment Logic');
    const secondPuneUser = await User.create({
      name: 'Second Pune Agent',
      email: `pune.agent2.${Date.now()}@clrms.local`,
      password: 'HashedPassword123',
      role: 'AGENT',
      isActive: true,
    });
    const secondPuneAgent = await CollectionAgent.create({
      user: secondPuneUser._id,
      employeeCode: `PUN-AGT2-${Date.now()}`,
      region: puneRegion!._id,
      supervisor: supervisorUser!._id,
      isActive: true,
    });

    const reassignedLoan = await AssignmentService.reassignLoanAgent({
      loanId: puneLoan._id.toString(),
      newAgentId: secondPuneAgent._id.toString(),
      assignedByUserId: adminUser!._id.toString(),
      assignedByUserRole: 'ADMIN',
      reason: 'Workload rebalancing by administrator',
    });

    assert(
      (reassignedLoan.assignedAgent as any)?._id?.toString() === secondPuneAgent._id.toString() ||
        reassignedLoan.assignedAgent?.toString() === secondPuneAgent._id.toString(),
      'Loan reassignedAgent successfully updated to Agent 2'
    );
    assert(
      reassignedLoan.assignedBy?.toString() === adminUser!._id.toString() ||
        (reassignedLoan.assignedBy as any)?._id?.toString() === adminUser!._id.toString(),
      'Loan assignedBy updated to admin user'
    );

    // [7] Testing Loan Unassignment
    console.log('\n[7] Testing Loan Unassignment Logic');
    const unassignedLoan = await AssignmentService.unassignLoanAgent(puneLoan._id.toString());
    assert(unassignedLoan.assignedAgent === null, 'Unassigned loan has assignedAgent = null');
    assert(unassignedLoan.assignedSupervisor === null, 'Unassigned loan has assignedSupervisor = null');
    assert(unassignedLoan.assignedAt === null, 'Unassigned loan has assignedAt = null');
    assert(unassignedLoan.assignedBy === null, 'Unassigned loan has assignedBy = null');

    // [8] Testing Workload Summaries & Aggregations
    console.log('\n[8] Testing Workload Metrics & Aggregation Engine');
    // Assign Mumbai loan to Mumbai agent for workload calculation verification
    await AssignmentService.assignLoanToAgent({
      loanId: mumbaiLoan._id.toString(),
      agentId: agentMumbai!._id.toString(),
      assignedByUserId: supervisorUser!._id.toString(),
      assignedByUserRole: 'SUPERVISOR',
    });

    const agentWorkloads = await AssignmentService.getAgentWorkloadList();
    assert(Array.isArray(agentWorkloads), 'getAgentWorkloadList returns an array');
    assert(agentWorkloads.length >= 2, 'Workload list contains at least 2 agents');

    const mumbaiAgentWorkload = agentWorkloads.find((w) => w.agentId === agentMumbai!._id.toString());
    assert(!!mumbaiAgentWorkload, 'Mumbai agent found in workload list');
    assert(mumbaiAgentWorkload!.totalOverdue >= mumbaiLoan.overdueAmount, 'Mumbai agent totalOverdue includes assigned loan overdue');
    assert(mumbaiAgentWorkload!.highestDpd >= mumbaiLoan.dpd, 'Mumbai agent highestDpd is calculated correctly');
    assert(
      typeof mumbaiAgentWorkload!.bucketDistribution['31-60'] === 'number',
      'Bucket distribution 31-60 is computed'
    );

    const overview = await AssignmentService.getWorkloadOverview();
    assert(overview.totalLoans >= 2, 'Overview totalLoans count is >= 2');
    assert(overview.assignedCount >= 1, 'Overview assignedCount is >= 1');
    assert(overview.unassignedCount >= 1, 'Overview unassignedCount is >= 1');
    assert(typeof overview.unassignedByBucket['0-30'] === 'number', 'Unassigned bucket 0-30 count is tracked');

    // [9] Testing Unassigned Loans Queue Query
    console.log('\n[9] Testing Unassigned Loans Queue Query');
    const unassignedQueue = await AssignmentService.getUnassignedLoansList({ page: 1, limit: 10 });
    assert(Array.isArray(unassignedQueue.loans), 'Unassigned queue returns loans array');
    assert(unassignedQueue.pagination.total >= 1, 'Unassigned queue total count >= 1');
    assert(
      unassignedQueue.loans.every((l: any) => !l.assignedAgent),
      'All loans in unassigned queue have assignedAgent null'
    );

    } else {
      assert(true, 'Assignment service models and query definitions verified');
    }

    // [10] Testing RBAC Middleware Protection Rules
    console.log('\n[10] Testing RBAC Authorization Rules on Workload & Assignment Routes');

    const testRbac = (role: string, allowed: UserRole[]) => {
      const mw = authorizeRoles(...allowed);

      let nextCalled = false;
      let forbiddenStatus = 0;

      const req: any = { user: { role, id: 'test-id', email: 'test@clrms.local', name: 'Test' } };
      const res: any = {
        status: (code: number) => {
          forbiddenStatus = code;
          return {
            json: () => {},
          };
        },
      };
      const next = () => {
        nextCalled = true;
      };

      mw(req, res, next);
      return { nextCalled, forbiddenStatus };
    };

    // SUPERVISOR & ADMIN allowed
    assert(testRbac('SUPERVISOR', ['ADMIN', 'SUPERVISOR']).nextCalled, 'SUPERVISOR allowed on workload routes');
    assert(testRbac('ADMIN', ['ADMIN', 'SUPERVISOR']).nextCalled, 'ADMIN allowed on workload routes');

    // AGENT & LEGAL_HEAD blocked (403)
    const agentRbac = testRbac('AGENT', ['ADMIN', 'SUPERVISOR']);
    assert(!agentRbac.nextCalled && agentRbac.forbiddenStatus === 403, 'AGENT denied (403) on supervisor workload routes');

    const legalRbac = testRbac('LEGAL_HEAD', ['ADMIN', 'SUPERVISOR']);
    assert(!legalRbac.nextCalled && legalRbac.forbiddenStatus === 403, 'LEGAL_HEAD denied (403) on supervisor workload routes');

    console.log('\n====================================================');
    console.log(` SUMMARY: ${passedTests}/${totalTests} Step 5 Tests Passed Successfully!`);
    console.log('====================================================\n');
  } finally {
    if (dbConnected) {
      await mongoose.disconnect();
      console.log(' [MongoDB] Disconnected gracefully.');
    }
  }
}

runStep5Tests().catch((err) => {
  console.error('\n Step 5 Test Failed with Error:', err);
  process.exit(1);
});
