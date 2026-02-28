import { useState, useEffect } from 'react';
import { useApp } from '../App';

// Sample reviews (will come from Supabase)
const SAMPLE_REVIEWS = [
  { id: 'r1', user: 'Amara O.', rating: 5, comment: 'One of the most impactful books I\'ve read. Changed how I approach design entirely.', date: '2 weeks ago' },
  { id: 'r2', user: 'Kwame D.', rating: 4, comment: 'Dense but rewarding. Recommend taking notes as you go.', date: '1 month ago' },
  { id: 'r3', user: 'Nia W.', rating: 5, comment: 'Timeless. I find myself coming back to specific chapters regularly.', date: '3 months ago' },
];

export default function BookDetail({ bookId }) {
  const { books, navigate, session, supabase } = useApp();
  const book = books.find(b => b.id === bookId);

  const [reviews, setReviews] = useState(SAMPLE_REVIEWS);
  const [newReview, setNewReview] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownload = () => {
    if (!book?.file_url) {
      showToast('No file available for download yet.');
      return;
    }
    const a = document.createElement('a');
    a.href = book.file_url;
    a.download = `${book.title}.pdf`;
    a.click();
    showToast('Download started.');
  };

  const handleRead = () => navigate(`/read/${book.id}`);

  const handleReviewSubmit = async () => {
    if (!session) { navigate('/auth'); return; }
    if (!newReview.trim() || starRating === 0) {
      showToast('Please add a rating and comment.');
      return;
    }

    setSubmitting(true);
    // Supabase insert (swap mock when connected)
    // await supabase.from('reviews').insert({ book_id: book.id, user_id: session.user.id, rating: starRating, comment: newReview });

    // Optimistic update
    setReviews(prev => [{
      id: `r${Date.now()}`,
      user: session.user.email.split('@')[0],
      rating: starRating,
      comment: newReview,
      date: 'Just now',
    }, ...prev]);

    setNewReview('');
    setStarRating(0);
    setSubmitting(false);
    showToast('Review submitted. Thank you!');
  };

  useEffect(() => {
    // Scroll reveal
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (!book) {
    return (
      <div className="page book-detail">
        <div className="container">
          <p style={{ color: 'var(--text-tertiary)' }}>Book not found.</p>
          <button className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/')}>Back to library</button>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : book.rating;

  return (
    <div className="page book-detail">
      <div className="container">
        {/* Back */}
        <button
          className="btn btn-ghost"
          style={{ marginBottom: 'var(--space-8)', paddingLeft: 0 }}
          onClick={() => navigate('/')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Library
        </button>

        <div className="book-detail-grid">
          {/* Cover */}
          <div>
            <div className="book-detail-cover reveal" data-reveal>
              {book.cover
                ? <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <DetailCoverPlaceholder book={book} />
              }
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="book-detail-eyebrow reveal" data-reveal>{book.category} · {book.year}</p>
            <h1 className="book-detail-title reveal" data-reveal>{book.title}</h1>
            <p className="book-detail-author reveal" data-reveal>by {book.author}</p>

            {/* Quick stats */}
            <div className="book-detail-stats reveal" data-reveal>
              <div className="book-detail-stat">
                <div className="book-detail-stat-val">{avgRating}</div>
                <div className="book-detail-stat-label">Rating</div>
              </div>
              <div className="book-detail-stat">
                <div className="book-detail-stat-val">{book.pages}</div>
                <div className="book-detail-stat-label">Pages</div>
              </div>
              <div className="book-detail-stat">
                <div className="book-detail-stat-val">{(book.downloads / 1000).toFixed(1)}k</div>
                <div className="book-detail-stat-label">Downloads</div>
              </div>
              <div className="book-detail-stat">
                <div className="book-detail-stat-val">{reviews.length}</div>
                <div className="book-detail-stat-label">Reviews</div>
              </div>
            </div>

            <p className="book-detail-desc reveal" data-reveal>{book.description}</p>

            <div className="book-detail-actions reveal" data-reveal>
              <button className="btn btn-primary" onClick={handleRead}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                Read now
              </button>
              <button className="btn btn-secondary" onClick={handleDownload}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="reviews-section reveal" data-reveal>
          <h2 className="reviews-title">Reviews</h2>

          {/* Write a review */}
          <div className="review-form">
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>
              {session ? 'Share your thoughts' : 'Sign in to leave a review'}
            </p>

            {/* Star picker */}
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  className={`star-btn${(hoverStar || starRating) >= star ? ' active' : ''}`}
                  onMouseEnter={() => setHoverStar(star)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setStarRating(star)}
                  disabled={!session}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={(hoverStar || starRating) >= star ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              ))}
            </div>

            <textarea
              className="review-textarea"
              placeholder={session ? 'What did you think of this book?' : 'Sign in to write a review…'}
              value={newReview}
              onChange={e => setNewReview(e.target.value)}
              disabled={!session}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={session ? handleReviewSubmit : () => navigate('/auth')}
                disabled={submitting}
              >
                {session ? (submitting ? 'Submitting…' : 'Submit review') : 'Sign in to review'}
              </button>
            </div>
          </div>

          {/* Review list */}
          <div className="review-list">
            {reviews.map(review => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast${toast ? ' toast--visible' : ''}`}>{toast}</div>
    </div>
  );
}

function ReviewItem({ review }) {
  return (
    <div className="review-item">
      <div className="review-header">
        <div className="review-meta">
          <div className="review-avatar">{review.user[0].toUpperCase()}</div>
          <div>
            <div className="review-name">{review.user}</div>
            <div className="review-date">{review.date}</div>
          </div>
        </div>
        <div className="review-stars">
          {[1, 2, 3, 4, 5].map(s => (
            <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={review.rating >= s ? 'var(--ink-muted)' : 'none'} stroke="var(--ink-muted)" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          ))}
        </div>
      </div>
      <p className="review-body">{review.comment}</p>
    </div>
  );
}

function DetailCoverPlaceholder({ book }) {
  const tints = {
    Design:     '#E8E6DF', Technology: '#E4E5E8',
    Philosophy: '#EAE8E2', Science:    '#E6E8E4',
    Literature: '#ECE9E3', Business:   '#E9E7E2',
  };
  return (
    <div className="book-cover-placeholder" style={{ background: tints[book.category] || 'var(--bg-raised)', height: '100%' }}>
      <span className="book-cover-letter" style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }}>{book.title[0]}</span>
      <span className="book-cover-line" style={{ width: 48 }} />
      <span className="book-cover-cat">{book.category}</span>
    </div>
  );
}
