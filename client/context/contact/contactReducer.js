import {
  ADD_CONTACT,
  DELETE_CONTACT,
  SET_CURRENT,
  CLEAR_CURRENT,
  FILTER_CONTACTS,
  CLEAR_FILTER,
  UPDATE_CONTACT,
  CONTACT_ERROR,
  GET_CONTACTS,
  CLEAR_CONTACTS,
} from '../types'

const contactReducer = (state, action) => {
  switch (action.type) {
    case GET_CONTACTS:
      return {
        ...state,
        contacts: action.payload,
        loading: false,
      }

    case ADD_CONTACT:
      return {
        ...state,
        contacts: [...state.contacts, action.payload],
        loading: false,
      }

    case UPDATE_CONTACT:
      return {
        ...state,
        contacts: state.contacts.map(contact =>
          contact.id === action.payload.id ? action.payload : contact,
        ),
        loading: false,
      }

    case DELETE_CONTACT:
      return {
        ...state,
        contacts: state.contacts.filter(
          contact => contact.id !== action.payload,
        ),
        loading: false,
      }

    case CLEAR_CONTACTS:
      return {
        ...state,
        contacts: null,
        filter: null,
        error: null,
        current: null,
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

    case CONTACT_ERROR:
      return {
        ...state,
        error: action.payload,
      }

    default:
      return state
  }
}

export default contactReducer
