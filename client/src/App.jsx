import Navbar from './components/layout/Navbar'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import ContactState from '../context/contact/ContactState'

import Home from './pages/Home'
import About from './pages/About'

const App = () => {
  return (
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
  )
}

export default App
