import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import CitizenVerificationWidget from '../components/CitizenVerificationWidget';
import { apiFetch } from '../auth';
import '../styles/FormStyle.css';

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
        const fileExtension = imageFile.name.split('.').pop();
        const customFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const targetFilePath = `problem_images/${customFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('problem_images')
          .upload(targetFilePath, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('problem_images').getPublicUrl(targetFilePath);
        absoluteImageUrl = data.publicUrl;
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
    <div className="card-layout">
      <h2>🚨 Report Public Problem or Incident</h2>
      <form onSubmit={handleFormSubmit}>
        <div className="form-group">
          <label>Summary Headline</label>
          <input
            type="text"
            placeholder="Briefly state the core issue (Min 5 characters)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Detailed Environmental Parameters</label>
          <textarea
            placeholder="Describe the physical conditions, severity, and exact location markers in depth (Min 20 characters)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Evidence Media Capture (Optional image verification file)</label>
          <input
            id="evidence-upload-input"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing media and saving database records...' : 'Submit Incident Report'}
        </button>
      </form>

      <section style={{ marginTop: '32px' }}>
        <h2>Active Trackers &amp; Audits</h2>
        {trackerLoading && <p>Loading your issue trackers...</p>}
        {!trackerLoading && trackedProblems.length === 0 && (
          <p>No submitted issues are available yet.</p>
        )}
        <div style={{ display: 'grid', gap: '16px' }}>
          {trackedProblems.map((problem) => (
            <article key={problem.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
              <p><strong>Status:</strong> {problem.problem_status}</p>
              <p><strong>Milestone stage:</strong> {problem.current_milestone_stage}</p>
              {problem.problem_status === 'pending_citizen_verification' && (
                <CitizenVerificationWidget
                  problem={problem}
                  onComplete={fetchTrackedProblems}
                />
              )}
              {problem.citizen_feedback_notes && (
                <p><strong>Latest objection:</strong> {problem.citizen_feedback_notes}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CitizenSubmitForm;
