import ContactForm from '../components/contacts/ContactForm'
import Contacts from '../components/contacts/Contacts'
import { useContacts } from '../../context/contact/contactContext'

const Home = () => {
  const { current } = useContacts()

  return (
    <div className='grid-2'>
      <div>
        <ContactForm key={current?.id ?? 'new'} />
      </div>
      <div>
        <Contacts />
      </div>
    </div>
  )
}

export default Home
