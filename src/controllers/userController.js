const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Register User
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registerUser };
