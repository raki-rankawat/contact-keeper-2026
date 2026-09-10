const { validationResult } = require('express-validator')

// Runs after a route's check() chain and turns any collected errors into a 400,
// so controllers only ever see a valid request body.
const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  next()
}

module.exports = validate
