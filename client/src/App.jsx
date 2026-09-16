import Navbar from './components/layout/Navbar'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import ContactState from '../context/contact/ContactState'
import AuthState from '../context/auth/AuthState'
import AlertState from '../context/alert/AlertState'

import Home from './pages/Home'
import About from './pages/About'
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import Alerts from './components/Alerts'

import setAuthToken from '../utils/setAuthToken'

if (localStorage.token) {
  setAuthToken(localStorage.token)
}

const App = () => {
  return (
    <AuthState>
      <ContactState>
        <AlertState>
          <Router>
            <Navbar title='Contact Keeper' />
            <div className='container'>
              <Alerts />
              <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/about' element={<About />} />
                <Route path='/register' element={<Register />} />
                <Route path='/login' element={<Login />} />
              </Routes>
            </div>
          </Router>
        </AlertState>
      </ContactState>
    </AuthState>
  )
}

export default App
