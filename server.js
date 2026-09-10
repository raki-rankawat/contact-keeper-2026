const express = require('express')
const connectDB = require('./config/db')
const validateEnv = require('./config/env')
const errorHandler = require('./middleware/errorHandler')
require('dotenv').config()

validateEnv()

const app = express()
const PORT = process.env.PORT || 5000

// Connect Database
connectDB()

// Init middleware | Body parser
app.use(express.json({ extended: false }))

app.get('/', (req, res) =>
  res.json({ msg: 'Welcome to contact keepter 2026 APIs' }),
)

// Define Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/contacts', require('./routes/contacts'))

// Error handler — must be last, after every route
app.use(errorHandler)

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
