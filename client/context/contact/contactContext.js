import { createContext, useContext } from 'react'

const ContactContext = createContext(null)

export const useContacts = () => {
  const context = useContext(ContactContext)

  if (!context) {
    throw new Error('useContacts must be inside <ContactState>')
  }

  return context
}

export default ContactContext
