import { MdOutlinePermContactCalendar } from 'react-icons/md'
import { Link } from 'react-router-dom'

const Navbar = ({ title }) => {
  return (
    <div className='navbar bg-primary'>
      <div className='flex-align'>
        <MdOutlinePermContactCalendar /> <span>{title}</span>
      </div>

      <ul>
        <li>
          <Link to='/'>Home</Link>
        </li>
        <li>
          <Link to='/about'>About</Link>
        </li>
        <li>
          <Link to='/register'>Register</Link>
        </li>
        <li>
          <Link to='/login'>Login</Link>
        </li>
      </ul>
    </div>
  )
}

export default Navbar
