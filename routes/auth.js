const express = require('express')
const { getLoggedInUser, login } = require('../controllers/authController')
const validate = require('../middleware/validate')
const auth = require('../middleware/auth')
const { check } = require('express-validator')

const router = express.Router()

const regCheck = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please include your password').exists(),
]

router.get('/', auth, getLoggedInUser)
router.post('/', [regCheck, validate], login)

module.exports = router
