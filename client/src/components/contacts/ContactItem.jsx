import { MdEmail } from 'react-icons/md'
import { FaPhone } from 'react-icons/fa'

import { useContacts } from '../../../context/contact/contactContext'

const ContactItem = ({ contact, ref }) => {
  const { onDelete, setCurrent, clearCurrent } = useContacts()

  const { id, name, email, phone, type } = contact

  const handleDelete = () => {
    onDelete(id)
    clearCurrent()
  }

  return (
    <div ref={ref} className='card bg-light'>
      <h3 className='text-primary text-left'>
        {name}{' '}
        <span
          style={{ float: 'right' }}
          className={
            'badge ' +
            (type === 'professional' ? 'badge-success' : 'badge-primary')
          }
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
      </h3>
      <ul className='list'>
        {email && (
          <li className='flex-align'>
            <MdEmail /> {email}
          </li>
        )}
        {phone && (
          <li className='flex-align'>
            <FaPhone /> {phone}
          </li>
        )}
      </ul>

      <p>
        <button
          className='btn btn-dark btn-sm'
          onClick={() => setCurrent(contact)}
        >
          Edit
        </button>
        <button className='btn btn-danger btn-sm' onClick={handleDelete}>
          Delete
        </button>
      </p>
    </div>
  )
}

export default ContactItem
