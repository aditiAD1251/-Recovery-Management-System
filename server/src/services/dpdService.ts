import { DelinquencyBucket, LoanStatus } from '../types/loan.js';
import { LoanAccount } from '../models/LoanAccount.js';

/**
 * Days Past Due (DPD) & Delinquency Bucketing Engine
 */

/**
 * Calculate DPD (Days Past Due) based on earliest unpaid EMI due date
 *
 * @param overdueAmount Current outstanding overdue amount
 * @param firstMissedDueDate Earliest unpaid EMI date
 * @param referenceDate Calculation reference date (defaults to now)
 */
export const calculateDPD = (
  overdueAmount: number,
  firstMissedDueDate?: Date | string | null,
  referenceDate: Date = new Date()
): number => {
  if (!overdueAmount || overdueAmount <= 0 || !firstMissedDueDate) {
    return 0;
  }

  const missedDate = new Date(firstMissedDueDate);
  if (isNaN(missedDate.getTime())) {
    return 0;
  }

  const refTime = referenceDate.getTime();
  const missedTime = missedDate.getTime();

  // If the missed due date is in the future, DPD is 0
  if (missedTime >= refTime) {
    return 0;
  }

  const diffInMilliseconds = refTime - missedTime;
  const days = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
};

/**
 * Determine Delinquency Bucket based on DPD and overdue amount
 *
 * @param dpd Days Past Due
 * @param overdueAmount Current overdue amount
 */
export const determineBucket = (
  dpd: number,
  overdueAmount: number
): DelinquencyBucket => {
  if (overdueAmount <= 0 || dpd <= 30) {
    return '0-30';
  }
  if (dpd >= 31 && dpd <= 60) {
    return '31-60';
  }
  if (dpd >= 61 && dpd <= 90) {
    return '61-90';
  }
  return '90+';
};

/**
 * Determine Loan Status based on DPD and Overdue Amount with Terminal Status Preservation
 *
 * Terminal Rule: SETTLED and CLOSED statuses are strictly preserved and never reverted.
 *
 * @param dpd Days Past Due
 * @param overdueAmount Current overdue amount
 * @param currentStatus Existing loan status
 */
export const determineStatus = (
  dpd: number,
  overdueAmount: number,
  currentStatus?: LoanStatus
): LoanStatus => {
  // 1. Strictly preserve terminal statuses (SETTLED, CLOSED, WRITTEN_OFF)
  if (
    currentStatus === 'SETTLED' ||
    currentStatus === 'CLOSED' ||
    currentStatus === 'WRITTEN_OFF'
  ) {
    return currentStatus;
  }

  // 2. Fully regularized / up to date accounts
  if (overdueAmount <= 0 || dpd === 0) {
    return 'CURRENT';
  }

  // 3. 90+ days default / NPA
  if (dpd > 90) {
    return 'DEFAULT';
  }

  // 4. Active overdue delinquent account (1-90 days)
  return 'DELINQUENT';
};

/**
 * Compute Complete Delinquency Metadata (DPD, Bucket, Status)
 */
export const computeLoanDelinquency = (
  loanData: {
    overdueAmount?: number;
    firstMissedDueDate?: Date | string | null;
    status?: LoanStatus;
  },
  referenceDate: Date = new Date()
): {
  dpd: number;
  bucket: DelinquencyBucket;
  status: LoanStatus;
} => {
  const overdueAmount = Number(loanData.overdueAmount) || 0;

  // Handle terminal status preservation
  if (
    loanData.status === 'SETTLED' ||
    loanData.status === 'CLOSED' ||
    loanData.status === 'WRITTEN_OFF'
  ) {
    return {
      dpd: 0,
      bucket: '0-30',
      status: loanData.status,
    };
  }

  const dpd = calculateDPD(overdueAmount, loanData.firstMissedDueDate, referenceDate);
  const bucket = determineBucket(dpd, overdueAmount);
  const status = determineStatus(dpd, overdueAmount, loanData.status);

  return { dpd, bucket, status };
};

/**
 * Batch recalculate DPD and bucket classification across all loan accounts in the database
 */
export const recalculateAllLoansDPD = async (): Promise<{
  updatedCount: number;
  totalCount: number;
}> => {
  const loans = await LoanAccount.find({});
  let updatedCount = 0;

  for (const loan of loans) {
    const { dpd, bucket, status } = computeLoanDelinquency({
      overdueAmount: loan.overdueAmount,
      firstMissedDueDate: loan.firstMissedDueDate,
      status: loan.status,
    });

    if (
      loan.dpd !== dpd ||
      loan.bucket !== bucket ||
      loan.status !== status
    ) {
      loan.dpd = dpd;
      loan.bucket = bucket;
      loan.status = status;
      await loan.save();
      updatedCount++;
    }
  }

  return {
    updatedCount,
    totalCount: loans.length,
  };
};
