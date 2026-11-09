
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)

      const { data } = await api.post(
        `/auth/reset-password/${token}`,
        { password }
      )

      setSuccess(data.message || 'Password reset successful')

      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(
        err.response?.data?.message || 'Reset failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070709] px-4 py-12">

      {/* Background Glow */}
      <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-red-600/20 blur-[130px]" />
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-purple-700/20 blur-[130px]" />

      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '45px 45px',
        }}
      />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111114]/90 shadow-2xl shadow-red-950/20 backdrop-blur-xl md:grid md:grid-cols-2">

        {/* Left Branding */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-red-950 via-[#190d13] to-[#101014] p-12 md:flex">

          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border border-red-500/10" />
          <div className="absolute -right-10 top-32 h-52 w-52 rounded-full border border-red-500/10" />

          <div className="relative z-10">
            <h1 className="text-4xl font-black text-white">
              Movie<span className="text-red-500">Flex</span>
            </h1>

            <div className="mt-24">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-4xl">
                🔐
              </div>

              <h2 className="text-5xl font-extrabold leading-tight text-white">
                Secure Your
                <br />
                <span className="text-red-500">Account.</span>
              </h2>

              <p className="mt-6 max-w-sm text-base leading-7 text-zinc-400">
                Create a new password and get back to
                your favorite movies and series.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="h-px w-full bg-linear-to-r from-red-500/50 to-transparent" />
            <p className="mt-5 text-sm text-zinc-500">
              © 2026 MovieFlex. Watch More. Feel More.
            </p>
          </div>
        </div>

        {/* Right Form */}
        <div className="flex flex-col justify-center p-7 sm:p-12">

          {/* Mobile Logo */}
          <div className="mb-10 text-center md:hidden">
            <h1 className="text-4xl font-black text-white">
              Movie<span className="text-red-500">Flex</span>
            </h1>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[3px] text-red-500">
              Account Security
            </p>

            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Reset Password
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Choose a strong new password for your account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* New Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                New Password
              </label>

              <div className="flex items-center rounded-xl border border-zinc-700 bg-[#1a1a20] transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10">
                <span className="pl-4 text-zinc-500">🔒</span>

                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Minimum 6 characters required.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Confirm Password
              </label>

              <div className="flex items-center rounded-xl border border-zinc-700 bg-[#1a1a20] transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10">
                <span className="pl-4 text-zinc-500">🔐</span>

                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-linear-to-r from-red-600 to-red-500 py-4 font-bold text-white shadow-lg shadow-red-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-red-600/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-10">
                {loading
                  ? 'Resetting Password...'
                  : 'Reset Password →'}
              </span>
            </button>
          </form>

          {/* Back to Login */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">
              REMEMBER YOUR PASSWORD?
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <Link
            to="/login"
            className="text-center text-sm font-bold text-red-500 transition hover:text-red-400"
          >
            ← Back to Login
          </Link>

          <p className="mt-10 text-center text-xs text-zinc-600">
            Secure Password Recovery · MovieFlex
          </p>
        </div>
      </div>
    </div>
  )
}
