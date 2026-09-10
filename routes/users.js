const express = require('express')
const { check } = require('express-validator')
const validate = require('../middleware/validate')
const { register } = require('../controllers/usersController')

const router = express.Router()

const regCheck = [
  check('name', 'Please enter a name').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more chars').isLength({
    min: 6,
  }),
]

// path, [handler, handler], controller
router.post('/', [regCheck, validate], register)

module.exports = router
