import { useState, useRef } from 'react';
import { useApp } from '../App';

const CATEGORIES = ['Design', 'Technology', 'Philosophy', 'Science', 'Literature', 'Business'];

const EMPTY_FORM = {
  title: '',
  author: '',
  category: '',
  description: '',
  year: new Date().getFullYear(),
};

export default function PublisherDashboard() {
  const { session, navigate, supabase } = useApp();

  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [myBooks, setMyBooks] = useState([]);

  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (!session) {
    return (
      <div className="page publisher-page">
        <div className="container">
          <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: 'var(--space-20) 0' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Publisher access</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 'var(--space-4)' }}>
              Sign in to publish
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', fontWeight: 300 }}>
              Create a free account to upload books and reach thousands of readers.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>Sign in or create account</button>
          </div>
        </div>
      </div>
    );
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
    } else {
      showToast('Please upload a PDF file.');
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected?.type === 'application/pdf') {
      setFile(selected);
    } else {
      showToast('Please upload a PDF file.');
    }
  };

  const handleSubmit = async () => {
    if (!file) { showToast('Please upload a PDF file.'); return; }
    if (!form.title || !form.author || !form.category) {
      showToast('Please fill in title, author, and category.');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // 1. Upload PDF to Supabase Storage
      const path = `books/${session.user.id}/${Date.now()}_${file.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('pdfs')
        .upload(path, file, { contentType: 'application/pdf', upsert: false });

      if (storageError) throw storageError;
      setProgress(60);

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(path);
      setProgress(75);

      // 3. Insert book record
      const { data: book, error: dbError } = await supabase.from('books').insert({
        title: form.title,
        author: form.author,
        category: form.category,
        description: form.description,
        year: Number(form.year),
        file_url: urlData.publicUrl,
        publisher_id: session.user.id,
        status: 'pending', // Requires admin approval
        pages: 0, // Will be extracted server-side
      }).select().single();

      if (dbError) throw dbError;
      setProgress(100);

      setMyBooks(prev => [book, ...prev]);
      setForm(EMPTY_FORM);
      setFile(null);
      showToast('Book submitted for review!');
    } catch (err) {
      showToast(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="page publisher-page">
      <div className="container">
        <div className="publisher-header">
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            Publisher dashboard
          </p>
          <h1 className="publisher-title">Share your knowledge</h1>
          <p className="publisher-sub">
            Upload a PDF and it will be reviewed by our team before going live.
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`upload-zone${dragOver ? ' upload-zone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <div className="upload-icon">
            {file
              ? <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            }
          </div>

          {file
            ? <>
                <p className="upload-label">{file.name}</p>
                <p className="upload-hint">{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
              </>
            : <>
                <p className="upload-label">Drop your PDF here</p>
                <p className="upload-hint">or click to browse — max 50MB</p>
              </>
          }

          {uploading && (
            <div className="progress-bar-wrap" style={{ width: '60%', margin: 'var(--space-4) auto 0' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* Metadata form */}
        <div className="upload-form">
          <div className="form-group">
            <label className="form-label" htmlFor="title">Book title *</label>
            <input id="title" className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. The Laws of Simplicity" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="author">Author *</label>
            <input id="author" className="form-input" value={form.author} onChange={e => set('author', e.target.value)} placeholder="e.g. John Maeda" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Category *</label>
            <select id="category" className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="year">Publication year</label>
            <input id="year" className="form-input" type="number" value={form.year} onChange={e => set('year', e.target.value)} min="1800" max={new Date().getFullYear()} />
          </div>

          <div className="form-group full-span">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea id="description" className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="A short description of what this book is about and who would benefit from reading it…" />
          </div>

          <div className="full-span" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
            <button className="btn btn-secondary" onClick={() => { setForm(EMPTY_FORM); setFile(null); }}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
              {uploading ? `Uploading ${progress}%…` : 'Submit for review'}
            </button>
          </div>
        </div>

        {/* My submitted books */}
        {myBooks.length > 0 && (
          <section style={{ marginTop: 'var(--space-20)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-8)' }}>
              Your submissions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {myBooks.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', gap: 'var(--space-4)' }}>
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: 2 }}>{b.title}</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{b.author} · {b.category}</p>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-sunken)', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className={`toast${toast ? ' toast--visible' : ''}`}>{toast}</div>
    </div>
  );
}
