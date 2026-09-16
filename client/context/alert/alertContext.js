import { createContext, useContext } from 'react'

const AlertContext = createContext(null)

export const useAlert = () => {
  const context = useContext(AlertContext)

  if (!context) {
    throw new Error('useAlert must be inside <AlertState>')
  }

  return context
}

export default AlertContext
