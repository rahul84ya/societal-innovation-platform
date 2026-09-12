import React, { useState } from 'react';
import { apiFetch } from '../auth';
import { notify } from './ToastProvider';

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

      notify(result.message || 'Citizen verification recorded.', 'success');
      if (onComplete) onComplete(result);
    } catch (error) {
      console.error('Citizen verification failed:', error);
      notify(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50 border-2 border-saffron rounded-lg p-5 mt-4">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Citizen Verification Required</h3>
      <p className="text-gray-700 mb-4 text-sm">Factory deployment has been handed over. Confirm the fix or explain why rework is required.</p>
      <div className="mb-4">
        <label htmlFor={`rejection-reason-${problem.id}`} className="block text-sm font-medium text-gray-700 mb-1">Objection reason</label>
        <textarea
          id={`rejection-reason-${problem.id}`}
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Describe what is still broken..."
          disabled={submitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[80px]"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={submitting}
          onClick={() => submitDecision('citizen-confirm')}
        >
          Confirm Fix Works 👍
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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
