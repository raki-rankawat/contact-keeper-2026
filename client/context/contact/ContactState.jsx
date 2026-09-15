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
  UPDATE_CONTACT,
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
  current: null,
}

const ContactState = ({ children }) => {
  const [state, dispatch] = useReducer(contactReducer, initialState)

  // Add Contact
  const addContact = contact => {
    contact.id = v4()
    dispatch({ type: ADD_CONTACT, payload: contact })
  }

  // Delete Contact
  const onDelete = id => {
    dispatch({ type: DELETE_CONTACT, payload: id })
  }

  // Set Current Contact
  const setCurrent = contact => {
    dispatch({ type: SET_CURRENT, payload: contact })
  }

  // Clear Current Contact
  const clearCurrent = () => {
    dispatch({ type: SET_CURRENT })
  }

  // Update Contact
  const updateContact = contact => {
    dispatch({ type: UPDATE_CONTACT, payload: contact })
  }

  // Filter Contacts

  // Clear Filter

  return (
    <ContactContext.Provider
      value={{
        ...state,
        addContact,
        onDelete,
        setCurrent,
        clearCurrent,
        updateContact,
      }}
    >
      {children}
    </ContactContext.Provider>
  )
}

export default ContactState
