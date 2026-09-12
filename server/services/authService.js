const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const jwtSecret = process.env.JWT_SECRET || 'local-development-secret-change-me';
const governmentLoginEmail = String(
  process.env.GOVERNMENT_LOGIN_EMAIL || 'government.demo@jharkhand.gov.in'
).trim().toLowerCase();

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using a development-only fallback secret.');
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, user_role: user.user_role },
    jwtSecret,
    { expiresIn: '8h' }
  );
}

async function registerUser({ name, email, password, user_role }) {
  const normalizedName = String(name || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = String(user_role || '').trim();

  if (normalizedName.length < 2) throw new Error('Name must be at least 2 characters long.');
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('A valid email address is required.');
  if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters long.');
  if (!['citizen', 'university', 'industry'].includes(normalizedRole)) {
    throw new Error('Government accounts are provisioned by the administrator.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, user_role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, user_role;`,
    [normalizedName, normalizedEmail, passwordHash, normalizedRole]
  );

  const user = result.rows[0];
  return { user, token: createToken(user) };
}

async function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const result = await pool.query(
    'SELECT id, name, email, password_hash, user_role FROM users WHERE email = $1;',
    [normalizedEmail]
  );

  const user = result.rows[0];
  if (
    !user
    || (user.user_role === 'government' && normalizedEmail !== governmentLoginEmail)
    || !(await bcrypt.compare(String(password || ''), user.password_hash))
  ) {
    throw new Error('Invalid email or password.');
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    user_role: user.user_role,
  };

  return { user: safeUser, token: createToken(safeUser) };
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = { registerUser, loginUser, verifyToken };
