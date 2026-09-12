import React, { useState } from 'react';
import { apiFetch } from '../auth';
import '../styles/FormStyle.css';

function CitizenVerificationWidget({ problem, onComplete }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!problem || problem.problem_status !== 'pending_citizen_verification') {
    return null;
  }

  const submitDecision = async (endpoint, body = {}) => {
    try {
      setSubmitting(true);
      const response = await apiFetch(`/api/problems/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: Number(problem.id), ...body }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Citizen verification could not be recorded.');
      }

      alert(result.message || 'Citizen verification recorded.');
      if (onComplete) onComplete(result);
    } catch (error) {
      console.error('Citizen verification failed:', error);
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-layout" style={{ margin: '16px 0 0', maxWidth: 'none', border: '2px solid #f0b429' }}>
      <h3>Citizen Verification Required</h3>
      <p>Factory deployment has been handed over. Confirm the fix or explain why rework is required.</p>
      <div className="form-group">
        <label htmlFor={`rejection-reason-${problem.id}`}>Objection reason</label>
        <textarea
          id={`rejection-reason-${problem.id}`}
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Describe what is still broken..."
          disabled={submitting}
        />
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          style={{ background: '#1e9b4d', width: 'auto' }}
          disabled={submitting}
          onClick={() => submitDecision('citizen-confirm')}
        >
          Confirm Fix Works 👍
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{ background: '#d93025', width: 'auto' }}
          disabled={submitting || rejectionReason.trim().length < 5}
          onClick={() => submitDecision('citizen-reject', { rejection_reason: rejectionReason.trim() })}
        >
          Objection: Still Broken 👎
        </button>
      </div>
    </div>
  );
}

export default CitizenVerificationWidget;
