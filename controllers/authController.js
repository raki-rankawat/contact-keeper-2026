// @route    GET api/auth
// @desc     Get logged in user
// @access   Private
exports.getLoggedInUser = (req, res) => {
  res.send('Get logged in user')
}

// @route    POST api/auth
// @desc     Auth user & get token
// @access   Public
exports.login = (req, res) => {
  res.send('Log in user')
}
