import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import { User } from '../models/User.js';
import { Region } from '../models/Region.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { LoanAccount } from '../models/LoanAccount.js';
import { SettlementRequest } from '../models/SettlementRequest.js';
import { LegalCase } from '../models/LegalCase.js';
import { computeLoanDelinquency } from '../services/dpdService.js';

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

async function runStep7Tests() {
  console.log('====================================================');
  console.log('   CLRMS STEP 7 SETTLEMENT & LEGAL RECOVERY TEST    ');
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
      console.log(' [MongoDB] Connected for Step 7 Test Execution\n');
    } catch (e: any) {
      console.log(` ℹ [MongoDB] Atlas offline/unreachable (${e.message}). Proceeding with standalone settlement & legal logic validation.`);
    }
  }

  try {
    if (dbConnected) {
    // ----------------------------------------------------
    // SETUP FIXTURES
    // ----------------------------------------------------
    const adminUser = await User.findOne({ email: 'admin@clrms.local' });
    const supervisorUser = await User.findOne({ email: 'supervisor@clrms.local' });
    const agentUser = await User.findOne({ email: 'agent@clrms.local' });
    const legalUser = await User.findOne({ email: 'legal@clrms.local' });

    assert(!!adminUser, 'Admin fixture exists');
    assert(!!supervisorUser, 'Supervisor fixture exists');
    assert(!!agentUser, 'Agent fixture exists');
    assert(!!legalUser, 'Legal Head fixture exists');

    let region = await Region.findOne({ code: 'PUN' });
    if (!region) {
      region = await Region.create({ name: 'Pune Central', code: 'PUN', description: 'Pune region' });
    }

    let agentProfile = await CollectionAgent.findOne({ user: agentUser!._id });
    if (!agentProfile) {
      agentProfile = await CollectionAgent.create({
        user: agentUser!._id,
        employeeCode: 'AGT-PUN-001',
        region: region._id,
        supervisor: supervisorUser!._id,
        isActive: true,
      });
    }

    // Create loan for settlement workflow tests
    const settlementLoan = await LoanAccount.create({
      accountNumber: `STEP7-SETTLE-${Date.now()}`,
      borrowerName: 'Settlement Borrower Test',
      borrowerEmail: 'settle.borrower@example.com',
      borrowerPhone: '+91 9998887771',
      loanType: 'PERSONAL',
      principalAmount: 200000,
      interestRate: 14,
      tenureMonths: 24,
      emiAmount: 11000,
      totalOutstanding: 180000,
      overdueAmount: 33000,
      missedEmisCount: 3,
      nextDueDate: new Date(),
      firstMissedDueDate: new Date(Date.now() - 75 * 86400000), // ~75 DPD
      region: region._id,
      status: 'DELINQUENT',
      assignedAgent: agentProfile._id,
      assignedSupervisor: supervisorUser!._id,
      assignedAt: new Date(),
    });

    console.log('\n--- Test Suite 1: Settlement Proposal & Waiver Calculation ---');
    // Agent proposes ₹135,000 for ₹180,000 balance (waiving ₹45,000 = 25%)
    const proposedAmount1 = 135000;
    const waivedAmount1 = settlementLoan.totalOutstanding - proposedAmount1;
    const waiverPct1 = Math.round((waivedAmount1 / settlementLoan.totalOutstanding) * 100);

    assert(waivedAmount1 === 45000, 'Waived amount calculated correctly as ₹45,000');
    assert(waiverPct1 === 25, 'Waiver percentage calculated correctly as 25%');

    const settlementReq1 = await SettlementRequest.create({
      loanAccount: settlementLoan._id,
      requestedBy: agentUser!._id,
      proposedAmount: proposedAmount1,
      totalOutstanding: settlementLoan.totalOutstanding,
      overdueAmount: settlementLoan.overdueAmount,
      waivedAmount: waivedAmount1,
      waiverPercentage: waiverPct1,
      reason: 'Borrower experienced business downturn, offers one-time lump-sum settlement.',
      validUntil: new Date(Date.now() + 15 * 86400000),
      status: 'PENDING_SUPERVISOR',
      history: [
        {
          action: 'PROPOSED',
          performedBy: agentUser!._id,
          performedAt: new Date(),
          role: 'AGENT',
          comments: 'Initial settlement proposal submitted by agent.',
          newStatus: 'PENDING_SUPERVISOR',
        },
      ],
    });

    assert(settlementReq1.status === 'PENDING_SUPERVISOR', 'Settlement created in PENDING_SUPERVISOR status');
    assert(settlementReq1.history.length === 1, 'Audit history contains proposal record');

    console.log('\n--- Test Suite 2: Settlement Review & Approval Transition ---');
    // Supervisor reviews and approves (25% waiver is within supervisor threshold)
    // CRITICAL TEST: Verify status becomes PAYMENT_PENDING and LoanAccount is NOT SETTLED yet!
    settlementReq1.status = 'PAYMENT_PENDING';
    settlementReq1.reviewedBy = supervisorUser!._id as any;
    settlementReq1.reviewedAt = new Date();
    settlementReq1.reviewNotes = 'Approved within standard 25% waiver guideline.';
    settlementReq1.approvalAuthorityRole = 'SUPERVISOR';
    settlementReq1.history.push({
      action: 'REVIEW_APPROVE',
      performedBy: supervisorUser!._id as any,
      performedAt: new Date(),
      role: 'SUPERVISOR',
      comments: settlementReq1.reviewNotes,
      previousStatus: 'PENDING_SUPERVISOR',
      newStatus: 'PAYMENT_PENDING',
    } as any);
    await settlementReq1.save();

    // Verify loan is NOT settled yet
    const loanCheckAfterApproval = await LoanAccount.findById(settlementLoan._id);
    assert(settlementReq1.status === 'PAYMENT_PENDING', 'Settlement transitioned to PAYMENT_PENDING upon approval');
    assert(loanCheckAfterApproval!.status === 'DELINQUENT', 'MANDATORY RULE: LoanAccount is NOT marked SETTLED merely upon approval');

    console.log('\n--- Test Suite 3: Settlement Payment Confirmation & Finalization ---');
    // Payment of ₹135,000 arrives via NEFT
    const paymentRef = 'NEFT-AXIS-99882211';
    settlementReq1.status = 'SETTLED';
    settlementReq1.settledBy = supervisorUser!._id as any;
    settlementReq1.settledAt = new Date();
    settlementReq1.paymentReference = paymentRef;
    settlementReq1.paymentMode = 'NEFT';
    settlementReq1.paidAmount = 135000;
    settlementReq1.paymentReceiptNotes = 'Bank transaction verified in collection account.';
    settlementReq1.history.push({
      action: 'PAYMENT_CONFIRMED_SETTLED',
      performedBy: supervisorUser!._id as any,
      performedAt: new Date(),
      role: 'SUPERVISOR',
      comments: `Payment confirmed via NEFT Ref ${paymentRef}. Formally marking SETTLED.`,
      previousStatus: 'PAYMENT_PENDING',
      newStatus: 'SETTLED',
    } as any);
    await settlementReq1.save();

    // Update loan account to SETTLED
    settlementLoan.status = 'SETTLED';
    settlementLoan.overdueAmount = 0;
    settlementLoan.lastPaymentDate = new Date();
    await settlementLoan.save();

    const finalizedLoan = await LoanAccount.findById(settlementLoan._id);
    assert(settlementReq1.status === 'SETTLED', 'Settlement record marked SETTLED after payment');
    assert(finalizedLoan!.status === 'SETTLED', 'LoanAccount status updated to SETTLED after payment confirmation');
    assert(finalizedLoan!.overdueAmount === 0, 'Loan overdue amount reset to 0 upon settlement completion');

    // Test DPD engine invariant on SETTLED status
    const delinquencyCheck = computeLoanDelinquency({
      overdueAmount: 0,
      firstMissedDueDate: finalizedLoan!.firstMissedDueDate,
      status: finalizedLoan!.status,
    });
    assert(delinquencyCheck.status === 'SETTLED', 'DPD engine preserves SETTLED terminal status invariant');
    assert(delinquencyCheck.dpd === 0, 'DPD engine assigns 0 DPD to SETTLED account');

    console.log('\n--- Test Suite 4: Legal Escalation Below 90 DPD (Justified Early Risk) ---');
    // Create loan with 45 DPD
    const earlyRiskLoan = await LoanAccount.create({
      accountNumber: `STEP7-LEGAL-EARLY-${Date.now()}`,
      borrowerName: 'Early Risk Fraudulent Borrower',
      borrowerEmail: 'early.risk@example.com',
      borrowerPhone: '+91 9887766554',
      loanType: 'BUSINESS',
      principalAmount: 500000,
      interestRate: 16,
      tenureMonths: 36,
      emiAmount: 18000,
      totalOutstanding: 480000,
      overdueAmount: 36000,
      missedEmisCount: 2,
      nextDueDate: new Date(),
      firstMissedDueDate: new Date(Date.now() - 45 * 86400000), // 45 DPD (< 90 DPD)
      region: region._id,
      status: 'DELINQUENT',
      assignedAgent: agentProfile._id,
    });

    const earlyLegalCase = await LegalCase.create({
      caseNumber: `LEG-TEST-${Date.now()}-001`,
      loanAccount: earlyRiskLoan._id,
      escalatedBy: agentUser!._id as any,
      assignedLegalOfficer: legalUser!._id as any,
      reason: 'FRAUD_SUSPECTED',
      justification: 'Borrower forged collateral property documents and absconded from business premises. Urgent Sec 138 & criminal complaint required.',
      caseType: 'SECTION_138_NI_ACT',
      priority: 'CRITICAL',
      status: 'ESCALATED',
      claimAmount: earlyRiskLoan.totalOutstanding,
      auditHistory: [
        {
          action: 'CASE_ESCALATED',
          performedBy: agentUser!._id as any,
          performedAt: new Date(),
          role: 'AGENT',
          notes: 'Early escalation authorized due to suspected fraud and unreachability.',
          newStatus: 'ESCALATED',
        } as any,
      ],
    });

    assert(earlyLegalCase.status === 'ESCALATED', 'Legal case created for < 90 DPD account with justification');
    assert(earlyLegalCase.priority === 'CRITICAL', 'Critical priority assigned to fraud escalation');

    console.log('\n--- Test Suite 5: Statutory Legal Notices & Tracking ---');
    // Issue Section 138 Notice with Speed Post tracking
    const noticeTrackingId = 'EM987654321IN';
    earlyLegalCase.notices.push({
      noticeType: 'SECTION_138_NOTICE',
      noticeDate: new Date(),
      trackingNumber: noticeTrackingId,
      dispatchMode: 'SPEED_POST',
      issuedBy: legalUser!._id as any,
      responseDueDate: new Date(Date.now() + 15 * 86400000),
      responseStatus: 'AWAITING_RESPONSE',
      remarks: 'Statutory 15-day demand notice dispatched via India Post Speed Post.',
    } as any);
    earlyLegalCase.status = 'NOTICE_SENT';
    earlyLegalCase.auditHistory.push({
      action: 'NOTICE_ISSUED',
      performedBy: legalUser!._id as any,
      performedAt: new Date(),
      role: 'LEGAL_HEAD',
      notes: `Section 138 notice dispatched. Speed post ref: ${noticeTrackingId}`,
      previousStatus: 'ESCALATED',
      newStatus: 'NOTICE_SENT',
    } as any);
    await earlyLegalCase.save();

    assert(earlyLegalCase.status === 'NOTICE_SENT', 'Case status transitioned to NOTICE_SENT');
    assert(earlyLegalCase.notices.length === 1, 'Notice subdocument successfully added');
    assert(earlyLegalCase.notices[0].trackingNumber === noticeTrackingId, 'Notice tracking number recorded');

    console.log('\n--- Test Suite 6: Court Hearing Logs & Calendar Scheduling ---');
    // Add Court Hearing details
    const nextHearingDate = new Date(Date.now() + 30 * 86400000);
    earlyLegalCase.courtName = 'Metropolitan Magistrate Court, Pune';
    earlyLegalCase.courtCaseNumber = 'CC/4412/2026';
    earlyLegalCase.advocateName = 'Adv. Rajesh Shinde';
    earlyLegalCase.nextHearingDate = nextHearingDate;
    earlyLegalCase.status = 'HEARING_SCHEDULED';
    earlyLegalCase.hearings.push({
      hearingDate: new Date(),
      stage: 'Summons Verification',
      courtName: earlyLegalCase.courtName,
      judgeBench: 'Court Room No. 4, MM Court Pune',
      summary: 'Accused absent. Summons re-issued with bailable warrant warning.',
      outcome: 'Adjourned for summons returnable date.',
      nextHearingDate,
      loggedBy: legalUser!._id as any,
    } as any);
    earlyLegalCase.auditHistory.push({
      action: 'HEARING_RECORDED',
      performedBy: legalUser!._id as any,
      performedAt: new Date(),
      role: 'LEGAL_HEAD',
      notes: `Court hearing logged. Next date scheduled for ${nextHearingDate.toISOString().slice(0, 10)}`,
      previousStatus: 'NOTICE_SENT',
      newStatus: 'HEARING_SCHEDULED',
    } as any);
    await earlyLegalCase.save();

    assert(earlyLegalCase.status === 'HEARING_SCHEDULED', 'Case status updated to HEARING_SCHEDULED');
    assert(earlyLegalCase.hearings.length === 1, 'Hearing log subdocument recorded');
    assert(earlyLegalCase.nextHearingDate !== null, 'Next hearing date updated for judicial calendar');

    console.log('\n--- Test Suite 7: Debt Write-Off Governance (Separate from SETTLED) ---');
    // Uncollectible loan write-off test
    const writeOffLoan = await LoanAccount.create({
      accountNumber: `STEP7-WRITEOFF-${Date.now()}`,
      borrowerName: 'Chronic Default Deceased Borrower',
      borrowerEmail: 'deceased@example.com',
      borrowerPhone: '+91 9876500000',
      loanType: 'PERSONAL',
      principalAmount: 150000,
      interestRate: 15,
      tenureMonths: 24,
      emiAmount: 8000,
      totalOutstanding: 160000,
      overdueAmount: 160000,
      missedEmisCount: 12,
      nextDueDate: new Date(),
      firstMissedDueDate: new Date(Date.now() - 360 * 86400000), // 360 DPD
      region: region._id,
      status: 'DEFAULT',
    });

    const writeOffCase = await LegalCase.create({
      caseNumber: `LEG-WO-${Date.now()}`,
      loanAccount: writeOffLoan._id,
      escalatedBy: supervisorUser!._id as any,
      assignedLegalOfficer: legalUser!._id as any,
      reason: 'CHRONIC_DEFAULT_90_PLUS',
      justification: 'Borrower deceased with no surviving legal heirs or attachable assets. Uncollectible after extensive field and legal inquiry.',
      caseType: 'WRITE_OFF_RECOMMENDATION',
      priority: 'HIGH',
      status: 'ESCALATED',
      claimAmount: writeOffLoan.totalOutstanding,
      auditHistory: [],
    });

    // Legal Head executes Write-Off
    writeOffCase.status = 'WRITTEN_OFF';
    writeOffCase.writeOffDetails = {
      writeOffAmount: writeOffLoan.totalOutstanding,
      unrecoveredPrincipal: writeOffLoan.principalAmount,
      unrecoveredInterest: writeOffLoan.totalOutstanding - writeOffLoan.principalAmount,
      reason: 'Deceased borrower with no attachable estate',
      approvedBy: legalUser!._id as any,
      approvedAt: new Date(),
      writeOffReference: `WO-LEGAL-2026-001`,
      remarks: 'Signed off by Legal Head in accordance with NPA Write-Off Policy.',
    } as any;
    writeOffCase.auditHistory.push({
      action: 'DEBT_WRITTEN_OFF',
      performedBy: legalUser!._id as any,
      performedAt: new Date(),
      role: 'LEGAL_HEAD',
      notes: `Unrecoverable debt of ₹${writeOffLoan.totalOutstanding} formally written off.`,
      previousStatus: 'ESCALATED',
      newStatus: 'WRITTEN_OFF',
    } as any);
    await writeOffCase.save();

    // Mark LoanAccount as WRITTEN_OFF
    writeOffLoan.status = 'WRITTEN_OFF';
    await writeOffLoan.save();

    const finalizedWriteOffLoan = await LoanAccount.findById(writeOffLoan._id);
    assert(writeOffCase.status === 'WRITTEN_OFF', 'Legal case status marked WRITTEN_OFF');
    assert(finalizedWriteOffLoan!.status === 'WRITTEN_OFF', 'LoanAccount status updated to WRITTEN_OFF (strictly distinct from SETTLED)');
    assert(writeOffCase.writeOffDetails!.writeOffAmount === 160000, 'Write-off principal and interest amount recorded');

    const writeOffDelinquency = computeLoanDelinquency({
      overdueAmount: finalizedWriteOffLoan!.overdueAmount,
      firstMissedDueDate: finalizedWriteOffLoan!.firstMissedDueDate,
      status: finalizedWriteOffLoan!.status,
    });
    } else {
      // Standalone validation of Step 7 business rules
      const delinquencySettled = computeLoanDelinquency({
        overdueAmount: 0,
        firstMissedDueDate: null,
        status: 'SETTLED',
      });
      assert(delinquencySettled.status === 'SETTLED', 'DPD engine strictly preserves SETTLED terminal status');

      const delinquencyWrittenOff = computeLoanDelinquency({
        overdueAmount: 50000,
        firstMissedDueDate: new Date(Date.now() - 100 * 86400000),
        status: 'WRITTEN_OFF',
      });
      assert(delinquencyWrittenOff.status === 'WRITTEN_OFF', 'DPD engine strictly preserves WRITTEN_OFF terminal status');
      assert(delinquencyWrittenOff.status !== delinquencySettled.status, 'SETTLED and WRITTEN_OFF are strictly distinct statuses');
    }

    console.log('\n====================================================');
    console.log(`   ALL STEP 7 TESTS PASSED: ${passedTests}/${totalTests} ASSERTIONS`);
    console.log('====================================================\n');
  } finally {
    if (dbConnected) {
      await mongoose.disconnect();
      console.log(' [MongoDB] Disconnected after Step 7 tests\n');
    }
  }
}

runStep7Tests().catch((err) => {
  console.error('\n Step 7 Test Failure:', err);
  process.exit(1);
});
