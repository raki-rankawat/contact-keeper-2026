import { useContacts } from '../../../context/contact/contactContext'

const ContactFilter = () => {
  const { filter, filterContacts } = useContacts()

  return (
    <form onSubmit={e => e.preventDefault()}>
      <input
        type='text'
        placeholder='Search'
        value={filter}
        onChange={e => filterContacts(e.target.value)}
      />
    </form>
  )
}

export default ContactFilter
