import { useReducer } from 'react'
import { v4 } from 'uuid'
import ContactContext from './contactContext'
import contactReducer from './contactReducer'
import {
  ADD_CONTACT,
  DELETE_CONTACT,
  SET_CURRENT,
  CLEAR_CURRENT,
  FILTER_CONTACTS,
  CLEAR_FILTER,
} from '../types'

const initialState = {
  contacts: [
    {
      id: 1,
      name: 'Jill Johnson',
      email: 'jill@gmail.com',
      phone: '111-111-1111',
      type: 'personal',
    },
    {
      id: 2,
      name: 'Sara Watson',
      email: 'sara@gmail.com',
      phone: '111-122-1111',
      type: 'personal',
    },
    {
      id: 3,
      name: 'Harry White',
      email: 'harry@gmail.com',
      phone: '111-144-1111',
      type: 'professional',
    },
  ],
}

const ContactState = ({ children }) => {
  const [state, dispatch] = useReducer(contactReducer, initialState)

  // Add Contact

  // Delete Contact

  // Set Current Contact

  // Clear Current Contact

  // Update Contact

  // Filter Contacts

  // Clear Filter

  return (
    <ContactContext.Provider value={{ ...state }}>
      {children}
    </ContactContext.Provider>
  )
}

export default ContactState
