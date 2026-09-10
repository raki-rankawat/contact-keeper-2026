const express = require('express')
const { check } = require('express-validator')

const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
} = require('../controllers/contactsController')

const router = express.Router()

const regCheck = [check('name', 'Please include name').not().isEmpty()]

router.get('/', auth, getContacts)
router.post('/', [regCheck, validate], auth, addContact)
router.put('/:id', [regCheck, validate], auth, updateContact)
router.delete('/:id', auth, deleteContact)

module.exports = router
