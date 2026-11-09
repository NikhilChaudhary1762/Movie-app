
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="p-10 text-white">Loading...</div>
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace />
}
