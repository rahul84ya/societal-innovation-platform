import { useEffect, useState } from 'react';
import CitizenSubmitForm from './pages/CitizenSubmitForm';
import GovernmentDashboard from './pages/GovernmentDashboard';
import UniversityDashboard from './pages/UniversityDashboard';
import IndustryPortal from './pages/IndustryPortal';
import AuthPage from './pages/AuthPage';
import VideoBackground from './components/VideoBackground';
import ToastProvider from './components/ToastProvider';
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
      <ToastProvider>
        <VideoBackground />
        <AuthPage />
      </ToastProvider>
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
    <ToastProvider>
    <div className="min-h-screen flex flex-col relative text-gray-800">
      <VideoBackground />
      
      {/* Global Header */}
      <header className="bg-white shadow-md border-b-4 border-saffron relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/jharkhand_logo.png" alt="Jharkhand Logo" className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 object-contain rounded-full shadow-sm bg-white p-1" />
            <div>
              <p className="text-sm sm:text-xl font-bold text-india-green uppercase tracking-wider leading-tight">Government of Jharkhand</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 ml-auto">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{auth.user.name}</p>
              <p className="text-xs font-medium text-india-green uppercase">{role}</p>
            </div>
            <button
              onClick={clearAuth}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              <span className="hidden sm:inline">Sign out</span><span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-saffron">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1" role="tablist">
              <div className="px-6 py-3 bg-white text-saffron font-bold rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative top-[1px]">
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
      <footer className="bg-india-green text-white py-6 relative z-10 mt-auto border-t-4 border-saffron">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-white">
          <p className="mb-2 font-semibold">Empowering Jharkhand through Innovation</p>
          <p>&copy; 2026 Government of Jharkhand. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </ToastProvider>
  );
}

export default App;
