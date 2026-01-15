// Usage: node hash-password.js <your-password>
// Prints a bcrypt hash for the given password

import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node hash-password.js SIMBA07rashe99$');
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Bcrypt hash:', hash);
});
