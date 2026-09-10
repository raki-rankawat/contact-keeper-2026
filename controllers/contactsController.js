const Contact = require('../models/Contact')

// @route    GET api/contacts
// @desc     Get all contacts for user
// @access   Private
const getContacts = async (req, res) => {
  const contacts = await Contact.find({ user: req.user.id }).sort({ date: -1 })

  res.json(contacts)
}

// @route    POST api/contacts
// @desc     Add new contact for user
// @access   Private
const addContact = async (req, res) => {
  const newContact = new Contact({
    ...req.body,
    user: req.user.id,
  })

  const contact = await newContact.save()

  res.json(contact)
}

// @route    PUT api/contacts/:id
// @desc     Update contact for user
// @access   Private
const updateContact = async (req, res) => {
  const { name, email, phone, type } = req.body

  const contactFields = {}

  if (name) contactFields.name = name
  if (email) contactFields.email = email
  if (phone) contactFields.phone = phone
  if (type) contactFields.type = type

  let contact = await Contact.findById(req.params.id)

  if (!contact) {
    return res.status(404).json({ msg: 'No contact found' })
  }

  if (contact.user.toString() !== req.user.id) {
    return res.status(401).json({ msg: 'Not autherized' })
  }

  contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { $set: contactFields },
    { new: true },
  )

  res.json(contact)
}

// @route    DELETE api/contacts/:id
// @desc     Delete contact for user
// @access   Private
const deleteContact = async (req, res) => {
  const contact = await Contact.findById(req.params.id)

  if (!contact) {
    return res.status(404).json({ msg: 'No contact found' })
  }

  if (contact.user.toString() !== req.user.id) {
    return res.status(401).json({ msg: 'Not autherized' })
  }

  await Contact.findByIdAndDelete(req.params.id)

  res.json({ msg: 'Contact removed' })
}

module.exports = { getContacts, addContact, updateContact, deleteContact }
