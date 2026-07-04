#!/usr/bin/env node

/**
 * Generate secure JWT secret
 * Usage: node scripts/generate-jwt-secret.js
 */

const crypto = require('crypto');

console.log('🔑 Generating JWT secret...\n');

const secret = crypto.randomBytes(32).toString('hex');

console.log('✅ JWT secret generated successfully!\n');
console.log('Add this to your .env.local file:');
console.log('─'.repeat(60));
console.log(`JWT_SECRET=${secret}`);
console.log('─'.repeat(60));
console.log('\n⚠️  Keep this secret secure and never commit it to version control!');
console.log('💡 This secret is used to sign and verify JWT tokens.');
