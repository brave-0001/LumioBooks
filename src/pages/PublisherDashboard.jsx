import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../App';

const CATEGORIES = ['Design', 'Technology', 'Philosophy', 'Science', 'Literature', 'Business'];

const EMPTY_FORM = {
  title: '', author: '', category: '', description: '', year: new Date().getFullYear(),
};

export default function PublisherDashboard() {
  const { session, navigate, supabase } = useApp();

  const [form,      setForm]      = useState(EMPTY_FORM);
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [toast,     setToast]     = useState(null);
  const [myBooks,   setMyBooks]   = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load this publisher's books
  const loadBooks = useCallback(async () => {
    if (!session) return;
    setLoadingBooks(true);
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('publisher_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setMyBooks(data);
    setLoadingBooks(false);
  }, [session, supabase]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Not signed in
  if (!session) {
    return (
      <div className="page publisher-page">
        <div className="container" style={{ maxWidth: 480, textAlign: 'center', padding: 'var(--space-32) var(--space-8)' }}>
          <p className="hero-eyebrow">Publisher access</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 'var(--space-4)' }}>
            Sign in to publish
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', fontWeight: 300 }}>
            Upload books and reach thousands of readers.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { showToast('Only PDF files are supported.', 'error'); return; }
    if (f.size > 52428800) { showToast('File too large. Maximum size is 50MB.', 'error'); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file)             { showToast('Please select a PDF file.', 'error'); return; }
    if (!form.title.trim()) { showToast('Title is required.', 'error'); return; }
    if (!form.author.trim()){ showToast('Author is required.', 'error'); return; }
    if (!form.category)    { showToast('Please select a category.', 'error'); return; }

    setUploading(true);
    setProgress(10);

    try {
      // 1. Upload PDF
      const ext  = file.name.split('.').pop();
      const path = `${session.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(path, file, { contentType: 'application/pdf', upsert: false });

      if (uploadError) throw new Error(uploadError.message);
      setProgress(60);

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(path);
      setProgress(75);

      // 3. Save to books table
      const { data: book, error: dbError } = await supabase
        .from('books')
        .insert({
          title:        form.title.trim(),
          author:       form.author.trim(),
          category:     form.category,
          description:  form.description.trim(),
          year:         Number(form.year) || new Date().getFullYear(),
          file_url:     urlData.publicUrl,
          publisher_id: session.user.id,
          status:       'approved',
          pages:        0,
          downloads:    0,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      setProgress(100);

      setMyBooks(prev => [book, ...prev]);
      setForm(EMPTY_FORM);
      setFile(null);
      showToast('Book published successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Remove "${book.title}"?`)) return;

    const { error } = await supabase.from('books').delete().eq('id', book.id);
    if (error) { showToast('Could not remove book.', 'error'); return; }

    setMyBooks(prev => prev.filter(b => b.id !== book.id));
    showToast('Book removed.', 'info');
  };

  return (
    <div className="page publisher-page">
      <div className="container">
        {/* Header */}
        <div className="publisher-header">
          <p className="hero-eyebrow">Publisher</p>
          <h1 className="publisher-title">Share your books</h1>
          <p className="publisher-sub">Upload a PDF — it goes live instantly.</p>
        </div>

        {/* Drop zone */}
        <div
          className={`upload-zone${dragOver ? ' upload-zone--active' : ''}${file ? ' upload-zone--filled' : ''}`}
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
            onChange={e => handleFile(e.target.files[0])}
          />

          <div className="upload-icon">
            {file
              ? <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            }
          </div>

          {file ? (
            <>
              <p className="upload-label">{file.name}</p>
              <p className="upload-hint">{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
            </>
          ) : (
            <>
              <p className="upload-label">Drop your PDF here</p>
              <p className="upload-hint">or click to browse · max 50 MB</p>
            </>
          )}

          {uploading && (
            <div className="progress-bar-wrap" style={{ width: '60%', margin: 'var(--space-4) auto 0' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* Metadata form */}
        <div className="upload-form">
          <div className="form-group">
            <label className="form-label" htmlFor="pub-title">Title *</label>
            <input id="pub-title" className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Things Fall Apart" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pub-author">Author *</label>
            <input id="pub-author" className="form-input" value={form.author} onChange={e => set('author', e.target.value)} placeholder="e.g. Chinua Achebe" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pub-category">Category *</label>
            <select id="pub-category" className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pub-year">Year</label>
            <input id="pub-year" className="form-input" type="number" value={form.year} onChange={e => set('year', e.target.value)} min="1800" max={new Date().getFullYear()} />
          </div>

          <div className="form-group full-span">
            <label className="form-label" htmlFor="pub-desc">Description</label>
            <textarea id="pub-desc" className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="A short description of the book…" />
          </div>

          <div className="full-span" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button className="btn btn-secondary" onClick={() => { setForm(EMPTY_FORM); setFile(null); }}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
              {uploading ? `Uploading ${progress}%…` : 'Publish book'}
            </button>
          </div>
        </div>

        {/* My books */}
        <section style={{ marginTop: 'var(--space-20)' }}>
          <div className="section-header">
            <h2 className="section-title">Your books</h2>
            <span className="section-count">{myBooks.length}</span>
          </div>

          {loadingBooks && (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              Loading…
            </div>
          )}

          {!loadingBooks && myBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              No books yet. Upload your first one above.
            </div>
          )}

          {!loadingBooks && myBooks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {myBooks.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                  gap: 'var(--space-4)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{b.author} · {b.category}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 'var(--text-xs)', padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: b.status === 'approved' ? 'rgba(52,199,89,0.1)' : 'var(--bg-sunken)',
                      color: b.status === 'approved' ? '#34C759' : 'var(--text-tertiary)',
                      fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      {b.status}
                    </span>
                    <button
                      onClick={() => navigate(`/book/${b.id}`)}
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
                      style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = '#C0392B'}
                      onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast--visible`} style={{
          background: toast.type === 'error' ? '#8B4A4A' : toast.type === 'success' ? '#2D6A4F' : 'var(--ink)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
