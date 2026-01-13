// Generate bcrypt hash for password reset
// Run: node generate-password-hash.js

const bcrypt = require('bcryptjs')


const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-password-hash.js <password>');
  process.exit(1);
}

async function generateHash() {
  const hash = await bcrypt.hash(password, 12)
  console.log('\n=================================================')
  console.log('Password:', password)
  console.log('=================================================')
  console.log('\nYour bcrypt hash:')
  console.log(hash)
  console.log('=================================================\n')
}

generateHash()
