import { useState } from 'react';
import { useApp } from '../App';

export default function Auth() {
  const { supabase, navigate, session } = useApp();

  const [mode, setMode] = useState('magic'); // 'magic' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  if (session) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Signed in</p>
          <h1 className="auth-title">You're in</h1>
          <p className="auth-sub">{session.user.email}</p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-6)' }} onClick={() => navigate('/')}>
            Browse library
          </button>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-success-icon" style={{ margin: '0 auto var(--space-6)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 className="auth-title">Check your email</h2>
          <p className="auth-sub">Magic link sent to <strong>{email}</strong>. Click it to sign in.</p>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setSent(false); setEmail(''); }}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const handleMagicLink = async () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email.'); return; }
    setLoading(true);
    setError(null);

    if (!process.env.REACT_APP_SUPABASE_URL) {
      setTimeout(() => { setLoading(false); setSent(true); }, 800);
      return;
    }

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    err ? setError(err.message) : setSent(true);
    setLoading(false);
  };

  const handlePassword = async () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email.'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">LumioBooks</p>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to read, download, and review books.</p>

        <div className="auth-mode-toggle">
          <button
            className={mode === 'magic' ? 'auth-mode-btn active' : 'auth-mode-btn'}
            onClick={() => { setMode('magic'); setError(null); }}
          >
            Magic link
          </button>
          <button
            className={mode === 'password' ? 'auth-mode-btn active' : 'auth-mode-btn'}
            onClick={() => { setMode('password'); setError(null); }}
          >
            Password
          </button>
        </div>

        <div className="auth-form">
          <div>
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && (mode === 'magic' ? handleMagicLink() : handlePassword())}
              autoFocus
              autoComplete="email"
            />
          </div>

          {mode === 'password' && (
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && handlePassword()}
                autoComplete="current-password"
              />
            </div>
          )}

          {error && (
            <p style={{ fontSize: 'var(--text-sm)', color: '#8B4A4A', marginTop: 'var(--space-1)' }}>
              {error}
            </p>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-4)' }}
            onClick={mode === 'magic' ? handleMagicLink : handlePassword}
            disabled={loading}
          >
            {loading ? '…' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
