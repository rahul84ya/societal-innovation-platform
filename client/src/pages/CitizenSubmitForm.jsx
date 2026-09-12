import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import CitizenVerificationWidget from '../components/CitizenVerificationWidget';
import { apiFetch } from '../auth';

function CitizenSubmitForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trackedProblems, setTrackedProblems] = useState([]);
  const [trackerLoading, setTrackerLoading] = useState(false);

  const fetchTrackedProblems = async () => {
    try {
      setTrackerLoading(true);
      const response = await apiFetch('/api/problems/mine');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load active trackers.');
      }

      setTrackedProblems(result.data || []);
    } catch (error) {
      console.error('Failed to fetch citizen trackers:', error);
    } finally {
      setTrackerLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackedProblems();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (title.trim().length < 5) return alert('Title must be at least 5 characters long.');
    if (description.trim().length < 20) return alert('Description must be at least 20 characters long.');

    setLoading(true);
    let absoluteImageUrl = '';

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await apiFetch('/api/problems/upload-image', {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          absoluteImageUrl = uploadResult.url;
        } else {
          console.warn('Image upload failed:', uploadResult.error);
        }
      }

      const serverResponse = await apiFetch('/api/problems/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          image_url: absoluteImageUrl,
        }),
      });

      const parsedResponse = await serverResponse.json();

      if (parsedResponse.success) {
        alert('Incident successfully submitted and securely logged in PostgreSQL!');
        setTitle('');
        setDescription('');
        setImageFile(null);
        document.getElementById('evidence-upload-input').value = '';
        await fetchTrackedProblems();
      } else {
        alert('Server validation breakdown: ' + parsedResponse.error);
      }
    } catch (error) {
      console.error('Ingression workflow exception caught:', error);
      alert('Failed to execute complete ingestion pipeline: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
      <div className="bg-india-green px-6 py-4 border-b-4 border-saffron">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-saffron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Report Public Problem or Incident
        </h2>
      </div>
      
      <div className="p-6 md:p-8">
        <form onSubmit={handleFormSubmit} className="space-y-6 max-w-3xl">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Summary Headline</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-india-green focus:border-india-green outline-none transition-colors"
              placeholder="Briefly state the core issue (Min 5 characters)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Detailed Environmental Parameters</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-india-green focus:border-india-green outline-none transition-colors h-32 resize-y"
              placeholder="Describe the physical conditions, severity, and exact location markers in depth (Min 20 characters)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Evidence Media Capture <span className="font-normal text-gray-500">(Optional image verification file)</span></label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="evidence-upload-input" className="relative cursor-pointer bg-white rounded-md font-medium text-india-green hover:text-green-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-india-green px-2 py-1">
                    <span>Upload a file</span>
                    <input
                      id="evidence-upload-input"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                    />
                  </label>
                  <p className="pl-1 py-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                {imageFile && <p className="text-sm font-semibold text-india-green mt-2">Selected: {imageFile.name}</p>}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button 
              type="submit" 
              className="px-6 py-3 bg-india-green hover:bg-green-700 text-white font-bold rounded-md shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing media...
                </>
              ) : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-50 border-t border-gray-200 p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-india-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Active Trackers &amp; Audits
        </h2>
        
        {trackerLoading && (
          <div className="flex items-center gap-3 text-gray-600 p-4">
            <svg className="animate-spin h-5 w-5 text-india-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading your issue trackers...
          </div>
        )}
        
        {!trackerLoading && trackedProblems.length === 0 && (
          <div className="bg-white p-8 rounded-lg border border-gray-200 text-center shadow-sm">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 font-medium">No submitted issues are available yet.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trackedProblems.map((problem) => (
            <article key={problem.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{problem.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{problem.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
                    <p className="font-semibold text-india-green text-sm capitalize">{problem.problem_status.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Milestone Stage</p>
                    <p className="font-semibold text-gray-800 text-sm">{problem.current_milestone_stage}</p>
                  </div>
                </div>

                {problem.problem_status === 'pending_citizen_verification' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <CitizenVerificationWidget
                      problem={problem}
                      onComplete={fetchTrackedProblems}
                    />
                  </div>
                )}
                
                {problem.citizen_feedback_notes && (
                  <div className="mt-4 p-3 bg-red-50 border-l-4 border-saffron rounded-r">
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Latest Objection</p>
                    <p className="text-sm text-red-700">{problem.citizen_feedback_notes}</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CitizenSubmitForm;
