import React, { useEffect, useState } from 'react';
import { apiFetch } from '../auth';
import '../styles/FormStyle.css';

function GovernmentDashboard() {
  const [pendingProblems, setPendingProblems] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
  const [consortiumReviews, setConsortiumReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState({});
  const [approvedMilestones, setApprovedMilestones] = useState({});

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
      alert('Failed to load pending reports: ' + error.message);
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

      alert(result.message);
      await Promise.all([fetchConsortiumReviews(), fetchActiveProjects()]);
    } catch (error) {
      console.error('Project allotment failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveMilestone = async (problemId) => {
    try {
      setApprovedMilestones((previous) => ({ ...previous, [problemId]: true }));
      const response = await apiFetch('/api/problems/approve-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problemId), tranche_number: 2 }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Milestone payout failed.');
      }

      alert(result.message);
      await fetchActiveProjects();
    } catch (error) {
      console.error('Milestone payout failed:', error);
      setApprovedMilestones((previous) => ({ ...previous, [problemId]: false }));
      alert(error.message);
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
        alert(result.error || 'Audit action failed.');
        return;
      }

      alert(result.message || 'Audit action complete.');
      await fetchPendingProblems();
    } catch (error) {
      console.error('Audit action failure:', error);
      alert('Audit action failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-layout" style={{ maxWidth: 1100 }}>
      <h2>🏛️ Government Audit Dashboard</h2>

      {loading && <p>Loading pending issue queue...</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Description</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Image</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Budget</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingProblems.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', color: '#666' }}>
                  No pending citizen reports at the moment.
                </td>
              </tr>
            ) : (
              pendingProblems.map((problem) => (
                <tr key={problem.id}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <strong>{problem.title}</strong>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    {problem.description}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    {problem.image_url ? (
                      <img
                        src={problem.image_url}
                        alt={problem.title}
                        style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ) : (
                      <span style={{ color: '#666' }}>No image</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <input
                      type="number"
                      min="0"
                      value={budgetInputs[problem.id] ?? ''}
                      onChange={(e) => handleBudgetChange(problem.id, e.target.value)}
                      placeholder="Budget"
                      style={{ width: '110px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleAuditAction(problem.id, 'reject', 0)}
                        style={{ background: '#d93025', width: '100%' }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleAuditAction(problem.id, 'approve', budgetInputs[problem.id] ?? 0)}
                        style={{ background: '#1e9b4d', width: '100%' }}
                      >
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section style={{ marginTop: '32px' }}>
        <h2>Consortium Proposal Review</h2>
        {consortiumReviews.length === 0 ? (
          <p>No pending university-industry proposals require review.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {consortiumReviews.map((proposal) => (
              <article key={proposal.proposal_id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                <h3>{proposal.title}</h3>
                <p>{proposal.description}</p>
                <p><strong>Budget:</strong> ₹{Number(proposal.allocated_budget || 0).toLocaleString()}</p>
                <p><strong>University ID:</strong> {proposal.university_id} | <strong>Industry ID:</strong> {proposal.industry_id}</p>
                <p><strong>Plan:</strong> {proposal.abstract_plan}</p>
                <p><strong>Timeline:</strong> {proposal.estimated_timeline_weeks} weeks</p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => allotProject(proposal.problem_id, proposal.proposal_id)}
                  style={{ maxWidth: '320px' }}
                >
                  Allot Project &amp; Release 40% Advance
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '32px' }}>
        <h2>Active Project Financial Audits</h2>
        {activeProjects.length === 0 ? (
          <p>No running projects require milestone review.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {activeProjects.map((project) => {
              const milestoneComplete = Number(project.current_milestone_stage) >= 1;
              const disabled = milestoneComplete || approvedMilestones[project.id];

              return (
                <article key={project.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
                  <h3>{project.title}</h3>
                  <p><strong>Status:</strong> {project.problem_status}</p>
                  <p><strong>Allocated budget:</strong> ₹{Number(project.allocated_budget || 0).toLocaleString()}</p>
                  <p><strong>Current milestone stage:</strong> {project.current_milestone_stage}</p>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={disabled}
                    onClick={() => approveMilestone(project.id)}
                    style={{ maxWidth: '360px' }}
                  >
                    {milestoneComplete ? 'Milestone 1 Already Paid' : 'Verify & Payout Milestone 1 (30%)'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default GovernmentDashboard;
