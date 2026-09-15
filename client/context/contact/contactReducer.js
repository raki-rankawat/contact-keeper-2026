import {
  ADD_CONTACT,
  DELETE_CONTACT,
  SET_CURRENT,
  CLEAR_CURRENT,
  FILTER_CONTACTS,
  CLEAR_FILTER,
  UPDATE_CONTACT,
} from '../types'

const contactReducer = (state, action) => {
  switch (action.type) {
    case ADD_CONTACT:
      return { ...state, contacts: [...state.contacts, action.payload] }

    case DELETE_CONTACT:
      return {
        ...state,
        contacts: state.contacts.filter(
          contact => contact.id !== action.payload,
        ),
      }

    case SET_CURRENT:
      return {
        ...state,
        current: action.payload,
      }

    case CLEAR_CURRENT:
      return {
        ...state,
        current: null,
      }

    case UPDATE_CONTACT:
      return {
        ...state,
        contacts: state.contacts.map(contact =>
          contact.id === action.payload.id ? action.payload : contact,
        ),
      }

    // Store only the query; the visible list is derived in <Contacts> so it
    // never goes stale when contacts are added, updated, or deleted.
    case FILTER_CONTACTS:
      return {
        ...state,
        filter: action.payload.trim().toLowerCase(),
      }

    case CLEAR_FILTER:
      return {
        ...state,
        filter: '',
      }

    default:
      return state
  }
}

export default contactReducer
