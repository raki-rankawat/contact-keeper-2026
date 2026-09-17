import ContactForm from '../components/contacts/ContactForm'
import Contacts from '../components/contacts/Contacts'
import { useContacts } from '../../context/contact/contactContext'
import { useAuth } from '../../context/auth/authContext'
import ContactFilter from '../components/contacts/ContactFilter'
import { useEffect } from 'react'

const Home = () => {
  const { loadUser, token } = useAuth()
  const { current } = useContacts()

  useEffect(() => {
    if (token !== null) {
      loadUser()
    }
  }, [loadUser, token])

  return (
    <div className='grid-2'>
      <div>
        <ContactForm key={current?._id ?? 'new'} />
      </div>
      <div>
        <ContactFilter />
        <Contacts />
      </div>
    </div>
  )
}

export default Home
