import { useEffect, useState } from 'react';
import CitizenSubmitForm from './pages/CitizenSubmitForm';
import GovernmentDashboard from './pages/GovernmentDashboard';
import UniversityDashboard from './pages/UniversityDashboard';
import IndustryPortal from './pages/IndustryPortal';
import AuthPage from './pages/AuthPage';
import { clearAuth, getAuth } from './auth';

function App() {
  const [auth, setAuth] = useState(getAuth());
  const [activeView, setActiveView] = useState(auth?.user?.user_role || 'citizen');

  useEffect(() => {
    const handleAuthChange = () => {
      const nextAuth = getAuth();
      setAuth(nextAuth);
      setActiveView(nextAuth?.user?.user_role || 'citizen');
    };

    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  if (!auth?.user) {
    return <AuthPage />;
  }

  const role = auth.user.user_role;

  return (
    <div className="app-shell">
      <div className="user-bar">
        <span>{auth.user.name} · {role}</span>
        <button type="button" className="tab-button" onClick={clearAuth}>Sign out</button>
      </div>
      <div className="view-tabs" role="tablist" aria-label="Application views">
        {role === 'citizen' && <button type="button" className="tab-button active">Citizen Portal</button>}
        {role === 'government' && <button type="button" className="tab-button active">Government Dashboard</button>}
        {role === 'university' && <button type="button" className="tab-button active">Research Market Feed</button>}
        {role === 'industry' && <button type="button" className="tab-button active">Enterprise Portal</button>}
      </div>

      {role === 'citizen' && <CitizenSubmitForm />}
      {role === 'government' && <GovernmentDashboard />}
      {role === 'university' && <UniversityDashboard />}
      {role === 'industry' && <IndustryPortal />}
    </div>
  );
}

export default App;
