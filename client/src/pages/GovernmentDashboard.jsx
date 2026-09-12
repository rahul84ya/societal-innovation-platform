import React, { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import ProblemLocation from '../components/ProblemLocation';
import { notify } from '../components/ToastProvider';

function GovernmentDashboard() {
  const [pendingProblems, setPendingProblems] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [consortiumReviews, setConsortiumReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState({});

  const fetchPendingProblems = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/problems/pending');
      const data = await response.json();

      if (data.success) {
        setPendingProblems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending problems:', error);
      notify('Failed to load pending reports: ' + error.message, 'error');
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

  const fetchConsortiumReviews = async () => {
    try {
      const response = await apiFetch('/api/problems/consortium-review');
      const data = await response.json();
      setConsortiumReviews(data.success ? data.data || [] : []);
    } catch (error) {
      console.error('Failed to fetch consortium review queue:', error);
    }
  };

  useEffect(() => {
    fetchPendingProblems();
    fetchActiveProjects();
    fetchConsortiumReviews();
  }, []);

  const allotProject = async (problemId, proposalId) => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/problems/allot-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problemId), proposal_id: Number(proposalId) }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Project allotment failed.');
      }

      notify(result.message, 'success');
      await Promise.all([fetchConsortiumReviews(), fetchActiveProjects()]);
    } catch (error) {
      console.error('Project allotment failed:', error);
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifySolution = async (problemId) => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/problems/verify-university-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problemId), action: 'approve' }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Verification failed.');
      }

      notify('Feasibility verified. Next 30% advance will be given and tender raised for industries.', 'success');
      await fetchActiveProjects();
    } catch (error) {
      console.error('Verification failed:', error);
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const allotIndustry = async (problemId, proposalId) => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/problems/allot-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problemId), proposal_id: Number(proposalId) }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Industry allotment failed.');
      }

      notify(result.message, 'success');
      await fetchActiveProjects();
    } catch (error) {
      console.error('Industry allotment failed:', error);
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = (problemId, value) => {
    setBudgetInputs((previous) => ({
      ...previous,
      [problemId]: value,
    }));
  };

  const handleAuditAction = async (problemId, actionType, budgetValue) => {
    try {
      setLoading(true);

      const payload = {
        problem_id: Number(problemId),
        action_type: actionType,
      };

      if (actionType === 'approve') {
        payload.budget = Number(budgetValue || 0);
      }

      const response = await apiFetch('/api/problems/audit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        notify(result.error || 'Audit action failed.', 'error');
        return;
      }

      notify(result.message || 'Audit action complete.', 'success');
      await fetchPendingProblems();
    } catch (error) {
      console.error('Audit action failure:', error);
      notify('Audit action failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Dashboard Header */}
      <div className="bg-saffron rounded-xl shadow-lg p-6 md:p-8 flex items-center gap-4 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-saffron via-white to-india-green"></div>
        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
          <svg className="w-8 h-8 text-saffron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Government Audit Dashboard</h2>
          <p className="text-blue-100 mt-1">Review proposals, audit citizen reports, and manage public funds.</p>
        </div>
      </div>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing data...
        </div>
      )}

      {/* Pending Citizen Reports Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-bold text-gray-800">Pending Citizen Reports</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Report Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Evidence</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Budget Allocation (₹)</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingProblems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No pending citizen reports at the moment.
                  </td>
                </tr>
              ) : (
                pendingProblems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-gray-900 mb-1">{problem.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-3">{problem.description}</div>
                      <ProblemLocation latitude={problem.latitude} longitude={problem.longitude} address={problem.location_address} />
                    </td>
                    <td className="px-6 py-4 align-top">
                      {problem.image_url ? (
                        <a href={problem.image_url} target="_blank" rel="noreferrer" className="block relative group">
                          <img
                            src={problem.image_url}
                            alt={problem.title}
                            className="w-24 h-16 object-cover rounded-md border border-gray-200 shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                          </div>
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No evidence
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          className="focus:ring-india-green focus:border-india-green block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                          placeholder="0.00"
                          value={budgetInputs[problem.id] ?? ''}
                          onChange={(e) => handleBudgetChange(problem.id, e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right space-y-2">
                      <button
                        type="button"
                        onClick={() => handleAuditAction(problem.id, 'approve', budgetInputs[problem.id] ?? 0)}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-india-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAuditAction(problem.id, 'reject', 0)}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Consortium Proposals Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-800">Consortium Proposal Review</h3>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
            {consortiumReviews.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No pending university-industry proposals.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consortiumReviews.map((proposal) => (
                  <article key={proposal.proposal_id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{proposal.title}</h4>
                    <p className="text-sm text-gray-600 mb-4">{proposal.description}</p>
                    <ProblemLocation latitude={proposal.latitude} longitude={proposal.longitude} address={proposal.location_address} />
                    {proposal.image_url && (
                      <a href={proposal.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-india-green hover:underline">
                        View original evidence
                      </a>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="block text-xs font-bold text-gray-500 uppercase">Budget</span>
                        <span className="font-semibold text-india-green">₹{Number(proposal.allocated_budget || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="block text-xs font-bold text-gray-500 uppercase">Timeline</span>
                        <span className="font-semibold text-gray-800">{proposal.estimated_timeline_weeks} weeks</span>
                      </div>
                    </div>
                    
                    <div className="mb-4 text-sm border-t border-gray-100 pt-3">
                      <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Partners</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">Univ ID: {proposal.university_id}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Ind ID: {proposal.industry_id}</span>
                    </div>

                    <div className="mb-5 text-sm bg-gray-50 p-3 rounded">
                      <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Execution Plan</span>
                      <p className="text-gray-700 italic">{proposal.abstract_plan}</p>
                    </div>

                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-india-green hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-india-green transition-colors"
                      disabled={loading}
                      onClick={() => allotProject(proposal.problem_id, proposal.proposal_id)}
                    >
                      Allot Project &amp; Release 40% Advance
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Projects Audit Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-800">Active Project Financial Audits</h3>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
            {activeProjects.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No running projects require milestone review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeProjects.map((project) => {
                  const milestoneComplete = Number(project.current_milestone_stage) >= 1;
                  const disabled = milestoneComplete;

                  return (
                    <article key={project.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">{project.title}</h4>
                      
                      <div className="space-y-3 text-sm mb-5">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <span className="text-gray-500 font-medium">Status</span>
                          <span className="font-semibold text-gray-900 capitalize">{project.problem_status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <span className="text-gray-500 font-medium">Allocated Budget</span>
                          <span className="font-bold text-india-green">₹{Number(project.allocated_budget || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 font-medium">Milestone Stage</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Stage {project.current_milestone_stage}
                          </span>
                        </div>
                      </div>

                      {project.problem_status === 'solution_uploaded' ? (
                        <div className="space-y-3">
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                            <strong>Note:</strong> Lab prototype uploaded by university. Please verify feasibility.
                          </div>
                          <button
                            type="button"
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-colors bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            disabled={loading}
                            onClick={() => verifySolution(project.id)}
                          >
                            Verify Feasibility & Raise Tender (30% Advance)
                          </button>
                        </div>
                      ) : project.problem_status === 'university_assigned' ? (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                          Waiting for the university to upload its solution.
                        </div>
                      ) : project.problem_status === 'tender_raised' && project.proposal_id ? (
                        <button
                          type="button"
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-india-green hover:bg-green-700 transition-colors disabled:opacity-60"
                          disabled={loading}
                          onClick={() => allotIndustry(project.id, project.proposal_id)}
                        >
                          Assign Industry &amp; Release 30% Advance
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-colors ${
                            disabled 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-saffron hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 text-gray-900'
                          }`}
                          disabled={disabled}
                          onClick={() => notify('This project has no Government action available at its current stage.', 'info')}
                        >
                          Review project status
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GovernmentDashboard;
