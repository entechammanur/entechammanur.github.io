import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase, supabaseConfigured } from './lib/supabase';
import ContentAdmin from './ContentAdmin';

const emptyForm = { name: '', email: '', password: '' };

function PasswordInput({ value, onChange, label = 'Password' }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="admin-field">
      <span>{label}</span>
      <span className="password-wrap">
        <input
          required
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          minLength={6}
          autoComplete={label === 'Password' ? 'current-password' : 'new-password'}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? '◉' : '◎'}
        </button>
      </span>
    </label>
  );
}

function AdminLogin({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });
        if (signUpError) throw signUpError;
        setMessage('Request sent. An existing administrator must approve your account before you can open the dashboard.');
        setMode('login');
        setForm(emptyForm);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;
        const { data: adminUser, error: adminCheckError } = await supabase
          .from('entechemmanur_admin_users')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (adminCheckError) throw adminCheckError;
        if (!adminUser) throw new Error('Your account is awaiting administrator approval.');
        onAuthenticated(data.session);
      }
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to complete that request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-shell">
      <motion.div className="admin-auth-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <a className="brand admin-brand" href="#top">CHAMMAN<span>U</span>R<span>.</span></a>
        <div className="kicker">Admin access</div>
        <h1>{mode === 'login' ? 'Welcome back.' : 'Request access.'}</h1>
        <p className="admin-muted">
          {mode === 'login' ? 'Sign in with an approved administrator account.' : 'Submit your details to the current administrator.'}
        </p>
        <form onSubmit={submit} className="admin-form">
          {mode === 'signup' && (
            <label className="admin-field">
              <span>Name</span>
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" />
            </label>
          )}
          <label className="admin-field">
            <span>Email</span>
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" />
          </label>
          <PasswordInput value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          {error && <p className="admin-error">{error}</p>}
          {message && <p className="admin-success">{message}</p>}
          <button className="admin-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Send request'}</button>
        </form>
        <button className="admin-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
          {mode === 'login' ? 'Need access? Request an account' : 'Already approved? Sign in'}
        </button>
        <a className="admin-back" href="#top">← Return to public site</a>
      </motion.div>
    </main>
  );
}

function AdminDashboard({ session }) {
  const [requests, setRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadRequests = async () => {
    const { data, error: requestError } = await supabase
      .from('entechemmanur_signup_requests')
      .select('id, name, email, status, created_at')
      .order('created_at', { ascending: false });
    if (requestError) setError(requestError.message);
    else setRequests(data || []);
  };

  useEffect(() => { loadRequests(); }, []);

  const approve = async (request) => {
    setError('');
    setStatus('');
    const { error: adminError } = await supabase.from('entechemmanur_admin_users').upsert({
      user_id: request.id,
      display_name: request.name,
      email: request.email,
      role: 'admin',
    });
    if (adminError) {
      setError(adminError.message);
      return;
    }
    const { error: updateError } = await supabase
      .from('entechemmanur_signup_requests')
      .update({ status: 'approved', reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id);
    if (updateError) setError(updateError.message);
    else {
      setStatus(`${request.email} is now an administrator.`);
      loadRequests();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.hash = '#admin';
  };

  return (
    <main className="admin-shell">
      <div className="admin-dashboard">
        <header className="admin-topbar">
          <div><div className="kicker">Chammanoor control room</div><h1>Admin dashboard</h1></div>
          <button className="admin-logout" type="button" onClick={signOut}>Sign out</button>
        </header>
        <section className="admin-stat-grid">
          <div className="admin-stat"><strong>{requests.filter((request) => request.status === 'pending').length}</strong><span>Pending requests</span></div>
          <div className="admin-stat"><strong>{requests.filter((request) => request.status === 'approved').length}</strong><span>Approved requests</span></div>
          <div className="admin-stat"><strong>Ready</strong><span>Supabase connection</span></div>
        </section>
        <nav className="admin-nav" aria-label="Admin sections">
          {[
            ['overview', 'Overview'],
            ['settings', 'Homepage'],
            ['directory', 'Directory'],
            ['town', 'Town content'],
            ['buses', 'Bus timings'],
            ['access', 'Access'],
          ].map(([key, label]) => (
            <button key={key} type="button" className={activeSection === key ? 'active' : ''} onClick={() => setActiveSection(key)}>
              <span className="admin-nav-icon">{key === 'overview' ? '⌂' : key === 'settings' ? '✦' : key === 'directory' ? '▦' : key === 'town' ? '⌖' : '♙'}</span>
              {label}
            </button>
          ))}
        </nav>
        {activeSection === 'overview' && <section className="admin-panel admin-welcome">
          <div className="kicker">Quick start</div>
          <h2>What would you like to update?</h2>
          <p className="admin-muted">Choose a section above to manage the public Chammanoor website without editing code.</p>
          <div className="admin-quick-grid">
            <button type="button" onClick={() => setActiveSection('settings')}><strong>Homepage</strong><span>Hero image and copy</span></button>
            <button type="button" onClick={() => setActiveSection('directory')}><strong>Directory</strong><span>Local listings and contacts</span></button>
            <button type="button" onClick={() => setActiveSection('town')}><strong>Town content</strong><span>Landmarks, notices and events</span></button>
            <button type="button" onClick={() => setActiveSection('buses')}><strong>Bus timings</strong><span>Routes and departure schedules</span></button>
            <button type="button" onClick={() => setActiveSection('access')}><strong>Access</strong><span>Approve administrator requests</span></button>
          </div>
        </section>}
        {activeSection === 'access' && <section className="admin-panel">
          <div className="admin-panel-head"><div><div className="kicker">Access management</div><h2>Signup requests</h2></div><button type="button" className="admin-refresh" onClick={loadRequests}>Refresh</button></div>
          {error && <p className="admin-error">{error}</p>}
          {status && <p className="admin-success">{status}</p>}
          {requests.length === 0 ? <p className="admin-muted">No signup requests yet.</p> : (
            <div className="request-list">
              {requests.map((request) => (
                <div className="request-row" key={request.id}>
                  <div><strong>{request.name}</strong><span>{request.email}</span></div>
                  <span className={`request-status ${request.status}`}>{request.status}</span>
                  {request.status === 'pending' && <button type="button" className="admin-approve" onClick={() => approve(request)}>Promote to admin</button>}
                </div>
              ))}
            </div>
          )}
        </section>}
        {['settings', 'directory', 'town', 'buses'].includes(activeSection) && <ContentAdmin session={session} section={activeSection} />}
        <p className="admin-muted admin-note">Changes are stored in Supabase and become available to public visitors when published.</p>
      </div>
    </main>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabaseConfigured));

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setLoading(false);
        return;
      }
      const { data: adminUser, error } = await supabase
        .from('entechemmanur_admin_users')
        .select('user_id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();
      setAccessDenied(Boolean(error || !adminUser));
      setSession(error || !adminUser ? null : data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return <main className="admin-shell"><div className="admin-auth-card"><div className="kicker">Supabase setup needed</div><h1>Connect the control room.</h1><p className="admin-muted">Create a <code>.env.local</code> file from <code>.env.example</code>, add your Supabase URL and anon key, then restart Vite.</p><a className="primary" href="#top">Return to site</a></div></main>;
  }
  if (loading) return <main className="admin-shell"><div className="admin-auth-card"><p className="admin-muted">Checking your session…</p></div></main>;
  if (accessDenied) {
    return (
      <main className="admin-shell">
        <div className="admin-auth-card">
          <div className="kicker">Access pending</div>
          <h1>Approval required.</h1>
          <p className="admin-muted">Your account is signed in, but it is not in the administrator table yet. Ask an existing admin to promote your account from the dashboard.</p>
          <button className="admin-switch" type="button" onClick={() => { supabase.auth.signOut(); setAccessDenied(false); }}>Return to login</button>
        </div>
      </main>
    );
  }
  return session ? <AdminDashboard session={session} /> : <AdminLogin onAuthenticated={setSession} />;
}
