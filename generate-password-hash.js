// Generate bcrypt hash for password reset
// Run: node generate-password-hash.js

const bcrypt = require('bcryptjs')

const password = 'TempPassword123!'

async function generateHash() {
  const hash = await bcrypt.hash(password, 10)
  console.log('\n=================================================')
  console.log('Password:', password)
  console.log('=================================================')
  console.log('\nRun this SQL in Supabase:\n')
  console.log(`UPDATE "User"`)
  console.log(`SET password = '${hash}'`)
  console.log(`WHERE email = 'fmugova@yahoo.com';`)
  console.log('\n=================================================')
  console.log('Then log in with password:', password)
  console.log('=================================================\n')
}

generateHash()
