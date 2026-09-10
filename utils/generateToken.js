const jwt = require('jsonwebtoken')

// Sync form — no callback, so a signing failure rejects the controller's promise
// and reaches the error handler instead of throwing on a later tick.
const generateToken = userId =>
  jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, {
    expiresIn: 3600,
  })

module.exports = generateToken
