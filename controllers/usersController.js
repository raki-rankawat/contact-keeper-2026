const bcrypt = require('bcryptjs')
const User = require('../models/User')
const generateToken = require('../utils/generateToken')

// @route    POST api/users
// @desc     Register a user
// @access   Public
const register = async (req, res) => {
  const { name, email, password } = req.body

  const existing = await User.findOne({ email })

  if (existing) {
    return res.status(400).json({ msg: 'User already exists' })
  }

  const salt = await bcrypt.genSalt(10)

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, salt),
  })

  res.json({ token: generateToken(user.id) })
}

module.exports = { register }
