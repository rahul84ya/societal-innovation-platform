import React, { useEffect, useState } from 'react';
import JointProposalForm from '../components/JointProposalForm';
import { apiFetch } from '../auth';
import ProblemLocation from '../components/ProblemLocation';
import { notify } from '../components/ToastProvider';

function IndustryPortal() {
  const [openChallenges, setOpenChallenges] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [finalWorkInputs, setFinalWorkInputs] = useState({});

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

  const fetchActiveProjects = async () => {
    try {
      const response = await apiFetch('/api/problems/active-projects');
      const data = await response.json();
      setActiveProjects(data.success ? data.data || [] : []);
    } catch (error) {
      console.error('Failed to fetch active projects:', error);
    }
  };

  const uploadFinalWork = async (problemId) => {
    try {
      setLoading(true);
      const inputs = finalWorkInputs[problemId] || {};
      const response = await apiFetch('/api/problems/upload-industry-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: Number(problemId),
          notes: inputs.notes || '',
          image_url: inputs.image_url || '',
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Work upload failed.');
      }

      notify('Final work uploaded successfully.', 'success');
      await fetchActiveProjects();
    } catch (error) {
      console.error('Work upload failed:', error);
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenChallenges();
    fetchActiveProjects();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🏭 Enterprise Portal</h2>
      </div>
      
      {loading && (
        <div className="flex justify-center my-8">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">Corporate Project Tracking</h2>
        </div>
        <div className="p-6">
        {activeProjects.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">No allotted projects are currently active.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((project) => (
              <article key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{project.title}</h3>
                <div className="space-y-2 mb-4">
                  <p className="text-sm"><strong className="text-gray-700">Status:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{project.problem_status}</span></p>
                  <p className="text-sm"><strong className="text-gray-700">Milestone stage:</strong> {project.current_milestone_stage}</p>
                </div>
                {Number(project.current_milestone_stage) === 0 && (
                  <span className="inline-block bg-yellow-50 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium border border-yellow-200">Phase 1: Academic Lab Prototyping</span>
                )}
                {project.problem_status === 'industry_assigned' && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-green-50 text-green-800 text-sm p-3 rounded border border-green-200">
                      <strong>30% Advance Released</strong>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Final Solution Work</label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        rows="3"
                        placeholder="Describe the final factory deployed solution..."
                        value={finalWorkInputs[project.id]?.notes || ''}
                        onChange={(e) => setFinalWorkInputs({...finalWorkInputs, [project.id]: {...finalWorkInputs[project.id], notes: e.target.value}})}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Problem Solved Images (URL)</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://..."
                        value={finalWorkInputs[project.id]?.image_url || ''}
                        onChange={(e) => setFinalWorkInputs({...finalWorkInputs, [project.id]: {...finalWorkInputs[project.id], image_url: e.target.value}})}
                      />
                    </div>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      disabled={loading}
                      onClick={() => uploadFinalWork(project.id)}
                    >
                      Upload Final Work
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">Open Enterprise Opportunities</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openChallenges.length === 0 ? (
              <p className="text-gray-500 italic col-span-full text-center py-8">No open enterprise opportunities available right now.</p>
            ) : (
              openChallenges.map((problem) => (
                <div key={problem.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                  {problem.image_url && (
                    <img src={problem.image_url} alt={problem.title} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{problem.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">{problem.description}</p>
                    <ProblemLocation latitude={problem.latitude} longitude={problem.longitude} address={problem.location_address} />
                    <div className="space-y-2 mb-6">
                      <p className="text-sm"><strong className="text-gray-700">Budget:</strong> ₹{Number(problem.allocated_budget || 0).toLocaleString()}</p>
                      <p className="text-sm"><strong className="text-gray-700">Severity:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{problem.severity_score}</span></p>
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

export default IndustryPortal;
