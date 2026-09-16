import axios from 'axios'
import { useCallback, useReducer } from 'react'
import AuthContext from './authContext'
import authReducer from './authReducer'
import setAuthToken from '../../utils/setAuthToken'
import {
  AUTH_ERROR,
  CLEAR_ERRORS,
  LOGIN_FAIL,
  LOGIN_SUCCESS,
  LOGOUT,
  REGISTER_FAIL,
  REGISTER_SUCCESS,
  USER_LOADED,
} from '../types'

const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  user: null,
  loading: true,
  error: null,
}

const config = {
  headers: {
    'Content-Type': 'application/json',
  },
}

// Token persistence lives here, not in the reducer: React runs the reducer
// during the next render, so anything called right after dispatch would
// still see the old localStorage.
const saveToken = token => {
  localStorage.setItem('token', token)
  setAuthToken(token)
}

const clearToken = () => {
  localStorage.removeItem('token')
  setAuthToken(null)
}

const AuthState = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Load User
  const loadUser = useCallback(async () => {
    setAuthToken(localStorage.getItem('token'))

    try {
      const res = await axios.get('/api/auth')

      dispatch({ type: USER_LOADED, payload: res.data })
    } catch (err) {
      const data = err.response?.data

      clearToken()
      dispatch({
        type: AUTH_ERROR,
        payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Failed to load user',
      })
    }
  }, [])

  // Register User
  const register = useCallback(
    async formData => {
      try {
        const res = await axios.post('/api/users', formData, config)

        saveToken(res.data.token)
        dispatch({
          type: REGISTER_SUCCESS,
          payload: res.data,
        })

        loadUser()
      } catch (err) {
        const data = err.response?.data

        clearToken()
        dispatch({
          type: REGISTER_FAIL,
          payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Registration failed',
        })
      }
    },
    [loadUser],
  )

  // Login User
  const login = useCallback(
    async formData => {
      try {
        const res = await axios.post('/api/auth', formData, config)

        saveToken(res.data.token)
        dispatch({
          type: LOGIN_SUCCESS,
          payload: res.data,
        })

        loadUser()
      } catch (err) {
        const data = err.response?.data

        clearToken()
        dispatch({
          type: LOGIN_FAIL,
          payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Login failed',
        })
      }
    },
    [loadUser],
  )

  // Logout
  const logout = () => {
    dispatch({ type: LOGOUT })
  }

  // Clear Errors
  const clearErrors = useCallback(() => {
    dispatch({ type: CLEAR_ERRORS })
  }, [])

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
