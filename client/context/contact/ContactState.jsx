import { useReducer } from 'react'
import axios from 'axios'
import ContactContext from './contactContext'
import contactReducer from './contactReducer'
import {
  ADD_CONTACT,
  DELETE_CONTACT,
  SET_CURRENT,
  CLEAR_CURRENT,
  UPDATE_CONTACT,
  FILTER_CONTACTS,
  CLEAR_FILTER,
  CONTACT_ERROR,
  GET_CONTACTS,
  CLEAR_CONTACTS,
} from '../types'

const initialState = {
  contacts: null,
  current: null,
  filter: '',
  error: null,
}

const ContactState = ({ children }) => {
  const [state, dispatch] = useReducer(contactReducer, initialState)

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  // Get Contacts
  const getContacts = async () => {
    try {
      const res = await axios.get('/api/contacts')

      dispatch({ type: GET_CONTACTS, payload: res.data })
    } catch (err) {
      const data = err.response?.data

      dispatch({
        type: CONTACT_ERROR,
        payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Failed to load',
      })
    }
  }

  // Clear Contacts
  const clearContacts = () => {
    dispatch({ type: CLEAR_CONTACTS })
  }

  // Add Contact
  const addContact = async contact => {
    try {
      const res = await axios.post('/api/contacts', contact, config)
      dispatch({ type: ADD_CONTACT, payload: res.data })
    } catch (err) {
      const data = err.response?.data

      dispatch({
        type: CONTACT_ERROR,
        payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Failed to add',
      })
    }
  }

  // Update Contact
  const updateContact = async contact => {
    try {
      const res = await axios.put(
        `/api/contacts/${contact._id}`,
        contact,
        config,
      )

      dispatch({ type: UPDATE_CONTACT, payload: res.data })
    } catch (err) {
      const data = err.response?.data

      dispatch({
        type: CONTACT_ERROR,
        payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Failed to update',
      })
    }
  }

  // Delete Contact
  const onDelete = async id => {
    try {
      await axios.delete(`/api/contacts/${id}`)
      dispatch({ type: DELETE_CONTACT, payload: id })
    } catch (err) {
      const data = err.response?.data

      dispatch({
        type: CONTACT_ERROR,
        payload: data?.errors?.[0]?.msg ?? data?.msg ?? 'Failed to delete',
      })
    }
  }

  // Set Current Contact
  const setCurrent = contact => {
    dispatch({ type: SET_CURRENT, payload: contact })
  }

  // Clear Current Contact
  const clearCurrent = () => {
    dispatch({ type: CLEAR_CURRENT })
  }

  // Filter Contacts
  const filterContacts = text => {
    dispatch({ type: FILTER_CONTACTS, payload: text })
  }

  // Clear Filter
  const clearFilter = () => {
    dispatch({ type: CLEAR_FILTER })
  }

  return (
    <ContactContext.Provider
      value={{
        ...state,
        getContacts,
        addContact,
        updateContact,
        onDelete,
        clearContacts,
        setCurrent,
        clearCurrent,
        filterContacts,
        clearFilter,
      }}
    >
      {children}
    </ContactContext.Provider>
  )
}

export default ContactState
