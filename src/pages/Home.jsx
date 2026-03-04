import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';

const TINTS = {
  Design:     '#E8E6DF',
  Technology: '#E4E5E8',
  Philosophy: '#EAE8E2',
  Science:    '#E6E8E4',
  Literature: '#ECE9E3',
  Business:   '#E9E7E2',
};

export default function Home() {
  const { supabase, categories, navigate } = useApp();

  const [books,          setBooks]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [query,          setQuery]          = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Fetch approved books from Supabase
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!error && data) setBooks(data);
      setLoading(false);
    }
    fetchBooks();
  }, [supabase]);

  // Derived stats from live data
  const stats = {
    books:      books.length,
    downloads:  books.reduce((s, b) => s + (b.downloads || 0), 0),
    categories: categories.filter(c => c !== 'All').length,
    avgRating:  books.length
      ? (books.reduce((s, b) => s + (b.rating || 0), 0) / books.length).toFixed(1)
      : '—',
  };

  const filtered = books.filter(book => {
    const matchCat   = activeCategory === 'All' || book.category === activeCategory;
    const matchQuery = !query ||
      book.title?.toLowerCase().includes(query.toLowerCase()) ||
      book.author?.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="page">
      <Hero stats={stats} navigate={navigate} />

      <section style={{ padding: '0 0 var(--space-24)' }}>
        <div className="container">

          {/* Search */}
          <div className="search-wrap reveal" data-reveal>
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Search books, authors…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Category pills */}
          <div className="category-bar reveal" data-reveal>
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-pill${activeCategory === cat ? ' category-pill--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid header */}
          <div className="section-header reveal" data-reveal>
            <h2 className="section-title">
              {activeCategory === 'All' ? 'All books' : activeCategory}
            </h2>
            {!loading && (
              <span className="section-count">
                {filtered.length} {filtered.length === 1 ? 'book' : 'books'}
              </span>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
                  <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                </div>
              ))}
            </div>
          )}

          {/* Book grid */}
          {!loading && (
            <div className="book-grid">
              {filtered.map((book, i) => (
                <BookCard key={book.id} book={book} navigate={navigate} index={i} />
              ))}

              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: 'var(--space-20) 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <p style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-base)' }}>
                    {query ? `No results for "${query}"` : 'No books yet.'}
                  </p>
                  {query && (
                    <button className="btn btn-ghost" onClick={() => { setQuery(''); setActiveCategory('All'); }}>
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <RevealObserver />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ stats, navigate }) {
  return (
    <section className="hero">
      <div className="container">
        <p className="hero-eyebrow reveal" data-reveal>Free knowledge for everyone</p>
        <h1 className="hero-title reveal" data-reveal>
          Read what <em>matters</em>,<br />whenever you want.
        </h1>
        <p className="hero-sub reveal" data-reveal>
          A curated library of PDF books. Read online, download freely, share generously.
        </p>
        <div className="hero-actions reveal" data-reveal>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>
            Get started free
          </button>
          <button className="btn btn-secondary" onClick={() => document.querySelector('.search-wrap')?.scrollIntoView({ behavior: 'smooth' })}>
            Browse library
          </button>
        </div>
      </div>

      <div className="container">
        <div className="stats-strip reveal" data-reveal>
          <StatItem value={stats.books}     label="Books" />
          <StatItem value={stats.downloads > 0 ? `${(stats.downloads / 1000).toFixed(0)}k+` : '0'} label="Downloads" />
          <StatItem value={stats.categories} label="Categories" />
          <StatItem value={stats.avgRating}  label="Avg rating" />
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label }) {
  return (
    <div className="stat-item">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ─── Book card ────────────────────────────────────────────────────────────────
function BookCard({ book, navigate, index }) {
  return (
    <article
      className="book-card reveal"
      data-reveal
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => navigate(`/book/${book.id}`)}
    >
      <div className="book-cover">
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <BookCoverPlaceholder book={book} />
        }
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <div className="book-meta">
          {book.rating > 0 && (
            <span className="book-rating">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              {book.rating}
            </span>
          )}
          {book.pages > 0 && <span className="book-pages">{book.pages} pp.</span>}
          {book.pages === 0 && <span className="book-pages">{book.category}</span>}
        </div>
      </div>
    </article>
  );
}

function BookCoverPlaceholder({ book }) {
  return (
    <div className="book-cover-placeholder" style={{ background: TINTS[book.category] || 'var(--bg-raised)' }}>
      <span className="book-cover-letter">{book.title?.[0] || '?'}</span>
      <span className="book-cover-line" />
      <span className="book-cover-cat">{book.category}</span>
    </div>
  );
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io  = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
