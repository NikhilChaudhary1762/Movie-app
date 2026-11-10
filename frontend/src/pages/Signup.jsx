
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.from || '/'

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signup(form)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message || 'Signup failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-white"
      >
        <h1 className="text-center text-3xl font-bold">
          Movie<span className="text-red-600">Flix</span>
        </h1>

        <h2 className="text-xl font-semibold">Create Account</h2>

        {error && (
          <p className="rounded bg-red-500/10 p-3 text-red-400">
            {error}
          </p>
        )}

        <input
          name="name"
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:border-red-500"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:border-red-500"
        />

        <input
          name="password"
          type="password"
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:border-red-500"
        />

        <button
          disabled={loading}
          className="w-full rounded-lg bg-red-600 p-3 font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Signup'}
        </button>

        <p className="text-center text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" state={{ from: returnTo }} className="text-red-500">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
