import { useContacts } from '../../../context/contact/contactContext'

import ContactItem from './ContactItem'

const Contacts = () => {
  const { contacts } = useContacts()

  return (
    <>
      {contacts.map(contact => (
        <ContactItem key={contact.id} contact={contact} />
      ))}
    </>
  )
}

export default Contacts
