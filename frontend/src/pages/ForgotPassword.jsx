
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post(
        '/auth/forgot-password',
        { email }
      )

      setMessage(
        data.message ||
          'If the account exists, a reset email has been sent.'
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to send reset email'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-white"
      >
        <h1 className="text-center text-3xl font-bold">
          Movie<span className="text-red-600">Flex</span>
        </h1>

        <h2 className="text-xl font-semibold">
          Forgot Password?
        </h2>

        <p className="text-sm text-zinc-400">
          Enter your registered email address to receive a password reset link.
        </p>

        {message && (
          <p className="rounded-lg bg-green-500/10 p-3 text-green-400 text-sm">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 p-3 text-red-400 text-sm">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:border-red-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 p-3 font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="text-center text-zinc-400 text-sm">
          Remember your password?{' '}
          <Link to="/login" className="text-red-500">
            Back to Login
          </Link>
        </p>
      </form>
    </div>
  )
}
