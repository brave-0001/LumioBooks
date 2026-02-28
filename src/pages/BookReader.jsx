import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../App';

// PDF.js loaded via CDN script tag — see public/index.html setup note
// This component works with the pdfjs-dist package:
// npm install pdfjs-dist

let pdfjsLib = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  const pdfjs = await import('pdfjs-dist');
  // Point worker to the CDN to avoid bundling it
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  pdfjsLib = pdfjs;
  return pdfjs;
}

export default function BookReader({ bookId }) {
  const { books, navigate } = useApp();
  const book = books.find(b => b.id === bookId);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputPage, setInputPage] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef(null);
  const renderTask = useRef(null);
  const containerRef = useRef(null);

  // Load PDF from book's file_url
  useEffect(() => {
    if (!book?.file_url) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await getPdfJs();
        const doc = await pdfjs.getDocument({ url: book.file_url }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!cancelled) setError('Could not load PDF. The file may be unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [book?.file_url]);

  // Render current page to canvas
  const renderPage = useCallback(async (doc, pageNum, pageScale) => {
    if (!canvasRef.current || !doc) return;

    // Cancel any in-flight render
    if (renderTask.current) {
      renderTask.current.cancel();
      renderTask.current = null;
    }

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: pageScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const task = page.render({ canvasContext: ctx, viewport });
      renderTask.current = task;
      await task.promise;
      renderTask.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        setError('Failed to render page.');
      }
    }
  }, []);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage, scale);
    }
  }, [pdfDoc, currentPage, scale, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Fullscreen
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  const zoomIn  = () => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)));
  const zoomFit = () => setScale(1.2);

  const handlePageInput = (e) => {
    setInputPage(e.target.value);
    const n = parseInt(e.target.value, 10);
    if (n >= 1 && n <= totalPages) setCurrentPage(n);
  };

  useEffect(() => { setInputPage(String(currentPage)); }, [currentPage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleDownload = () => {
    if (!book?.file_url) return;
    const a = document.createElement('a');
    a.href = book.file_url;
    a.download = `${book.title}.pdf`;
    a.click();
  };

  // No file_url — show placeholder state
  if (!book) {
    return (
      <div className="reader-page">
        <ReaderToolbar book={null} navigate={navigate} />
        <div className="reader-empty">
          <div className="reader-empty-icon">
            <BookIcon />
          </div>
          <p className="reader-empty-text">Book not found.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to library</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-page" ref={containerRef}>
      <ReaderToolbar
        book={book}
        navigate={navigate}
        currentPage={currentPage}
        totalPages={totalPages}
        inputPage={inputPage}
        onInputPage={handlePageInput}
        onPrev={goPrev}
        onNext={goNext}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomFit={zoomFit}
        scale={scale}
        onDownload={handleDownload}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        hasFile={!!book.file_url}
      />

      <div className="reader-canvas-wrap">
        {loading && (
          <div className="reader-empty">
            <div className="loader-dot" />
            <p className="reader-empty-text">Loading PDF…</p>
          </div>
        )}

        {error && (
          <div className="reader-empty">
            <div className="reader-empty-icon"><BookIcon /></div>
            <p className="reader-empty-text">{error}</p>
          </div>
        )}

        {!book.file_url && !loading && !error && (
          <NoFileState book={book} navigate={navigate} />
        )}

        {book.file_url && !loading && !error && (
          <div className="reader-canvas-inner">
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* Page progress bar */}
      {totalPages > 0 && (
        <div className="progress-bar-wrap" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '2px', zIndex: 50 }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function ReaderToolbar({
  book, navigate,
  currentPage, totalPages,
  inputPage, onInputPage,
  onPrev, onNext,
  onZoomIn, onZoomOut, onZoomFit,
  scale, onDownload, onFullscreen,
  isFullscreen, hasFile
}) {
  return (
    <div className="reader-toolbar">
      {/* Back */}
      <button
        className="reader-btn"
        onClick={() => navigate(book ? `/book/${book.id}` : '/')}
        title="Back"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Title */}
      <span className="reader-title">{book?.title ?? 'Reader'}</span>

      {hasFile && (
        <div className="reader-controls">
          {/* Page navigation */}
          <button className="reader-btn" onClick={onPrev} disabled={currentPage <= 1} title="Previous page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <input
            className="reader-page-input"
            value={inputPage}
            onChange={onInputPage}
            onFocus={e => e.target.select()}
            type="number"
            min={1}
            max={totalPages}
          />
          <span className="reader-page-sep">/ {totalPages}</span>

          <button className="reader-btn" onClick={onNext} disabled={currentPage >= totalPages} title="Next page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Divider */}
          <span style={{ width: 1, height: 20, background: 'var(--border-soft)', margin: '0 4px' }} />

          {/* Zoom */}
          <button className="reader-btn" onClick={onZoomOut} title="Zoom out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>

          <button className="reader-btn" onClick={onZoomFit} title="Reset zoom" style={{ fontSize: 'var(--text-xs)', width: 'auto', padding: '0 6px', fontFamily: 'var(--font-mono)' }}>
            {Math.round(scale * 100)}%
          </button>

          <button className="reader-btn" onClick={onZoomIn} title="Zoom in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>

          <span style={{ width: 1, height: 20, background: 'var(--border-soft)', margin: '0 4px' }} />

          {/* Fullscreen */}
          <button className="reader-btn" onClick={onFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            }
          </button>

          {/* Download */}
          <button className="reader-btn" onClick={onDownload} title="Download PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── No file placeholder ──────────────────────────────────────────────────────
function NoFileState({ book, navigate }) {
  return (
    <div className="reader-empty">
      <div className="reader-empty-icon" style={{ marginBottom: 'var(--space-2)' }}>
        <BookIcon size={48} />
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        {book.title}
      </p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
        by {book.author}
      </p>
      <p className="reader-empty-text" style={{ marginBottom: 'var(--space-6)' }}>
        This is a demo entry. Once a publisher uploads the PDF, it will appear here for reading.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Library</button>
        <button className="btn btn-secondary" onClick={() => navigate(`/book/${book.id}`)}>Book Details</button>
      </div>
    </div>
  );
}

function BookIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
