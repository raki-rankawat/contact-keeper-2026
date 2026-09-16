import ContactForm from '../components/contacts/ContactForm'
import Contacts from '../components/contacts/Contacts'
import { useContacts } from '../../context/contact/contactContext'
import { useAuth } from '../../context/auth/authContext'
import ContactFilter from '../components/contacts/ContactFilter'
import { useEffect } from 'react'

const Home = () => {
  const { loadUser } = useAuth()
  const { current } = useContacts()

  useEffect(() => {
    loadUser()
  }, [loadUser])

  return (
    <div className='grid-2'>
      <div>
        <ContactForm key={current?.id ?? 'new'} />
      </div>
      <div>
        <ContactFilter />
        <Contacts />
      </div>
    </div>
  )
}

export default Home
