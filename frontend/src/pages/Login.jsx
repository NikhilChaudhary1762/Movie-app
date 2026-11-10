
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.from || '/'

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
      await login(form)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070709] px-4 py-10">

      {/* Background Effects */}
      <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-red-600/20 blur-[130px]" />
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-purple-700/10 blur-[130px]" />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '45px 45px',
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111114]/90 shadow-2xl shadow-red-950/20 backdrop-blur-xl md:grid-cols-2">

        {/* Left Section */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-red-950 via-[#190d13] to-[#101014] p-12 md:flex">

          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border border-red-500/10" />
          <div className="absolute -right-10 top-32 h-52 w-52 rounded-full border border-red-500/10" />

          <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tight text-white">
              Movie<span className="text-red-500">Flex</span>
            </h1>

            <div className="mt-20">
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[3px] text-red-400">
                Unlimited Entertainment
              </span>

              <h2 className="mt-8 text-5xl font-extrabold leading-tight text-white">
                Your Next
                <br />
                <span className="text-red-500">Movie</span>
                <br />
                Adventure
                <br />
                Starts Here.
              </h2>

              <p className="mt-6 max-w-sm text-base leading-7 text-zinc-400">
                Discover movies, explore amazing series
                and enjoy unlimited entertainment with
                MovieFlex.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12">
            <div className="h-px w-full bg-linear-to-r from-red-500/50 to-transparent" />
            <p className="mt-5 text-sm text-zinc-500">
              © 2026 MovieFlex. Watch More. Feel More.
            </p>
          </div>
        </div>

        {/* Right Login Section */}
        <div className="flex flex-col justify-center p-7 sm:p-12">

          {/* Mobile Logo */}
          <div className="mb-10 text-center md:hidden">
            <h1 className="text-4xl font-black text-white">
              Movie<span className="text-red-500">Flex</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Your Entertainment Destination
            </p>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[3px] text-red-500">
              Welcome Back
            </p>

            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Sign In
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              Enter your details to access your account.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <span>⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Email Address
              </label>

              <div className="flex items-center rounded-xl border border-zinc-700 bg-[#1a1a20] transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10">
                <span className="pl-4 text-zinc-500">✉</span>

                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-red-500 transition hover:text-red-400"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="flex items-center rounded-xl border border-zinc-700 bg-[#1a1a20] transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10">
                <span className="pl-4 text-zinc-500">🔒</span>

                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-linear-to-r from-red-600 to-red-500 py-4 font-bold text-white shadow-lg shadow-red-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-red-600/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-10">
                {loading ? 'Signing In...' : 'Sign In to MovieFlex →'}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">NEW TO MOVIEFLEX?</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Signup */}
          <p className="text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              state={{ from: returnTo }}
              className="font-bold text-red-500 transition hover:text-red-400"
            >
              Create Account
            </Link>
          </p>

          <p className="mt-10 text-center text-xs text-zinc-600">
            Secure Login · MovieFlex Entertainment
          </p>
        </div>
      </div>
    </div>
  )
}
