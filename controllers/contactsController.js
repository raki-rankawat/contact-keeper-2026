// @route    GET api/contacts
// @desc     Get all contacts for user
// @access   Private
exports.getContacts = (req, res) => {
  res.send('Get all contacts for user')
}

// @route    POST api/contacts
// @desc     Add new contact for user
// @access   Private
exports.addContact = (req, res) => {
  res.send('Create new contact')
}

// @route    PUT api/contacts/:id
// @desc     Update contact for user
// @access   Private
exports.updateContact = (req, res) => {
  res.send('Update contact for user')
}

// @route    DELETE api/contacts/:id
// @desc     Delete contact for user
// @access   Private
exports.deleteContact = (req, res) => {
  res.send('Delete contact for user')
}
