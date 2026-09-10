const required = ['MONGO_URI', 'JWT_SECRET']

const validateEnv = () => {
  const missing = required.filter(name => !process.env[name])

  if (missing.length) {
    console.error(
      `Missing env vars: ${missing.join(', ')} — copy .env.example to .env`,
    )
    process.exit(1)
  }
}

module.exports = validateEnv
