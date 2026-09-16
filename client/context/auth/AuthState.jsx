import { useReducer } from 'react'
import AuthContext from './authContext'
import authReducer from './authReducer'
import {} from '../types'

const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: true,
  error: null,
}

const AuthState = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Load User

  // Register User

  // Login User

  // Logout

  // Clear Errors

  return (
    <AuthContext.Provider
      value={{
        ...state,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthState
