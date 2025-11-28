const bcrypt = require('bcrypt')

async function test() {
  const password = 'Admin123!'
  const storedHash = '$2b$10$rKZU7EHqCv5pqE.LvVH3/.VwJWaHJGW8gC8N8nC7uEQKqVxPQc5Yq'
  
  console.log('Testing password:', password)
  console.log('Against hash:', storedHash)
  
  const isMatch = await bcrypt.compare(password, storedHash)
  console.log('Password matches:', isMatch)
  
  if (!isMatch) {
    console.log('\n❌ Password does not match! Generating new hash...')
    const newHash = await bcrypt.hash(password, 10)
    console.log('New hash to use:', newHash)
  }
}

test()