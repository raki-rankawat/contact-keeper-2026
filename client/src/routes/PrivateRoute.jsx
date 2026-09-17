import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth/authContext'
import Spinner from '../components/layout/Spinner'

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <Spinner />
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  return <Outlet />
}

export default PrivateRoute
