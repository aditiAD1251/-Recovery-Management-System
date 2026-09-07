import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { User } from '../models/User.js';

async function runDiagnostic() {
  console.log('====================================================');
  console.log('       CLRMS LOGIN & USER AUTH DIAGNOSTIC           ');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(mongoUri);
  console.log('[MongoDB] Connected successfully.\n');

  const usersToCheck = [
    { email: 'admin@clrms.local', expectedRole: 'ADMIN', defaultPassword: 'Admin@123456' },
    { email: 'supervisor@clrms.local', expectedRole: 'SUPERVISOR', defaultPassword: 'Supervisor@123456' },
    { email: 'agent@clrms.local', expectedRole: 'AGENT', defaultPassword: 'Agent@123456' },
    { email: 'agent2@clrms.local', expectedRole: 'AGENT', defaultPassword: 'Agent@123456' },
    { email: 'legal@clrms.local', expectedRole: 'LEGAL_HEAD', defaultPassword: 'Legal@123456' },
  ];

  for (const item of usersToCheck) {
    console.log(`Checking account: ${item.email}`);
    const user = await User.findOne({ email: item.email }).select('+password');

    if (!user) {
      console.log(`  ✗ User NOT FOUND in database!`);
      continue;
    }

    console.log(`  ✓ User found in DB (ID: ${user._id})`);
    console.log(`  ✓ Name: ${user.name}`);
    console.log(`  ✓ Role: ${user.role} (Expected: ${item.expectedRole})`);
    console.log(`  ✓ Active Status: ${user.isActive}`);
    console.log(`  ✓ Password Hash present: ${!!user.password} (${user.password?.slice(0, 15)}...)`);

    // Test with the seeded password
    const matchesDefault = await user.comparePassword(item.defaultPassword);
    console.log(`  → Testing password "${item.defaultPassword}": ${matchesDefault ? '✓ MATCHES' : '✗ DOES NOT MATCH'}`);

    // Test with shorter password (e.g., Agent@123)
    const shortPassword = item.defaultPassword.replace('123456', '123');
    const matchesShort = await user.comparePassword(shortPassword);
    console.log(`  → Testing password "${shortPassword}": ${matchesShort ? '✓ MATCHES' : '✗ DOES NOT MATCH'}`);

    console.log('');
  }

  // Direct HTTP login test against Express server
  console.log('Testing HTTP POST /api/v1/auth/login against running server at http://localhost:5000...\n');

  for (const item of usersToCheck) {
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: item.email,
          password: item.defaultPassword,
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        console.log(`  ✓ HTTP Login SUCCESS for ${item.email} (Status: ${res.status}, Role: ${data.data.user.role}, Token: ${data.data.token.slice(0, 20)}...)`);
      } else {
        console.log(`  ✗ HTTP Login FAILED for ${item.email} (Status: ${res.status}, Error: ${data.message || data.error})`);
      }

    } catch (err: any) {
      console.log(`  ✗ HTTP Request Error for ${item.email}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n[MongoDB] Disconnected.');
}

runDiagnostic().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
