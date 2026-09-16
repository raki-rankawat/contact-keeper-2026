import { useReducer } from 'react'
import { v4 } from 'uuid'

import AlertContext from './alertContext'
import alertReducer from './alertReducer'
import { REMOVE_ALERT, SET_ALERT } from '../types'

const initialState = {
  alerts: [],
}

const AuthState = ({ children }) => {
  const [state, dispatch] = useReducer(alertReducer, initialState)

  // Set/Remove Alert
  const setAlert = (msg, type, timeout = 5000) => {
    const id = v4()

    dispatch({ type: SET_ALERT, payload: { id, msg, type } })

    setTimeout(() => {
      dispatch({ type: REMOVE_ALERT, payload: id })
    }, timeout)
  }

  return (
    <AlertContext.Provider
      value={{
        ...state,
        setAlert,
      }}
    >
      {children}
    </AlertContext.Provider>
  )
}

export default AuthState
