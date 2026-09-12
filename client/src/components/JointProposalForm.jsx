import React, { useState } from 'react';
import { apiFetch, getAuth } from '../auth';
import { notify } from './ToastProvider';

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
        notify(result.error || 'Proposal submission failed.', 'error');
        return;
      }

      notify('Joint proposal submitted successfully.', 'success');
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
      notify('Submission failed: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">🤝 Joint Consortium Proposal</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Problem ID</label>
          <input type="number" value={problemIdInput} onChange={(e) => setProblemIdInput(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">University ID</label>
          <input type="number" value={universityId} onChange={(e) => setUniversityId(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry ID</label>
          <input type="number" value={industryId} onChange={(e) => setIndustryId(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Abstract Plan</label>
          <textarea value={abstractPlan} onChange={(e) => setAbstractPlan(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors min-h-[100px]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corporate Contribution Notes</label>
          <textarea value={corporateContributionNotes} onChange={(e) => setCorporateContributionNotes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors min-h-[80px]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Timeline (Weeks)</label>
          <input type="number" value={estimatedTimelineWeeks} onChange={(e) => setEstimatedTimelineWeeks(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
            {submitting ? 'Submitting Joint Bid...' : 'Submit Consortium Bid'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-6 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 rounded-md transition-colors shadow-sm">
              Close
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default JointProposalForm;
