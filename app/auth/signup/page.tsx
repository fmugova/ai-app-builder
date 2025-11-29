'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// ... other imports

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      // Call the API route instead
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          name: formData.get('name'),
        }),
      })

      if (response.ok) {
        router.push('/auth/signin')
      } else {
        const error = await response.json()
        alert(error.message || 'Signup failed')
      }
    } catch (error) {
      alert('Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignup}>
      {/* Your form JSX */}
    </form>
  )
}