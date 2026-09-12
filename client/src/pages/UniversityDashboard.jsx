import React, { useEffect, useState } from 'react';
import JointProposalForm from '../components/JointProposalForm';
import { apiFetch } from '../auth';

function UniversityDashboard() {
  const [openChallenges, setOpenChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);

  const fetchOpenChallenges = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/problems/open-challenges');
      const data = await response.json();
      setOpenChallenges(data.success ? data.data || [] : []);
    } catch (error) {
      console.error('Failed to fetch open challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenChallenges();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🎓 Research Market Feed</h2>
      </div>

      {loading && (
        <div className="flex justify-center my-8">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">Open Research Challenges</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openChallenges.length === 0 ? (
              <p className="text-gray-500 italic col-span-full text-center py-8">No open research challenges available.</p>
            ) : (
              openChallenges.map((problem) => (
                <div key={problem.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                  {problem.image_url && (
                    <img src={problem.image_url} alt={problem.title} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{problem.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">{problem.description}</p>
                    <div className="space-y-2 mb-6">
                      <p className="text-sm"><strong className="text-gray-700">Category:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{problem.category}</span></p>
                      <p className="text-sm"><strong className="text-gray-700">Budget:</strong> ₹{Number(problem.allocated_budget || 0).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 mt-auto"
                      onClick={() => setSelectedProblem(problem.id)}
                    >
                      Partner & Apply as Consortium
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {selectedProblem && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <JointProposalForm
            problemId={selectedProblem}
            onSubmitSuccess={() => {
              setSelectedProblem(null);
              fetchOpenChallenges();
            }}
            onCancel={() => setSelectedProblem(null)}
          />
        </div>
      )}
    </div>
  );
}

export default UniversityDashboard;
