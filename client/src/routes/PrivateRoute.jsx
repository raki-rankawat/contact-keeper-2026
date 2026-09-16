import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/auth/authContext'

const PrivateRoute = () => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  return <Outlet />
}

export default PrivateRoute
