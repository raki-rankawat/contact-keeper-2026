import { TransitionGroup } from 'react-transition-group'

import { useContacts } from '../../../context/contact/contactContext'
import AnimatedContact from './AnimatedContact'

const Contacts = () => {
  const { contacts, filter } = useContacts()

  if (contacts.length === 0) {
    return <h4>Please add a conact</h4>
  }

  const visible = filter
    ? contacts.filter(
        contact =>
          contact.name.toLowerCase().includes(filter) ||
          contact.email.toLowerCase().includes(filter),
      )
    : contacts

  return (
    <TransitionGroup>
      {visible.map(contact => (
        <AnimatedContact key={contact.id} contact={contact} />
      ))}
    </TransitionGroup>
  )
}

export default Contacts
