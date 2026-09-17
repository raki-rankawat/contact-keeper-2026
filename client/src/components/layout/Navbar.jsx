import { MdOutlinePermContactCalendar } from 'react-icons/md'
import { RiLogoutBoxRFill } from 'react-icons/ri'
import { Link } from 'react-router-dom'

import { useAuth } from '../../../context/auth/authContext'
import { useContacts } from '../../../context/contact/contactContext'

const Navbar = ({ title }) => {
  const { isAuthenticated, logout, user } = useAuth()
  const { clearContacts } = useContacts

  const handleLogout = () => {
    logout()
    clearContacts()
  }

  const authLinks = (
    <>
      <li>
        <Link to='/'>Home</Link>
      </li>
      <li>
        <Link to='/about'>About</Link>
      </li>
      <li>Hi, {user && user.name.split(' ')[0]}</li>
      <li>
        <a href='#' className='flex-align' onClick={handleLogout}>
          <RiLogoutBoxRFill /> <span className='hide-sm'>Logout</span>
        </a>
      </li>
    </>
  )

  const guestLinks = (
    <>
      <li>
        <Link to='/register'>Register</Link>
      </li>
      <li>
        <Link to='/login'>Login</Link>
      </li>
    </>
  )

  return (
    <div className='navbar bg-primary'>
      <div className='flex-align'>
        <MdOutlinePermContactCalendar /> <span>{title}</span>
      </div>

      <ul className='flex-align'>{isAuthenticated ? authLinks : guestLinks}</ul>
    </div>
  )
}

export default Navbar
