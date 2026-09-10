// The four-argument signature is how Express recognises error middleware —
// `next` is unused but must stay for the arity check.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  res.status(err.status || 500).json({ msg: 'Internal Server Error' })
}

module.exports = errorHandler
