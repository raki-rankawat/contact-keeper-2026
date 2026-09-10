const express = require('express')

const app = express()

const PORT = process.env.PORT || 5000

app.get('/', (req, res) =>
  res.json({ msg: 'Welcome to contact keepter 2026 APIs' }),
)

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
