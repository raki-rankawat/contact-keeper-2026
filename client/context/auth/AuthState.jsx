import axios from 'axios'
import { useReducer } from 'react'
import AuthContext from './authContext'
import authReducer from './authReducer'
import { CLEAR_ERRORS, REGISTER_FAIL, REGISTER_SUCCESS } from '../types'

const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  user: null,
  loading: true,
  error: null,
}

const AuthState = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  // Load User
  const loadUser = () => {}

  // Register User
  const register = async formData => {
    try {
      const res = await axios.post('/api/users', formData, config)

      dispatch({
        type: REGISTER_SUCCESS,
        payload: res.data,
      })
    } catch (err) {
      const data = err.response?.data

      dispatch({
        type: REGISTER_FAIL,
        payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Registration failed',
      })
    }
  }

  // Login User
  const login = () => {}

  // Logout
  const logout = () => {}

  // Clear Errors
  const clearErrors = () => {
    dispatch({ type: CLEAR_ERRORS })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        loadUser,
        login,
        logout,
        clearErrors,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthState
