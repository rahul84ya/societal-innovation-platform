import React, { useState } from 'react';
import { API_BASE_URL, saveAuth } from '../auth';

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
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center bg-white/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-white/20">
        
        {/* Left Info Panel */}
        <div className="p-8 md:p-12 h-full flex flex-col justify-center bg-gradient-to-br from-navy-blue to-blue-900 text-white relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-saffron via-white to-india-green"></div>
          <svg className="w-16 h-16 mb-6 text-white opacity-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 3.8L18.4 19H5.6L12 5.8z" />
          </svg>
          <h1 className="text-3xl font-bold mb-2">Societal Innovation Collaboration</h1>
          <h2 className="text-sm font-semibold text-saffron uppercase tracking-widest mb-6">Government of India</h2>
          
          <div className="space-y-6 text-sm text-blue-100">
            <div className="bg-white/10 p-4 rounded-lg border border-white/10">
              <h3 className="font-bold text-white text-base mb-1">SIH26043</h3>
              <p>Societal Innovation Collaboration addresses the gap between real-world societal problems and the people capable of developing practical solutions.</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg border border-white/10">
              <h3 className="font-bold text-white text-base mb-1">SIH26021</h3>
              <p>Honey Chain tackles issues faced by beekeepers and consumers, such as poor hive monitoring, lack of traceability, and difficulty ensuring honey quality and authenticity.</p>
            </div>
          </div>
        </div>

        {/* Right Auth Form */}
        <div className="p-8 md:p-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Sign in to Portal' : 'Create an Account'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {mode === 'login' 
                ? 'Use your stakeholder credentials to securely access your workspace.' 
                : 'Select your stakeholder role and register to participate in the program.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-name">Full Name</label>
                <input 
                  id="auth-name" 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-blue focus:border-navy-blue outline-none transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-email">Email Address</label>
              <input 
                id="auth-email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-blue focus:border-navy-blue outline-none transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-password">Password</label>
              <input 
                id="auth-password" 
                type="password" 
                minLength="8" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-blue focus:border-navy-blue outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="auth-role">Stakeholder Role</label>
                <select 
                  id="auth-role" 
                  value={userRole} 
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-blue focus:border-navy-blue outline-none transition-colors bg-white"
                >
                  <option value="citizen">Citizen</option>
                  <option value="government">Government</option>
                  <option value="university">University</option>
                  <option value="industry">Industry</option>
                </select>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-india-green hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign in' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm font-medium text-navy-blue hover:text-blue-800 hover:underline"
            >
              {mode === 'login' ? "Don't have an account? Register now" : "Already registered? Sign in instead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
