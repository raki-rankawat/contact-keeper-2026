import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAlert } from '../../../context/alert/alertContext'
import { useAuth } from '../../../context/auth/authContext'

const emptyUser = {
  email: '',
  password: '',
}

const Login = () => {
  const { isAuthenticated, error, clearErrors, login } = useAuth()
  const { setAlert } = useAlert()
  const navigate = useNavigate()

  const [user, setUser] = useState(emptyUser)

  const { email, password } = user

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (error !== null) {
      setAlert(error, 'danger')
      clearErrors()
    }
  }, [error, clearErrors, setAlert])

  const onChange = e => {
    setUser(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const onSubmit = e => {
    e.preventDefault()

    if (email === '' || password === '') {
      setAlert('Please fill in all fields', 'danger')
    } else {
      login(user)
      setUser(emptyUser)
    }
  }

  return (
    <div className='form-container'>
      <h1>
        Account <span className='text-primary'>Login</span>
      </h1>

      <form onSubmit={onSubmit}>
        <div className='form-group'>
          <label htmlFor='email'>Email</label>
          <input type='text' name='email' value={email} onChange={onChange} />
        </div>
        <div className='form-group'>
          <label htmlFor='password'>Password</label>
          <input
            type='password'
            name='password'
            value={password}
            onChange={onChange}
          />
        </div>
        <input
          type='submit'
          value='Login'
          className='btn btn-primary btn-block'
        />
      </form>
    </div>
  )
}

export default Login
