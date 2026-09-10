const express = require('express')
const contactsController = require('../controllers/contactsController')

const router = express.Router()

router.get('/', contactsController.getContacts)
router.post('/', contactsController.addContact)
router.put('/:id', contactsController.updateContact)
router.delete('/:id', contactsController.deleteContact)

module.exports = router
