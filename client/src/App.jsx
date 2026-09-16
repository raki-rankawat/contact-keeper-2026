import Navbar from './components/layout/Navbar'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import ContactState from '../context/contact/ContactState'
import AuthState from '../context/auth/AuthState'

import Home from './pages/Home'
import About from './pages/About'

const App = () => {
  return (
    <AuthState>
      <ContactState>
        <Router>
          <Navbar title='Contact Keeper' />
          <div className='container'>
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/about' element={<About />} />
            </Routes>
          </div>
        </Router>
      </ContactState>
    </AuthState>
  )
}

export default App
