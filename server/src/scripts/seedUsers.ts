import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { Region } from '../models/Region.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { LoanAccount } from '../models/LoanAccount.js';
import { UserRole } from '../types/user.js';
import { LoanType } from '../types/loan.js';

interface SeedUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

interface SeedRegionData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

const getRelativeDate = (daysAgo: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};

const getFutureDate = (daysAhead: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
};

const seedUsers: SeedUserData[] = [
  {
    name: 'CLRMS System Administrator',
    email: 'admin@clrms.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
    role: 'ADMIN',
    isActive: true,
  },
  {
    name: 'Operations Supervisor',
    email: 'supervisor@clrms.local',
    password: process.env.SEED_SUPERVISOR_PASSWORD || 'Supervisor@123456',
    role: 'SUPERVISOR',
    isActive: true,
  },
  {
    name: 'Field Collection Agent 1',
    email: 'agent@clrms.local',
    password: process.env.SEED_AGENT_PASSWORD || 'Agent@123456',
    role: 'AGENT',
    isActive: true,
  },
  {
    name: 'Field Collection Agent 2',
    email: 'agent2@clrms.local',
    password: process.env.SEED_AGENT_PASSWORD || 'Agent@123456',
    role: 'AGENT',
    isActive: true,
  },
  {
    name: 'Chief Legal Officer',
    email: 'legal@clrms.local',
    password: process.env.SEED_LEGAL_PASSWORD || 'Legal@123456',
    role: 'LEGAL_HEAD',
    isActive: true,
  },
];

const seedRegions: SeedRegionData[] = [
  {
    name: 'Pune',
    code: 'PUN',
    description: 'Pune Metropolitan Recovery Region',
    isActive: true,
  },
  {
    name: 'Mumbai',
    code: 'MUM',
    description: 'Mumbai Metro & Suburbs Recovery Region',
    isActive: true,
  },
];

async function seedDatabase() {
  console.log('==================================================');
  console.log('   CLRMS Master Data & Loan Accounts Seeding      ');
  console.log('   WARNING: FOR DEVELOPMENT/TESTING ONLY          ');
  console.log('==================================================');

  try {
    // 1. Connect to Database
    await connectDatabase();

    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed. Please ensure database is accessible.');
    }

    // 2. Seed Users
    console.log('\n[1/4] Checking Development Users in MongoDB...');
    const userMap = new Map<string, any>();

    for (const userData of seedUsers) {
      let user = await User.findOne({ email: userData.email.toLowerCase() });
      if (user) {
        console.log(`  ✓ User exists: ${userData.email} (${userData.role})`);
      } else {
        user = await User.create(userData);
        console.log(`  + Created user: ${userData.email} (${userData.role})`);
      }
      userMap.set(userData.email.toLowerCase(), user);
    }

    // 3. Seed Regions
    console.log('\n[2/4] Checking Sample Regions in MongoDB...');
    const regionMap = new Map<string, any>();

    for (const regData of seedRegions) {
      let region = await Region.findOne({ code: regData.code.toUpperCase() });
      if (region) {
        console.log(`  ✓ Region exists: ${regData.name} [${regData.code}]`);
      } else {
        region = await Region.create(regData);
        console.log(`  + Created region: ${regData.name} [${regData.code}]`);
      }
      regionMap.set(regData.code.toUpperCase(), region);
    }

    // 4. Seed Collection Agents
    console.log('\n[3/4] Checking Collection Agent Profiles...');
    const supervisor = userMap.get('supervisor@clrms.local');
    const agentUser1 = userMap.get('agent@clrms.local');
    const agentUser2 = userMap.get('agent2@clrms.local');
    const puneRegion = regionMap.get('PUN');
    const mumbaiRegion = regionMap.get('MUM');

    const seedAgents = [
      {
        user: agentUser1?._id,
        employeeCode: 'AGT-1001',
        region: puneRegion?._id,
        supervisor: supervisor?._id,
        phone: '+91 98765 43210',
        isActive: true,
      },
      {
        user: agentUser2?._id,
        employeeCode: 'AGT-1002',
        region: mumbaiRegion?._id,
        supervisor: supervisor?._id,
        phone: '+91 98765 43211',
        isActive: true,
      },
    ];

    for (const agtData of seedAgents) {
      if (!agtData.user || !agtData.region || !agtData.supervisor) continue;

      let agent = await CollectionAgent.findOne({ employeeCode: agtData.employeeCode });
      if (agent) {
        console.log(`  ✓ Collection Agent exists: ${agtData.employeeCode}`);
      } else {
        agent = await CollectionAgent.create(agtData);
        console.log(`  + Created Collection Agent: ${agtData.employeeCode}`);
      }
    }

    // 5. Seed Dynamic Loan Accounts (Distributed across 4 Delinquency Buckets)
    console.log('\n[4/4] Checking Loan Accounts in MongoDB (Dynamic DPD Bucketing)...');

    const seedLoans = [
      // Bucket: 0-30 Days (Early Stage / SMA0)
      {
        accountNumber: 'LN-10001',
        borrowerName: 'Rahul Sharma',
        borrowerEmail: 'rahul.sharma@example.com',
        borrowerPhone: '+91 98230 11221',
        borrowerAddress: 'Kothrud, Pune, Maharashtra 411038',
        loanType: 'PERSONAL' as LoanType,
        principalAmount: 250000,
        interestRate: 12.5,
        tenureMonths: 36,
        emiAmount: 9250,
        totalOutstanding: 185000,
        overdueAmount: 18500,
        missedEmisCount: 2,
        lastPaymentDate: getRelativeDate(45),
        nextDueDate: getFutureDate(15),
        firstMissedDueDate: getRelativeDate(15), // DPD ~ 15 -> 0-30 bucket
        region: puneRegion?._id,
      },
      {
        accountNumber: 'LN-10002',
        borrowerName: 'Priya Patel',
        borrowerEmail: 'priya.patel@example.com',
        borrowerPhone: '+91 98230 11222',
        borrowerAddress: 'Andheri West, Mumbai, Maharashtra 400053',
        loanType: 'AUTO' as LoanType,
        principalAmount: 600000,
        interestRate: 9.8,
        tenureMonths: 60,
        emiAmount: 12000,
        totalOutstanding: 420000,
        overdueAmount: 24000,
        missedEmisCount: 2,
        lastPaymentDate: getRelativeDate(52),
        nextDueDate: getFutureDate(8),
        firstMissedDueDate: getRelativeDate(22), // DPD ~ 22 -> 0-30 bucket
        region: mumbaiRegion?._id,
      },

      // Bucket: 31-60 Days (Mid Stage / SMA1)
      {
        accountNumber: 'LN-10003',
        borrowerName: 'Amit Verma',
        borrowerEmail: 'amit.verma@example.com',
        borrowerPhone: '+91 98230 11223',
        borrowerAddress: 'Viman Nagar, Pune, Maharashtra 411014',
        loanType: 'BUSINESS' as LoanType,
        principalAmount: 1000000,
        interestRate: 14.0,
        tenureMonths: 48,
        emiAmount: 25000,
        totalOutstanding: 750000,
        overdueAmount: 75000,
        missedEmisCount: 3,
        lastPaymentDate: getRelativeDate(75),
        nextDueDate: getFutureDate(15),
        firstMissedDueDate: getRelativeDate(45), // DPD ~ 45 -> 31-60 bucket
        region: puneRegion?._id,
      },
      {
        accountNumber: 'LN-10004',
        borrowerName: 'Sunita Rao',
        borrowerEmail: 'sunita.rao@example.com',
        borrowerPhone: '+91 98230 11224',
        borrowerAddress: 'Bandra East, Mumbai, Maharashtra 400051',
        loanType: 'HOME' as LoanType,
        principalAmount: 3500000,
        interestRate: 8.5,
        tenureMonths: 240,
        emiAmount: 31000,
        totalOutstanding: 2800000,
        overdueAmount: 92000,
        missedEmisCount: 3,
        lastPaymentDate: getRelativeDate(82),
        nextDueDate: getFutureDate(8),
        firstMissedDueDate: getRelativeDate(52), // DPD ~ 52 -> 31-60 bucket
        region: mumbaiRegion?._id,
      },

      // Bucket: 61-90 Days (Late Stage / SMA2)
      {
        accountNumber: 'LN-10005',
        borrowerName: 'Rajesh Kulkarni',
        borrowerEmail: 'rajesh.k@example.com',
        borrowerPhone: '+91 98230 11225',
        borrowerAddress: 'Hadapsar, Pune, Maharashtra 411028',
        loanType: 'CREDIT_CARD' as LoanType,
        principalAmount: 150000,
        interestRate: 24.0,
        tenureMonths: 12,
        emiAmount: 16000,
        totalOutstanding: 112000,
        overdueAmount: 48000,
        missedEmisCount: 3,
        lastPaymentDate: getRelativeDate(105),
        nextDueDate: getFutureDate(15),
        firstMissedDueDate: getRelativeDate(75), // DPD ~ 75 -> 61-90 bucket
        region: puneRegion?._id,
      },
      {
        accountNumber: 'LN-10006',
        borrowerName: 'Deepa Joshi',
        borrowerEmail: 'deepa.j@example.com',
        borrowerPhone: '+91 98230 11226',
        borrowerAddress: 'Thane West, Mumbai, Maharashtra 400601',
        loanType: 'PERSONAL' as LoanType,
        principalAmount: 400000,
        interestRate: 13.5,
        tenureMonths: 36,
        emiAmount: 15500,
        totalOutstanding: 290000,
        overdueAmount: 62000,
        missedEmisCount: 4,
        lastPaymentDate: getRelativeDate(114),
        nextDueDate: getFutureDate(6),
        firstMissedDueDate: getRelativeDate(84), // DPD ~ 84 -> 61-90 bucket
        region: mumbaiRegion?._id,
      },

      // Bucket: 90+ Days (Default / NPA)
      {
        accountNumber: 'LN-10007',
        borrowerName: 'Vikram Malhotra',
        borrowerEmail: 'vikram.m@example.com',
        borrowerPhone: '+91 98230 11227',
        borrowerAddress: 'Baner, Pune, Maharashtra 411045',
        loanType: 'BUSINESS' as LoanType,
        principalAmount: 2000000,
        interestRate: 15.0,
        tenureMonths: 60,
        emiAmount: 56000,
        totalOutstanding: 1650000,
        overdueAmount: 340000,
        missedEmisCount: 6,
        lastPaymentDate: getRelativeDate(150),
        nextDueDate: getFutureDate(1),
        firstMissedDueDate: getRelativeDate(120), // DPD ~ 120 -> 90+ bucket
        region: puneRegion?._id,
      },
      {
        accountNumber: 'LN-10008',
        borrowerName: 'Ananya Deshmukh',
        borrowerEmail: 'ananya.d@example.com',
        borrowerPhone: '+91 98230 11228',
        borrowerAddress: 'Powai, Mumbai, Maharashtra 400076',
        loanType: 'HOME' as LoanType,
        principalAmount: 4500000,
        interestRate: 8.75,
        tenureMonths: 240,
        emiAmount: 42000,
        totalOutstanding: 3900000,
        overdueAmount: 580000,
        missedEmisCount: 14,
        lastPaymentDate: getRelativeDate(210),
        nextDueDate: getFutureDate(1),
        firstMissedDueDate: getRelativeDate(180), // DPD ~ 180 -> 90+ bucket
        region: mumbaiRegion?._id,
      },
    ];

    for (const loanData of seedLoans) {
      if (!loanData.region) continue;

      let loan = await LoanAccount.findOne({ accountNumber: loanData.accountNumber });
      if (loan) {
        console.log(`  ✓ Loan exists: ${loan.accountNumber} (${loan.borrowerName}) - DPD: ${loan.dpd} [${loan.bucket}]`);
      } else {
        loan = await LoanAccount.create(loanData);
        console.log(`  + Created Loan: ${loan.accountNumber} (${loan.borrowerName}) - DPD: ${loan.dpd} [${loan.bucket}]`);
      }
    }

    console.log('\n==================================================');
    console.log(' Master Data Seeding Summary:');
    console.log(` - Total Users: ${seedUsers.length}`);
    console.log(` - Total Regions: ${seedRegions.length}`);
    console.log(` - Total Collection Agents: ${seedAgents.length}`);
    console.log(` - Total Loan Accounts: ${seedLoans.length}`);
    console.log('==================================================');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed master data:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

seedDatabase();
