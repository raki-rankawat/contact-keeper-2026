const bcrypt = require('bcryptjs')
const generateToken = require('../utils/generateToken')
const User = require('../models/User')

// @route    GET api/auth
// @desc     Get logged in user
// @access   Private
const getLoggedInUser = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password')

  res.json(user)
}

// @route    POST api/auth
// @desc     Auth user & get token
// @access   Public
const login = async (req, res) => {
  const { email, password } = req.body

  let user = await User.findOne({ email })

  if (!user) {
    return res.status(400).json({ msg: 'Invalid credentials' })
  }

  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    return res.status(400).json({ msg: 'Invalid credentials' })
  }

  res.json({ token: generateToken(user.id) })
}

module.exports = { getLoggedInUser, login }
