import React, { useState } from 'react';
import { apiFetch, getAuth } from '../auth';

function JointProposalForm({ problemId, onSubmitSuccess, onCancel }) {
  const [problemIdInput, setProblemIdInput] = useState(problemId || '');
  const currentUser = getAuth()?.user;
  const [universityId, setUniversityId] = useState(currentUser?.user_role === 'university' ? currentUser.id : '');
  const [industryId, setIndustryId] = useState(currentUser?.user_role === 'industry' ? currentUser.id : '');
  const [abstractPlan, setAbstractPlan] = useState('');
  const [estimatedTimelineWeeks, setEstimatedTimelineWeeks] = useState('');
  const [corporateContributionNotes, setCorporateContributionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);

      const response = await apiFetch('/api/problems/submit-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: Number(problemIdInput),
          university_id: Number(universityId),
          industry_id: Number(industryId),
          abstract_plan: abstractPlan,
          corporate_contribution_notes: corporateContributionNotes,
          estimated_timeline_weeks: Number(estimatedTimelineWeeks),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Proposal submission failed.');
        return;
      }

      alert('Joint proposal submitted successfully.');
      setProblemIdInput('');
      setUniversityId('');
      setIndustryId('');
      setAbstractPlan('');
      setEstimatedTimelineWeeks('');
      setCorporateContributionNotes('');

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Failed to submit consortium proposal:', error);
      alert('Submission failed: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-layout" style={{ maxWidth: 700, marginTop: 12 }}>
      <h2>🤝 Joint Consortium Proposal</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Problem ID</label>
          <input type="number" value={problemIdInput} onChange={(e) => setProblemIdInput(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>University ID</label>
          <input type="number" value={universityId} onChange={(e) => setUniversityId(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Industry ID</label>
          <input type="number" value={industryId} onChange={(e) => setIndustryId(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Abstract Plan</label>
          <textarea value={abstractPlan} onChange={(e) => setAbstractPlan(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Corporate Contribution Notes</label>
          <textarea value={corporateContributionNotes} onChange={(e) => setCorporateContributionNotes(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Estimated Timeline (Weeks)</label>
          <input type="number" value={estimatedTimelineWeeks} onChange={(e) => setEstimatedTimelineWeeks(e.target.value)} required />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting Joint Bid...' : 'Submit Consortium Bid'}
          </button>
          {onCancel && (
            <button type="button" className="btn-primary" onClick={onCancel} style={{ background: '#666' }}>
              Close
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default JointProposalForm;
