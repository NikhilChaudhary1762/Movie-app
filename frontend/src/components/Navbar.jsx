
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Film,
  Tv,
  Bookmark,
  Shield,
  LogOut,
  Menu,
  X,
  Clapperboard,
} from 'lucide-react'




const ProfileAvatar = ({ profileImage, initials, size = 'w-8 h-8' }) => (
    <div
      className={`${size} rounded-full overflow-hidden shrink-0
      border border-white/20 bg-red-600 flex items-center justify-center`}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt="Profile"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <span className="text-white text-xs font-bold">
          {initials}
        </span>
      )}
    </div>
  )

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [mobileMenu, setMobileMenu] = useState(false)

  const handleLogout = () => {
    logout()
    setMobileMenu(false)
    navigate('/login')
  }

  // Profile image and initials
  const profileImage = user?.profileImage || ''

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U'

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Movies', path: '/movies', icon: Film },
    { name: 'Web Series', path: '/series', icon: Tv },
    { name: 'Watchlist', path: '/watchlist', icon: Bookmark },
  ]

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl
    text-sm font-medium transition-all duration-300
    ${
      isActive
        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
        : 'text-gray-400 hover:text-white hover:bg-white/10'
    }`

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10
      bg-[#080808]/90 backdrop-blur-xl">

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="h-20 flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600
              flex items-center justify-center
              group-hover:scale-110 transition-transform">
              <Clapperboard size={23} className="text-white" />
            </div>

            <span className="text-2xl font-black tracking-tight">
              Movie<span className="text-red-600">Flex</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">

            {navItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={navClass}
                >
                  <Icon size={18} />
                  {item.name}
                </NavLink>
              )
            })}

          </div>

          {/* Desktop User Actions */}
          <div className="hidden lg:flex items-center gap-3">

            {isAuthenticated ? (
              <>
                {/* Profile */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2
                    rounded-xl border border-white/10
                    bg-white/5 hover:bg-white/10 transition"
                >
                  <ProfileAvatar profileImage={profileImage} initials={initials} />

                  <span className="text-sm text-gray-200
                    max-w-24 truncate">
                    {user?.name || 'Profile'}
                  </span>
                </Link>

                {/* Admin */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 text-gray-400
                      hover:text-white px-3 py-2 transition"
                  >
                    <Shield size={18} />
                    Admin
                  </Link>
                )}

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5
                    rounded-xl bg-red-600 hover:bg-red-700
                    text-sm font-semibold transition"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-300
                    hover:text-white transition"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="px-5 py-2.5 rounded-xl bg-red-600
                    hover:bg-red-700 font-semibold text-sm transition"
                >
                  Signup
                </Link>
              </>
            )}

          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="lg:hidden w-10 h-10 flex items-center
              justify-center rounded-xl bg-white/5
              border border-white/10 hover:bg-white/10"
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>

        </div>

        {/* Mobile Navigation */}
        {mobileMenu && (
          <div className="lg:hidden pb-5 space-y-2
            border-t border-white/10 pt-4">

            {navItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenu(false)}
                  className={navClass}
                >
                  <Icon size={19} />
                  {item.name}
                </NavLink>
              )
            })}

            {isAuthenticated ? (
              <>
                {/* Mobile Profile */}
                <NavLink
                  to="/profile"
                  onClick={() => setMobileMenu(false)}
                  className={navClass}
                >
                  <ProfileAvatar
                    profileImage={profileImage}
                    initials={initials}
                    size="w-9 h-9"
                  />
                  Profile
                  <span className="text-gray-400 ml-auto">
                    {user?.name}
                  </span>
                </NavLink>

                {/* Mobile Admin */}
                {user?.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={() => setMobileMenu(false)}
                    className={navClass}
                  >
                    <Shield size={19} />
                    Admin Panel
                  </NavLink>
                )}

                {/* Mobile Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2
                    px-4 py-3 rounded-xl bg-red-600
                    hover:bg-red-700 font-semibold text-sm"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenu(false)}
                  className="flex-1 text-center py-3
                    rounded-xl border border-white/10"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  onClick={() => setMobileMenu(false)}
                  className="flex-1 text-center py-3
                    rounded-xl bg-red-600 font-semibold"
                >
                  Signup
                </Link>
              </div>
            )}

          </div>
        )}

      </div>
    </nav>
  )
}

export default Navbar
