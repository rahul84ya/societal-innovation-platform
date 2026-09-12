import React, { useEffect, useState } from 'react';
import JointProposalForm from '../components/JointProposalForm';
import { apiFetch } from '../auth';

function IndustryPortal() {
  const [openChallenges, setOpenChallenges] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);
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

  const fetchActiveProjects = async () => {
    try {
      const response = await apiFetch('/api/problems/active-projects');
      const data = await response.json();
      setActiveProjects(data.success ? data.data || [] : []);
    } catch (error) {
      console.error('Failed to fetch active projects:', error);
    }
  };

  const triggerFactoryHandover = async (problemId) => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/problems/factory-handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problemId) }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Factory handover failed.');
      }

      alert(result.message);
      await fetchActiveProjects();
    } catch (error) {
      console.error('Factory handover failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenChallenges();
    fetchActiveProjects();
  }, []);

  return (
    <div className="card-layout" style={{ maxWidth: 1100 }}>
      <h2>🏭 Enterprise Portal</h2>
      {loading && <p>Loading live enterprise opportunities...</p>}

      <section style={{ marginBottom: '32px' }}>
        <h2>Corporate Project Tracking</h2>
        {activeProjects.length === 0 ? (
          <p>No allotted projects are currently active.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {activeProjects.map((project) => (
              <article key={project.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                <h3>{project.title}</h3>
                <p><strong>Status:</strong> {project.problem_status}</p>
                <p><strong>Milestone stage:</strong> {project.current_milestone_stage}</p>
                {Number(project.current_milestone_stage) === 0 && (
                  <span>Phase 1: Academic Lab Prototyping</span>
                )}
                {Number(project.current_milestone_stage) === 1 && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ maxWidth: '360px', marginTop: '12px' }}
                    disabled={loading}
                    onClick={() => triggerFactoryHandover(project.id)}
                  >
                    Log Factory Deployment &amp; Trigger Handover
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gap: '16px' }}>
        {openChallenges.length === 0 ? (
          <p>No open enterprise opportunities available right now.</p>
        ) : (
          openChallenges.map((problem) => (
            <div key={problem.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '16px', background: '#fff' }}>
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
              {problem.image_url && (
                <img src={problem.image_url} alt={problem.title} style={{ width: '200px', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
              )}
              <p><strong>Budget:</strong> ₹{Number(problem.allocated_budget || 0).toLocaleString()}</p>
              <p><strong>Severity:</strong> {problem.severity_score}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedProblem(problem.id)}
                style={{ width: '220px' }}
              >
                Partner & Apply as Consortium
              </button>
            </div>
          ))
        )}
      </div>

      {selectedProblem && (
        <div style={{ marginTop: '24px' }}>
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
