import Navbar from './components/layout/Navbar'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PrivateRoute from './routes/PrivateRoute'

import ContactState from '../context/contact/ContactState'
import AuthState from '../context/auth/AuthState'
import AlertState from '../context/alert/AlertState'

import Home from './pages/Home'
import About from './pages/About'
import NotFound from './pages/NotFound'
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
                <Route element={<PrivateRoute />}>
                  <Route path='/' element={<Home />} />
                </Route>
                <Route path='/about' element={<About />} />
                <Route path='/register' element={<Register />} />
                <Route path='/login' element={<Login />} />
                <Route path='*' element={<NotFound />} />
              </Routes>
            </div>
          </Router>
        </AlertState>
      </ContactState>
    </AuthState>
  )
}

export default App
