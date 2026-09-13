import React, { useEffect, useState } from 'react';
import JointProposalForm from '../components/JointProposalForm';
import { apiFetch } from '../auth';
import ProblemLocation from '../components/ProblemLocation';
import { notify } from '../components/ToastProvider';

function UniversityDashboard() {
  const [openChallenges, setOpenChallenges] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [solutionNotes, setSolutionNotes] = useState({});

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

  const [solutionFiles, setSolutionFiles] = useState({});

  const uploadSolution = async (problemId) => {
    const notes = solutionNotes[problemId] || '';
    const pdfFile = solutionFiles[problemId];

    if (!pdfFile) {
      notify('Please select a solution file before uploading.', 'error');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Upload the PDF
      const formData = new FormData();
      formData.append('solution_pdf', pdfFile);
      const uploadRes = await apiFetch('/api/problems/upload-university-solution-pdf', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'PDF upload failed.');
      }

      const pdfUrl = uploadData.url;

      // Step 2: Submit the solution with the PDF URL
      const response = await apiFetch('/api/problems/upload-university-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problemId), notes, pdf_url: pdfUrl }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Solution upload failed.');
      }

      notify(result.message, 'success');
      setSolutionNotes(prev => ({ ...prev, [problemId]: '' }));
      setSolutionFiles(prev => ({ ...prev, [problemId]: null }));
      await fetchActiveProjects();
    } catch (error) {
      console.error('Upload failed:', error);
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
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🎓 Research Market Feed</h2>
      </div>

      {loading && (
        <div className="flex justify-center my-8">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">Assigned Projects</h2>
        </div>
        <div className="p-6">
        {activeProjects.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">No assigned projects are currently active.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((project) => (
              <article key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{project.title}</h3>
                <div className="space-y-2 mb-4 flex-grow">
                  <p className="text-sm"><strong className="text-gray-700">Status:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{project.problem_status}</span></p>
                  <p className="text-sm"><strong className="text-gray-700">Milestone stage:</strong> {project.current_milestone_stage}</p>
                </div>
                {project.problem_status === 'university_assigned' ? (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800 font-medium text-center">
                        🎉 Congratulations, you've been assigned this project! 40% advance released.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Solution file <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-300 rounded-md p-1.5 cursor-pointer"
                        onChange={(e) => setSolutionFiles(prev => ({ ...prev, [project.id]: e.target.files[0] || null }))}
                      />
                      {solutionFiles[project.id] && (
                        <p className="mt-1 text-xs text-green-700 flex items-center gap-1">
                          📄 {solutionFiles[project.id].name}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">PDF, document, presentation, text, or image. Max 20 MB.</p>
                    </div>
                    <textarea
                      placeholder="Additional notes (optional)"
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={solutionNotes[project.id] || ''}
                      onChange={(e) => setSolutionNotes(prev => ({ ...prev, [project.id]: e.target.value }))}
                      rows={2}
                    ></textarea>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => uploadSolution(project.id)}
                      disabled={!solutionFiles[project.id] || loading}
                    >
                      Upload Solution
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-2 bg-gray-50 rounded text-center text-sm text-gray-600">
                    Awaiting Government Verification / Next Steps
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
                    <ProblemLocation latitude={problem.latitude} longitude={problem.longitude} address={problem.location_address} />
                    <div className="space-y-2 mb-6">
                      <p className="text-sm"><strong className="text-gray-700">Category:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{problem.category}</span></p>
                      <p className="text-sm"><strong className="text-gray-700">Budget:</strong> ₹{Number(problem.allocated_budget || 0).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 mt-auto"
                      onClick={() => setSelectedProblem(problem.id)}
                    >
                      Submit Research Proposal
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
