import { useState } from 'react'
import { useContacts } from '../../../context/contact/contactContext'

const emptyContact = {
  name: '',
  email: '',
  phone: '',
  type: 'personal',
}

const ContactForm = () => {
  const { current, addContact, clearCurrent, updateContact } = useContacts()

  const [contact, setContact] = useState(current ?? emptyContact)

  const { name, email, phone, type } = contact

  const onChange = e => {
    setContact(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const clearAll = () => {
    clearCurrent()
    setContact(emptyContact)
  }

  const onSubmit = e => {
    e.preventDefault()

    if (current) {
      updateContact(contact)
    } else {
      addContact(contact)
    }

    clearAll()
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className='text-primary'>
        {current ? 'Edit Contact' : 'New Contact'}
      </h2>
      <input
        type='text'
        placeholder='Name'
        name='name'
        value={name}
        onChange={onChange}
      />
      <input
        type='email'
        placeholder='Email'
        name='email'
        value={email}
        onChange={onChange}
      />
      <input
        type='text'
        placeholder='Phone'
        name='phone'
        value={phone}
        onChange={onChange}
      />
      <h5>Contact Type</h5>
      <input
        type='radio'
        name='type'
        value='personal'
        onChange={onChange}
        checked={type === 'personal'}
      />{' '}
      Personal{' '}
      <input
        type='radio'
        name='type'
        value='professional'
        onChange={onChange}
        checked={type === 'professional'}
      />{' '}
      Professional
      <div>
        <input
          type='submit'
          value={current ? 'Update Contact' : 'Add Contact'}
          className='btn btn-primary btn-block'
        />
      </div>
      {current && (
        <button
          type='button'
          className='btn btn-light btn-block'
          onClick={clearAll}
        >
          Clear
        </button>
      )}
    </form>
  )
}

export default ContactForm
