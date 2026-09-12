import React, { useState } from 'react';
import { API_BASE_URL, saveAuth } from '../auth';
import '../styles/FormStyle.css';

function AuthPage() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, user_role: userRole }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Authentication failed.');
      }

      saveAuth({ token: result.token, user: result.user });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="card-layout auth-card">
      <h1>{mode === 'login' ? 'Sign in to CivicTrack' : 'Create your CivicTrack account'}</h1>
      <p>{mode === 'login' ? 'Use your stakeholder account to access your workspace.' : 'Choose the role that matches your participation in the program.'}</p>
      {error && <p style={{ color: '#d93025' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="auth-name">Full name</label>
            <input id="auth-name" type="text" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="auth-role">Stakeholder role</label>
            <select id="auth-role" value={userRole} onChange={(event) => setUserRole(event.target.value)}>
              <option value="citizen">Citizen</option>
              <option value="government">Government</option>
              <option value="university">University</option>
              <option value="industry">Industry</option>
            </select>
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button
        type="button"
        className="tab-button"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
        }}
        style={{ marginTop: '16px', width: '100%' }}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
      </button>
    </main>
  );
}

export default AuthPage;
