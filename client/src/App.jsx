import { useEffect, useState } from 'react';
import CitizenSubmitForm from './pages/CitizenSubmitForm';
import GovernmentDashboard from './pages/GovernmentDashboard';
import UniversityDashboard from './pages/UniversityDashboard';
import IndustryPortal from './pages/IndustryPortal';
import AuthPage from './pages/AuthPage';
import VideoBackground from './components/VideoBackground';
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
    return (
      <>
        <VideoBackground />
        <AuthPage />
      </>
    );
  }

  const role = auth.user.user_role;

  const roleTitles = {
    'citizen': 'Citizen Portal',
    'government': 'Government Dashboard',
    'university': 'Research Market Feed',
    'industry': 'Enterprise Portal'
  };

  return (
    <div className="min-h-screen flex flex-col relative text-gray-800">
      <VideoBackground />
      
      {/* Global Header */}
      <header className="bg-white shadow-md border-b-4 border-saffron relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Emblem Placeholder */}
            <svg className="w-12 h-12 text-navy-blue" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 22h20L12 2zm0 3.8L18.4 19H5.6L12 5.8z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-navy-blue uppercase tracking-wider leading-tight">Societal Innovation Collaboration</h1>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Government of India</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{auth.user.name}</p>
              <p className="text-xs font-medium text-india-green uppercase">{role}</p>
            </div>
            <button 
              onClick={clearAuth}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-navy-blue">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1" role="tablist">
              <div className="px-6 py-3 bg-white text-navy-blue font-bold rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative top-[1px]">
                {roleTitles[role]}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
          {role === 'citizen' && <CitizenSubmitForm />}
          {role === 'government' && <GovernmentDashboard />}
          {role === 'university' && <UniversityDashboard />}
          {role === 'industry' && <IndustryPortal />}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-navy-blue text-white py-6 relative z-10 mt-auto border-t-4 border-india-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-300">
          <p className="mb-2">SIH26043 – Societal Innovation Collaboration | SIH26021 – Honey Chain</p>
          <p>&copy; 2026 Government of India. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
