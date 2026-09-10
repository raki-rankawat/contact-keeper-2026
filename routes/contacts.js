const express = require('express')

const router = express.Router()

// @route    GET api/contacts
// @desc     Get all contacts for user
// @access   Private
router.get('/', (req, res) => {
  res.send('Get all contacts for user')
})

// @route    POST api/contacts
// @desc     Add new contact for user
// @access   Private
router.post('/', (req, res) => {
  res.send('Create new contact')
})

// @route    PUT api/contacts/:id
// @desc     Update contact for user
// @access   Private
router.put('/', (req, res) => {
  res.send('Update contact for user')
})

// @route    Delete api/contacts/:id
// @desc     Delete contact for user
// @access   Private
router.delete('/', (req, res) => {
  res.send('Delete contact for user')
})

module.exports = router
