import { useState } from 'react';
import { useApp } from '../App';

// Human-readable error messages — Supabase errors are often technical
function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Try again.';
  if (msg.includes('Invalid login'))       return 'Email or password is incorrect.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first.';
  if (msg.includes('User not found'))      return 'No account found with this email.';
  if (msg.includes('rate limit'))          return 'Too many attempts. Wait a moment.';
  if (msg.includes('network'))             return 'Connection issue. Check your internet.';
  if (msg.includes('already registered'))  return 'This email is already registered. Sign in instead.';
  if (msg.includes('not connected'))       return 'Service unavailable. Try again shortly.';
  return msg;
}

// ─── Shared state views ───────────────────────────────────────────────────────
function SuccessCard({ icon, title, sub, action, onAction }) {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-success-icon" style={{ margin: '0 auto var(--space-6)' }}>
          {icon}
        </div>
        <h2 className="auth-title">{title}</h2>
        <p className="auth-sub" style={{ marginBottom: 'var(--space-6)' }}>{sub}</p>
        {action && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onAction}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export default function Auth() {
  const { supabase, navigate, session } = useApp();

  // 'magic' | 'password' | 'reset'
  const [mode,     setMode]     = useState('password');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false); // magic link sent
  const [reset,    setReset]    = useState(false); // reset email sent
  const [error,    setError]    = useState(null);

  const clearError = () => setError(null);
  const switchMode = (m) => { setMode(m); clearError(); setSent(false); setReset(false); };

  // Already signed in
  if (session) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p className="auth-eyebrow">LumioBooks</p>
          <h1 className="auth-title">You're in.</h1>
          <p className="auth-sub" style={{ marginBottom: 'var(--space-6)' }}>
            {session.user.email}
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/')}
          >
            Browse library
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-3)' }}
            onClick={() => navigate('/account')}
          >
            My account
          </button>
        </div>
      </div>
    );
  }

  // Magic link sent
  if (sent) {
    return (
      <SuccessCard
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
        title="Check your email"
        sub={<>Magic link sent to <strong>{email}</strong>.<br />Click it to sign in — no password needed.</>}
        action="Use a different email"
        onAction={() => { setSent(false); setEmail(''); }}
      />
    );
  }

  // Reset email sent
  if (reset) {
    return (
      <SuccessCard
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
        title="Reset link sent"
        sub={<>Check <strong>{email}</strong> for a password reset link.<br />Open it on this device.</>}
        action="Back to sign in"
        onAction={() => { setReset(false); switchMode('password'); }}
      />
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleMagicLink = async () => {
    if (!validate()) return;
    setLoading(true); clearError();

    if (!process.env.REACT_APP_SUPABASE_URL) {
      setTimeout(() => { setLoading(false); setSent(true); }, 800);
      return;
    }

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    setLoading(false);
    err ? setError(friendlyError(err.message)) : setSent(true);
  };

  const handlePassword = async () => {
    if (!validate()) return;
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true); clearError();

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    err ? setError(friendlyError(err.message)) : navigate('/');
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true); clearError();

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/update-password`,
    });

    setLoading(false);
    err ? setError(friendlyError(err.message)) : setReset(true);
  };

  const handleSubmit = () => {
    if (mode === 'magic')  handleMagicLink();
    if (mode === 'password') handlePassword();
    if (mode === 'reset')  handleReset();
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  const labels = { magic: 'Send magic link', password: 'Sign in', reset: 'Send reset link' };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">LumioBooks</p>
        <h1 className="auth-title">
          {mode === 'reset' ? 'Forgot password?' : 'Welcome back.'}
        </h1>
        <p className="auth-sub">
          {mode === 'reset'
            ? 'Enter your email and we\'ll send a reset link.'
            : 'Sign in to read, download, and review books.'}
        </p>

        {/* Mode switcher — only show for non-reset */}
        {mode !== 'reset' && (
          <div className="auth-mode-toggle">
            <button
              className={mode === 'password' ? 'auth-mode-btn active' : 'auth-mode-btn'}
              onClick={() => switchMode('password')}
            >
              Password
            </button>
            <button
              className={mode === 'magic' ? 'auth-mode-btn active' : 'auth-mode-btn'}
              onClick={() => switchMode('magic')}
            >
              Magic link
            </button>
          </div>
        )}

        <div className="auth-form">
          {/* Email */}
          <div>
            <label className="form-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className={`form-input${error && error.toLowerCase().includes('email') ? ' form-input--error' : ''}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); clearError(); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Password field */}
          {mode === 'password' && (
            <div>
              <label className="form-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                className={`form-input${error && error.toLowerCase().includes('password') ? ' form-input--error' : ''}`}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError(); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete="current-password"
              />
              {/* Forgot password — quiet, below the field */}
              <button
                className="auth-forgot"
                onClick={() => switchMode('reset')}
                type="button"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="auth-error">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-4)' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '…' : labels[mode]}
          </button>

          {/* Back link for reset mode */}
          {mode === 'reset' && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => switchMode('password')}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
