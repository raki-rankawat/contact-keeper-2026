import { TransitionGroup } from 'react-transition-group'

import { useContacts } from '../../../context/contact/contactContext'
import AnimatedContact from './AnimatedContact'
import { useEffect } from 'react'
import Spinner from '../../components/layout/Spinner'

const Contacts = () => {
  const { contacts, filter, getContacts, loading } = useContacts()

  useEffect(() => {
    if (!loading) {
      getContacts()
    }
  }, [])

  if (contacts === null) {
    return <h4>Please add a conact</h4>
  }

  const visible = filter
    ? contacts?.filter(
        contact =>
          contact.name.toLowerCase().includes(filter) ||
          contact.email.toLowerCase().includes(filter),
      )
    : contacts

  if (loading) {
    return <Spinner />
  }

  return (
    <TransitionGroup>
      {visible?.map(contact => (
        <AnimatedContact key={contact.id} contact={contact} />
      ))}
    </TransitionGroup>
  )
}

export default Contacts
