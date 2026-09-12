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
    <div className="card-layout" style={{ maxWidth: 1100 }}>
      <h2>🎓 Research Market Feed</h2>
      {loading && <p>Loading open research challenges...</p>}

      <div style={{ display: 'grid', gap: '16px' }}>
        {openChallenges.length === 0 ? (
          <p>No open research challenges available.</p>
        ) : (
          openChallenges.map((problem) => (
            <div key={problem.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '16px', background: '#fff' }}>
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
              {problem.image_url && (
                <img src={problem.image_url} alt={problem.title} style={{ width: '200px', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
              )}
              <p><strong>Category:</strong> {problem.category}</p>
              <p><strong>Budget:</strong> ₹{Number(problem.allocated_budget || 0).toLocaleString()}</p>
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

export default UniversityDashboard;
