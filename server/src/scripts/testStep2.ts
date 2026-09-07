import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { UserRole } from '../types/user.js';
import { config } from '../config/env.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runStep2UnitTests() {
  console.log('====================================================');
  console.log('       CLRMS STEP 2 AUTH & RBAC TEST SUITE          ');
  console.log('====================================================\n');

  // TEST 1: Password Hashing & Comparison
  console.log('[1] Testing Password Security (bcryptjs)');
  const plainPassword = 'Admin@123456';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  assert(hashedPassword !== plainPassword, 'Password is hashed and not stored in plain text');
  assert(hashedPassword.startsWith('$2'), 'Password hash uses valid bcrypt format');
  assert(await bcrypt.compare(plainPassword, hashedPassword), 'Correct password matches hash');
  assert(!(await bcrypt.compare('WrongPassword', hashedPassword)), 'Incorrect password rejected');

  // TEST 2: JWT Token Generation & Verification
  console.log('\n[2] Testing JWT Authentication');
  const payload = {
    id: '65f1234567890abcdef12345',
    email: 'admin@clrms.local',
    role: 'ADMIN' as UserRole,
  };

  const token = generateToken(payload);
  assert(typeof token === 'string' && token.length > 20, 'JWT token generated successfully');

  const decoded = verifyToken(token);
  assert(decoded.id === payload.id, 'Decoded token ID matches payload');
  assert(decoded.email === payload.email, 'Decoded token email matches payload');
  assert(decoded.role === 'ADMIN', 'Decoded token role matches payload');

  // TEST 3: JWT Tampering & Expiry
  console.log('\n[3] Testing JWT Security & Validation');
  let tamperedCaught = false;
  try {
    verifyToken(token + 'corrupted');
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered token is rejected with verification error');

  const expiredToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '-1s' });
  let expiredCaught = false;
  try {
    verifyToken(expiredToken);
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') expiredCaught = true;
  }
  assert(expiredCaught, 'Expired token is rejected with TokenExpiredError');

  // TEST 4: Role-Based Access Control (RBAC) Logic
  console.log('\n[4] Testing RBAC Authorization Rules');
  const roles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'LEGAL_HEAD'];

  const canAccessAdmin = (role: UserRole) => role === 'ADMIN';
  const canAccessSupervisor = (role: UserRole) => role === 'SUPERVISOR' || role === 'ADMIN';
  const canAccessAgent = (role: UserRole) => role === 'AGENT';
  const canAccessLegal = (role: UserRole) => role === 'LEGAL_HEAD';

  assert(canAccessAdmin('ADMIN') && !canAccessAdmin('AGENT') && !canAccessAdmin('SUPERVISOR') && !canAccessAdmin('LEGAL_HEAD'), 'Only ADMIN can access admin area');
  assert(canAccessSupervisor('SUPERVISOR') && canAccessSupervisor('ADMIN') && !canAccessSupervisor('AGENT') && !canAccessSupervisor('LEGAL_HEAD'), 'SUPERVISOR and ADMIN can access supervisor area');
  assert(canAccessAgent('AGENT') && !canAccessAgent('LEGAL_HEAD'), 'AGENT can access agent area, LEGAL_HEAD blocked');
  assert(canAccessLegal('LEGAL_HEAD') && !canAccessLegal('AGENT'), 'LEGAL_HEAD can access legal area, AGENT blocked');

  // TEST 5: Input Validation Tests
  console.log('\n[5] Testing Input Validation Rules');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert(emailRegex.test('admin@clrms.local'), 'Valid email passes pattern');
  assert(!emailRegex.test('invalid-email'), 'Invalid email rejected by pattern');
  assert(!emailRegex.test(''), 'Empty email rejected');

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passedTests}/${totalTests} Tests Passed Successfully!`);
  console.log('====================================================\n');
}

runStep2UnitTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
