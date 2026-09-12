const { registerUser, loginUser } = require('../services/authService');

function sendAuthError(res, error) {
  const message = error instanceof Error ? error.message : 'Authentication request failed.';
  const duplicateEmail = message.includes('users_email_key');
  return res.status(duplicateEmail ? 409 : 400).json({
    success: false,
    error: duplicateEmail ? 'An account with this email already exists.' : message,
  });
}

exports.register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    console.error('Registration failed:', error);
    return sendAuthError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }
};

exports.me = async (req, res) => res.status(200).json({ success: true, user: req.user });
