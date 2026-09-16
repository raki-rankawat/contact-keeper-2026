import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlert } from '../../../context/alert/alertContext'
import { useAuth } from '../../../context/auth/authContext'

const emptyUser = {
  name: '',
  email: '',
  password: '',
  password2: '',
}

const Register = () => {
  const { setAlert } = useAlert()
  const { register, error, clearErrors, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [user, setUser] = useState(emptyUser)

  const { name, email, password, password2 } = user

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

    if (name === '' || email === '' || password === '') {
      setAlert('Please enter all fields', 'danger')
    } else if (password !== password2) {
      setAlert('Password do not match', 'danger')
    } else {
      register({ name, email, password })
      setUser(emptyUser)
    }
  }

  return (
    <div className='form-container'>
      <h1>
        Account <span className='text-primary'>Register</span>
      </h1>

      <form onSubmit={onSubmit}>
        <div className='form-group'>
          <label htmlFor='name'>Name</label>
          <input type='text' name='name' value={name} onChange={onChange} />
        </div>
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
        <div className='form-group'>
          <label htmlFor='password2'>Confirm Password</label>
          <input
            type='password'
            name='password2'
            value={password2}
            onChange={onChange}
          />
        </div>
        <input
          type='submit'
          value='Register'
          className='btn btn-primary btn-block'
        />
      </form>
    </div>
  )
}

export default Register
