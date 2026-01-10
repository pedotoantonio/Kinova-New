const { useState, useEffect, useCallback, createElement: h } = React;
const { createRoot } = ReactDOM;

const T = {
  it: {
    login: { title: 'Kinova Admin', email: 'Email', password: 'Password', submit: 'Accedi', error: 'Credenziali non valide', rateLimit: 'Troppi tentativi. Riprova tra {min} minuti.' },
    nav: { dashboard: 'Dashboard', users: 'Utenti', families: 'Famiglie', trials: 'Trial', donations: 'Donazioni', payments: 'Pagamenti', logs: 'Logs', audit: 'Audit Log', ai: 'AI Config', logout: 'Esci' },
    dashboard: { title: 'Dashboard', totalUsers: 'Utenti totali', activeUsers: 'Utenti attivi', totalFamilies: 'Famiglie totali', activeFamilies: 'Famiglie attive', activeTrials: 'Trial attivi', expiredTrials: 'Trial scaduti', totalDonations: 'Donazioni totali' },
    users: { title: 'Gestione Utenti', search: 'Cerca utenti...', email: 'Email', name: 'Nome', role: 'Ruolo', family: 'Famiglia', created: 'Creato', actions: 'Azioni', resetSessions: 'Reset sessioni', delete: 'Elimina', confirmDelete: 'Sei sicuro di voler eliminare questo utente?' },
    families: { title: 'Gestione Famiglie', search: 'Cerca famiglie...', name: 'Nome', members: 'Membri', plan: 'Piano', status: 'Stato', trialEnd: 'Fine trial', active: 'Attivo', inactive: 'Inattivo', deactivate: 'Disattiva' },
    trials: { title: 'Gestione Trial', family: 'Famiglia', startDate: 'Inizio', endDate: 'Fine', status: 'Stato', extend: 'Estendi', extendDays: 'Giorni da aggiungere', expired: 'Scaduto', active: 'Attivo' },
    donations: { title: 'Donazioni', family: 'Famiglia', amount: 'Importo', date: 'Data', status: 'Stato' },
    payments: { title: 'Impostazioni Pagamenti', freeDonation: 'Donazioni Libere', fixedPlans: 'Piani Fissi', subscriptions: 'Abbonamenti', enabled: 'Abilitato', minAmount: 'Importo Minimo', maxAmount: 'Importo Massimo', suggestedAmounts: 'Importi Suggeriti', currency: 'Valuta', saved: 'Impostazioni salvate', comingSoon: 'Prossimamente' },
    audit: { title: 'Audit Log', admin: 'Admin', action: 'Azione', target: 'Target', result: 'Risultato', ip: 'IP', date: 'Data' },
    ai: { title: 'Configurazione AI', model: 'Modello', maxTokens: 'Max Token', enabled: 'Abilitato', save: 'Salva', saved: 'Configurazione salvata' },
    logs: { title: 'Logs Applicazione', sessions: 'Sessioni', errors: 'Errori', sessionId: 'ID Sessione', userId: 'Utente', platform: 'Piattaforma', status: 'Stato', started: 'Avviata', ended: 'Terminata', code: 'Codice', severity: 'Severità', category: 'Categoria', message: 'Messaggio', component: 'Componente', resolved: 'Risolto', resolve: 'Risolvi', unresolved: 'Non Risolto', filter: 'Filtra', all: 'Tutti', info: 'Info', warning: 'Warning', error: 'Errore', critical: 'Critico', statsTitle: 'Statistiche Errori', totalErrors: 'Errori Totali', unresolvedErrors: 'Non Risolti', todayErrors: 'Errori Oggi', topCodes: 'Codici Frequenti' },
    common: { loading: 'Caricamento...', error: 'Errore', noData: 'Nessun dato', previous: 'Precedente', next: 'Successivo', save: 'Salva', cancel: 'Annulla', confirm: 'Conferma' },
    setup: { title: 'Setup Iniziale', desc: 'Crea il primo account Super Admin', displayName: 'Nome visualizzato', create: 'Crea Admin' }
  },
  en: {
    login: { title: 'Kinova Admin', email: 'Email', password: 'Password', submit: 'Login', error: 'Invalid credentials', rateLimit: 'Too many attempts. Retry in {min} minutes.' },
    nav: { dashboard: 'Dashboard', users: 'Users', families: 'Families', trials: 'Trials', donations: 'Donations', payments: 'Payments', logs: 'Logs', audit: 'Audit Log', ai: 'AI Config', logout: 'Logout' },
    dashboard: { title: 'Dashboard', totalUsers: 'Total Users', activeUsers: 'Active Users', totalFamilies: 'Total Families', activeFamilies: 'Active Families', activeTrials: 'Active Trials', expiredTrials: 'Expired Trials', totalDonations: 'Total Donations' },
    users: { title: 'User Management', search: 'Search users...', email: 'Email', name: 'Name', role: 'Role', family: 'Family', created: 'Created', actions: 'Actions', resetSessions: 'Reset sessions', delete: 'Delete', confirmDelete: 'Are you sure you want to delete this user?' },
    families: { title: 'Family Management', search: 'Search families...', name: 'Name', members: 'Members', plan: 'Plan', status: 'Status', trialEnd: 'Trial End', active: 'Active', inactive: 'Inactive', deactivate: 'Deactivate' },
    trials: { title: 'Trial Management', family: 'Family', startDate: 'Start', endDate: 'End', status: 'Status', extend: 'Extend', extendDays: 'Days to add', expired: 'Expired', active: 'Active' },
    donations: { title: 'Donations', family: 'Family', amount: 'Amount', date: 'Date', status: 'Status' },
    payments: { title: 'Payment Settings', freeDonation: 'Free Donations', fixedPlans: 'Fixed Plans', subscriptions: 'Subscriptions', enabled: 'Enabled', minAmount: 'Minimum Amount', maxAmount: 'Maximum Amount', suggestedAmounts: 'Suggested Amounts', currency: 'Currency', saved: 'Settings saved', comingSoon: 'Coming Soon' },
    audit: { title: 'Audit Log', admin: 'Admin', action: 'Action', target: 'Target', result: 'Result', ip: 'IP', date: 'Date' },
    ai: { title: 'AI Configuration', model: 'Model', maxTokens: 'Max Tokens', enabled: 'Enabled', save: 'Save', saved: 'Configuration saved' },
    logs: { title: 'Application Logs', sessions: 'Sessions', errors: 'Errors', sessionId: 'Session ID', userId: 'User', platform: 'Platform', status: 'Status', started: 'Started', ended: 'Ended', code: 'Code', severity: 'Severity', category: 'Category', message: 'Message', component: 'Component', resolved: 'Resolved', resolve: 'Resolve', unresolved: 'Unresolved', filter: 'Filter', all: 'All', info: 'Info', warning: 'Warning', error: 'Error', critical: 'Critical', statsTitle: 'Error Statistics', totalErrors: 'Total Errors', unresolvedErrors: 'Unresolved', todayErrors: 'Errors Today', topCodes: 'Top Codes' },
    common: { loading: 'Loading...', error: 'Error', noData: 'No data', previous: 'Previous', next: 'Next', save: 'Save', cancel: 'Cancel', confirm: 'Confirm' },
    setup: { title: 'Initial Setup', desc: 'Create the first Super Admin account', displayName: 'Display name', create: 'Create Admin' }
  }
};

const getLang = () => navigator.language.startsWith('it') ? 'it' : 'en';
const t = (key) => {
  const lang = getLang();
  const keys = key.split('.');
  let val = T[lang];
  for (const k of keys) val = val?.[k];
  return val || key;
};

const api = {
  token: localStorage.getItem('admin_token'),
  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`/api/admin${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  patch: (path, body) => api.request('PATCH', path, body),
  delete: (path) => api.request('DELETE', path),
  setToken(token) { this.token = token; localStorage.setItem('admin_token', token); },
  clearToken() { this.token = null; localStorage.removeItem('admin_token'); }
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '1rem' },
  card: { background: 'var(--bg-card)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  stat: { textAlign: 'center', padding: '1rem' },
  statValue: { fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' },
  statLabel: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid var(--border)', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.875rem' },
  td: { padding: '0.75rem', borderBottom: '1px solid var(--border)' },
  btn: { padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' },
  btnPrimary: { background: 'var(--primary)', color: 'white' },
  btnDanger: { background: 'var(--danger)', color: 'white' },
  btnSecondary: { background: 'var(--border)', color: 'var(--text)' },
  input: { width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '1rem', background: 'var(--bg-card)', color: 'var(--text)' },
  nav: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px' },
  navItem: { padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' },
  navActive: { background: 'var(--primary)', color: 'white' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 'bold' },
  badge: { padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' },
  badgeSuccess: { background: '#dcfce7', color: '#166534' },
  badgeDanger: { background: '#fee2e2', color: '#991b1b' },
  badgeWarning: { background: '#fef3c7', color: '#92400e' },
  loginBox: { maxWidth: '400px', margin: '4rem auto', padding: '2rem' },
  logo: { textAlign: 'center', marginBottom: '2rem' },
  logoText: { fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500' },
  error: { color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.875rem' },
  langSwitch: { position: 'absolute', top: '1rem', right: '1rem', cursor: 'pointer' }
};

function Stat({ value, label }) {
  return h('div', { style: styles.stat },
    h('div', { style: styles.statValue }, value ?? '-'),
    h('div', { style: styles.statLabel }, label)
  );
}

function Badge({ type, children }) {
  const badgeStyle = type === 'success' ? styles.badgeSuccess : type === 'danger' ? styles.badgeDanger : styles.badgeWarning;
  return h('span', { style: { ...styles.badge, ...badgeStyle } }, children);
}

function Button({ onClick, variant = 'primary', disabled, children, style }) {
  const variantStyle = variant === 'danger' ? styles.btnDanger : variant === 'secondary' ? styles.btnSecondary : styles.btnPrimary;
  return h('button', { 
    onClick, 
    disabled, 
    style: { ...styles.btn, ...variantStyle, opacity: disabled ? 0.5 : 1, ...style } 
  }, children);
}

function Input({ value, onChange, type = 'text', placeholder, style }) {
  return h('input', { 
    type, 
    value, 
    onChange: e => onChange(e.target.value), 
    placeholder, 
    style: { ...styles.input, ...style } 
  });
}

function Table({ columns, data, renderRow }) {
  return h('div', { style: { overflowX: 'auto' } },
    h('table', { style: styles.table },
      h('thead', null,
        h('tr', null, columns.map((col, i) => h('th', { key: i, style: styles.th }, col)))
      ),
      h('tbody', null,
        data.length === 0
          ? h('tr', null, h('td', { colSpan: columns.length, style: { ...styles.td, textAlign: 'center', color: 'var(--text-muted)' } }, t('common.noData')))
          : data.map((item, i) => renderRow(item, i))
      )
    )
  );
}

function LoginScreen({ onLogin, needsSetup, onSetup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (needsSetup) {
        await api.post('/setup', { email, password, displayName });
        onSetup();
      } else {
        const data = await api.post('/auth/login', { email, password });
        api.setToken(data.token);
        onLogin(data.admin);
      }
    } catch (err) {
      if (err.error?.code === 'RATE_LIMITED') {
        setError(t('login.rateLimit').replace('{min}', err.error.retryAfterMinutes));
      } else {
        setError(t('login.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return h('div', { style: styles.loginBox },
    h('div', { style: styles.logo },
      h('div', { style: styles.logoText }, needsSetup ? t('setup.title') : t('login.title')),
      needsSetup && h('p', { style: { color: 'var(--text-muted)', marginTop: '0.5rem' } }, t('setup.desc'))
    ),
    h('form', { onSubmit: handleSubmit, style: styles.card },
      needsSetup && h('div', { style: styles.formGroup },
        h('label', { style: styles.label }, t('setup.displayName')),
        h(Input, { value: displayName, onChange: setDisplayName, placeholder: t('setup.displayName') })
      ),
      h('div', { style: styles.formGroup },
        h('label', { style: styles.label }, t('login.email')),
        h(Input, { type: 'email', value: email, onChange: setEmail, placeholder: t('login.email') })
      ),
      h('div', { style: styles.formGroup },
        h('label', { style: styles.label }, t('login.password')),
        h(Input, { type: 'password', value: password, onChange: setPassword, placeholder: t('login.password') })
      ),
      error && h('div', { style: styles.error }, error),
      h(Button, { 
        type: 'submit', 
        disabled: loading, 
        style: { width: '100%', marginTop: '1rem' } 
      }, loading ? t('common.loading') : (needsSetup ? t('setup.create') : t('login.submit')))
    )
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading'));

  return h('div', null,
    h('h2', { style: styles.title }, t('dashboard.title')),
    h('div', { style: { ...styles.card, ...styles.grid } },
      h(Stat, { value: stats?.totalUsers, label: t('dashboard.totalUsers') }),
      h(Stat, { value: stats?.activeUsers, label: t('dashboard.activeUsers') }),
      h(Stat, { value: stats?.totalFamilies, label: t('dashboard.totalFamilies') }),
      h(Stat, { value: stats?.activeFamilies, label: t('dashboard.activeFamilies') }),
      h(Stat, { value: stats?.activeTrials, label: t('dashboard.activeTrials') }),
      h(Stat, { value: stats?.expiredTrials, label: t('dashboard.expiredTrials') }),
      h(Stat, { value: stats?.totalDonations ? `€${stats.totalDonations}` : '€0', label: t('dashboard.totalDonations') })
    )
  );
}

function Users({ role }) {
  const [users, setUsers] = useState({ data: [], total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleResetSessions = async (userId) => {
    await api.post(`/users/${userId}/reset-sessions`);
    load();
  };

  const handleDelete = async (userId) => {
    if (confirm(t('users.confirmDelete'))) {
      await api.delete(`/users/${userId}`);
      load();
    }
  };

  const canModify = role === 'super_admin' || role === 'support_admin';

  return h('div', null,
    h('div', { style: styles.header },
      h('h2', { style: styles.title }, t('users.title')),
      h(Input, { value: search, onChange: s => { setSearch(s); setPage(1); }, placeholder: t('users.search'), style: { width: '250px' } })
    ),
    h('div', { style: styles.card },
      loading ? h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading')) :
      h(Table, {
        columns: [t('users.email'), t('users.name'), t('users.role'), t('users.created'), canModify && t('users.actions')].filter(Boolean),
        data: users.data,
        renderRow: (user) => h('tr', { key: user.id },
          h('td', { style: styles.td }, user.email),
          h('td', { style: styles.td }, user.displayName),
          h('td', { style: styles.td }, h(Badge, { type: user.role === 'admin' ? 'success' : 'warning' }, user.role)),
          h('td', { style: styles.td }, new Date(user.createdAt).toLocaleDateString()),
          canModify && h('td', { style: styles.td },
            h('div', { style: { display: 'flex', gap: '0.5rem' } },
              h(Button, { variant: 'secondary', onClick: () => handleResetSessions(user.id) }, t('users.resetSessions')),
              role === 'super_admin' && h(Button, { variant: 'danger', onClick: () => handleDelete(user.id) }, t('users.delete'))
            )
          )
        )
      })
    ),
    h('div', { style: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' } },
      h(Button, { variant: 'secondary', disabled: page === 1, onClick: () => setPage(p => p - 1) }, t('common.previous')),
      h('span', { style: { padding: '0.5rem' } }, `${page} / ${Math.ceil(users.total / 20) || 1}`),
      h(Button, { variant: 'secondary', disabled: page * 20 >= users.total, onClick: () => setPage(p => p + 1) }, t('common.next'))
    )
  );
}

function Families({ role }) {
  const [families, setFamilies] = useState({ data: [], total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/families?page=${page}&limit=20&search=${encodeURIComponent(search)}`)
      .then(setFamilies)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async (familyId) => {
    await api.post(`/families/${familyId}/deactivate`);
    load();
  };

  return h('div', null,
    h('div', { style: styles.header },
      h('h2', { style: styles.title }, t('families.title')),
      h(Input, { value: search, onChange: s => { setSearch(s); setPage(1); }, placeholder: t('families.search'), style: { width: '250px' } })
    ),
    h('div', { style: styles.card },
      loading ? h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading')) :
      h(Table, {
        columns: [t('families.name'), t('families.plan'), t('families.status'), t('families.trialEnd'), role === 'super_admin' && t('users.actions')].filter(Boolean),
        data: families.data,
        renderRow: (family) => h('tr', { key: family.id },
          h('td', { style: styles.td }, family.name),
          h('td', { style: styles.td }, h(Badge, { type: family.planType === 'premium' ? 'success' : 'warning' }, family.planType || 'trial')),
          h('td', { style: styles.td }, h(Badge, { type: family.isActive ? 'success' : 'danger' }, family.isActive ? t('families.active') : t('families.inactive'))),
          h('td', { style: styles.td }, family.trialEndDate ? new Date(family.trialEndDate).toLocaleDateString() : '-'),
          role === 'super_admin' && h('td', { style: styles.td },
            family.isActive && h(Button, { variant: 'danger', onClick: () => handleDeactivate(family.id) }, t('families.deactivate'))
          )
        )
      })
    ),
    h('div', { style: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' } },
      h(Button, { variant: 'secondary', disabled: page === 1, onClick: () => setPage(p => p - 1) }, t('common.previous')),
      h('span', { style: { padding: '0.5rem' } }, `${page} / ${Math.ceil(families.total / 20) || 1}`),
      h(Button, { variant: 'secondary', disabled: page * 20 >= families.total, onClick: () => setPage(p => p + 1) }, t('common.next'))
    )
  );
}

function Trials({ role }) {
  const [trials, setTrials] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [extendDays, setExtendDays] = useState({});

  useEffect(() => {
    api.get('/trials').then(setTrials).finally(() => setLoading(false));
  }, []);

  const handleExtend = async (familyId) => {
    const days = parseInt(extendDays[familyId]) || 30;
    await api.post(`/trials/${familyId}/extend`, { days });
    const data = await api.get('/trials');
    setTrials(data);
    setExtendDays(prev => ({ ...prev, [familyId]: '' }));
  };

  const canModify = role === 'super_admin' || role === 'support_admin';

  return h('div', null,
    h('h2', { style: styles.title }, t('trials.title')),
    h('div', { style: styles.card },
      loading ? h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading')) :
      h(Table, {
        columns: [t('trials.family'), t('trials.startDate'), t('trials.endDate'), t('trials.status'), canModify && t('trials.extend')].filter(Boolean),
        data: trials.data || [],
        renderRow: (trial) => {
          const isExpired = trial.trialEndDate && new Date(trial.trialEndDate) < new Date();
          return h('tr', { key: trial.id },
            h('td', { style: styles.td }, trial.name),
            h('td', { style: styles.td }, trial.trialStartDate ? new Date(trial.trialStartDate).toLocaleDateString() : '-'),
            h('td', { style: styles.td }, trial.trialEndDate ? new Date(trial.trialEndDate).toLocaleDateString() : '-'),
            h('td', { style: styles.td }, h(Badge, { type: isExpired ? 'danger' : 'success' }, isExpired ? t('trials.expired') : t('trials.active'))),
            canModify && h('td', { style: styles.td },
              h('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                h(Input, { 
                  type: 'number', 
                  value: extendDays[trial.id] || '', 
                  onChange: v => setExtendDays(prev => ({ ...prev, [trial.id]: v })),
                  placeholder: '30',
                  style: { width: '80px' }
                }),
                h(Button, { onClick: () => handleExtend(trial.id) }, t('trials.extend'))
              )
            )
          );
        }
      })
    )
  );
}

function Donations() {
  const [donations, setDonations] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations').then(setDonations).finally(() => setLoading(false));
  }, []);

  return h('div', null,
    h('h2', { style: styles.title }, t('donations.title')),
    h('div', { style: styles.card },
      loading ? h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading')) :
      h(Table, {
        columns: [t('donations.family'), t('donations.amount'), t('donations.date'), t('donations.status')],
        data: donations.data || [],
        renderRow: (donation) => h('tr', { key: donation.id },
          h('td', { style: styles.td }, donation.familyId),
          h('td', { style: styles.td }, `€${donation.amount}`),
          h('td', { style: styles.td }, new Date(donation.createdAt).toLocaleDateString()),
          h('td', { style: styles.td }, h(Badge, { type: donation.status === 'completed' ? 'success' : 'warning' }, donation.status))
        )
      })
    )
  );
}

function AuditLog() {
  const [logs, setLogs] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/audit?page=${page}&limit=50`).then(setLogs).finally(() => setLoading(false));
  }, [page]);

  return h('div', null,
    h('h2', { style: styles.title }, t('audit.title')),
    h('div', { style: styles.card },
      loading ? h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading')) :
      h(Table, {
        columns: [t('audit.action'), t('audit.target'), t('audit.result'), t('audit.ip'), t('audit.date')],
        data: logs.data || [],
        renderRow: (log) => h('tr', { key: log.id },
          h('td', { style: styles.td }, log.action),
          h('td', { style: styles.td }, log.targetType ? `${log.targetType}:${log.targetId?.slice(0, 8)}` : '-'),
          h('td', { style: styles.td }, h(Badge, { type: log.result === 'success' ? 'success' : 'danger' }, log.result)),
          h('td', { style: styles.td }, log.ipAddress || '-'),
          h('td', { style: styles.td }, new Date(log.createdAt).toLocaleString())
        )
      })
    ),
    h('div', { style: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' } },
      h(Button, { variant: 'secondary', disabled: page === 1, onClick: () => setPage(p => p - 1) }, t('common.previous')),
      h('span', { style: { padding: '0.5rem' } }, `${page} / ${Math.ceil(logs.total / 50) || 1}`),
      h(Button, { variant: 'secondary', disabled: page * 50 >= logs.total, onClick: () => setPage(p => p + 1) }, t('common.next'))
    )
  );
}

function AiConfig({ role }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (role === 'super_admin') {
      api.get('/ai/config').then(setConfig).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [role]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/ai/config', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'super_admin') {
    return h('div', { style: styles.card }, h('p', null, 'Access denied'));
  }

  if (loading) return h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading'));

  return h('div', null,
    h('h2', { style: styles.title }, t('ai.title')),
    h('div', { style: styles.card },
      config && h('div', null,
        h('div', { style: styles.formGroup },
          h('label', { style: styles.label }, t('ai.model')),
          h(Input, { value: config.model || '', onChange: v => setConfig(c => ({ ...c, model: v })) })
        ),
        h('div', { style: styles.formGroup },
          h('label', { style: styles.label }, t('ai.maxTokens')),
          h(Input, { type: 'number', value: config.maxTokens || '', onChange: v => setConfig(c => ({ ...c, maxTokens: parseInt(v) })) })
        ),
        h('div', { style: { ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' } },
          h('input', { 
            type: 'checkbox', 
            checked: config.isEnabled, 
            onChange: e => setConfig(c => ({ ...c, isEnabled: e.target.checked })),
            style: { width: '20px', height: '20px' }
          }),
          h('label', null, t('ai.enabled'))
        ),
        h('div', { style: { display: 'flex', gap: '1rem', alignItems: 'center' } },
          h(Button, { onClick: handleSave, disabled: saving }, saving ? t('common.loading') : t('ai.save')),
          saved && h('span', { style: { color: 'var(--success)' } }, t('ai.saved'))
        )
      )
    )
  );
}

function PaymentSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/payments/settings').then(data => {
      setSettings({
        ...data,
        freeDonationMinAmount: data.freeDonationMinAmount?.toString() || '1',
        freeDonationMaxAmount: data.freeDonationMaxAmount?.toString() || '500',
        freeDonationSuggestedAmounts: Array.isArray(data.freeDonationSuggestedAmounts) 
          ? data.freeDonationSuggestedAmounts.join(',') 
          : (data.freeDonationSuggestedAmounts || '5,10,25,50')
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const minAmount = parseInt(settings.freeDonationMinAmount, 10) || 1;
      const maxAmount = parseInt(settings.freeDonationMaxAmount, 10) || 500;
      const suggestedAmounts = settings.freeDonationSuggestedAmounts
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);
      
      if (minAmount <= 0 || maxAmount <= 0) {
        setError('Amounts must be positive numbers');
        return;
      }
      if (minAmount > maxAmount) {
        setError('Min amount cannot exceed max amount');
        return;
      }

      await api.patch('/payments/settings', {
        freeDonationEnabled: settings.freeDonationEnabled,
        freeDonationMinAmount: minAmount,
        freeDonationMaxAmount: maxAmount,
        freeDonationSuggestedAmounts: suggestedAmounts,
        fixedPlansEnabled: settings.fixedPlansEnabled,
        subscriptionsEnabled: settings.subscriptionsEnabled,
        currency: settings.currency
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading'));

  return h('div', null,
    h('h2', { style: styles.title }, t('payments.title')),
    
    h('div', { style: styles.card },
      h('h3', { style: { marginBottom: '1rem', color: 'var(--primary)' } }, t('payments.freeDonation')),
      h('div', { style: { ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' } },
        h('input', { 
          type: 'checkbox', 
          checked: settings?.freeDonationEnabled, 
          onChange: e => setSettings(s => ({ ...s, freeDonationEnabled: e.target.checked })),
          style: { width: '20px', height: '20px' }
        }),
        h('label', null, t('payments.enabled'))
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } },
        h('div', { style: styles.formGroup },
          h('label', { style: styles.label }, t('payments.minAmount')),
          h(Input, { type: 'number', value: settings?.freeDonationMinAmount || '', onChange: v => setSettings(s => ({ ...s, freeDonationMinAmount: v })) })
        ),
        h('div', { style: styles.formGroup },
          h('label', { style: styles.label }, t('payments.maxAmount')),
          h(Input, { type: 'number', value: settings?.freeDonationMaxAmount || '', onChange: v => setSettings(s => ({ ...s, freeDonationMaxAmount: v })) })
        )
      ),
      h('div', { style: styles.formGroup },
        h('label', { style: styles.label }, t('payments.suggestedAmounts') + ' (comma separated)'),
        h(Input, { value: settings?.freeDonationSuggestedAmounts || '', onChange: v => setSettings(s => ({ ...s, freeDonationSuggestedAmounts: v })) })
      ),
      h('div', { style: styles.formGroup },
        h('label', { style: styles.label }, t('payments.currency')),
        h(Input, { value: settings?.currency || 'EUR', onChange: v => setSettings(s => ({ ...s, currency: v })) })
      )
    ),

    h('div', { style: styles.card },
      h('h3', { style: { marginBottom: '1rem', color: 'var(--text-muted)' } }, t('payments.fixedPlans')),
      h('div', { style: { ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' } },
        h('input', { 
          type: 'checkbox', 
          checked: settings?.fixedPlansEnabled, 
          onChange: e => setSettings(s => ({ ...s, fixedPlansEnabled: e.target.checked })),
          style: { width: '20px', height: '20px' }
        }),
        h('label', null, t('payments.enabled'))
      ),
      h('p', { style: { color: 'var(--text-muted)', fontSize: '0.875rem' } }, t('payments.comingSoon'))
    ),

    h('div', { style: styles.card },
      h('h3', { style: { marginBottom: '1rem', color: 'var(--text-muted)' } }, t('payments.subscriptions')),
      h('div', { style: { ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' } },
        h('input', { 
          type: 'checkbox', 
          checked: settings?.subscriptionsEnabled, 
          onChange: e => setSettings(s => ({ ...s, subscriptionsEnabled: e.target.checked })),
          style: { width: '20px', height: '20px' }
        }),
        h('label', null, t('payments.enabled'))
      ),
      h('p', { style: { color: 'var(--text-muted)', fontSize: '0.875rem' } }, t('payments.comingSoon'))
    ),

    h('div', { style: { display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' } },
      h(Button, { onClick: handleSave, disabled: saving }, saving ? t('common.loading') : t('common.save')),
      saved && h('span', { style: { color: 'var(--success)' } }, t('payments.saved')),
      error && h('span', { style: styles.error }, error)
    )
  );
}

function Logs({ role }) {
  const [tab, setTab] = useState('errors');
  const [sessions, setSessions] = useState({ data: [], total: 0 });
  const [errors, setErrors] = useState({ data: [], total: 0 });
  const [errorStats, setErrorStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('all');

  const loadSessions = useCallback(() => {
    setLoading(true);
    api.get(`/logs/sessions?limit=30&offset=${(page - 1) * 30}`)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [page]);

  const loadErrors = useCallback(() => {
    setLoading(true);
    const params = [`limit=30`, `offset=${(page - 1) * 30}`];
    if (severityFilter !== 'all') params.push(`severity=${severityFilter}`);
    if (resolvedFilter !== 'all') params.push(`resolved=${resolvedFilter === 'resolved'}`);
    api.get(`/logs/errors?${params.join('&')}`)
      .then(setErrors)
      .finally(() => setLoading(false));
  }, [page, severityFilter, resolvedFilter]);

  const loadStats = () => {
    api.get('/logs/errors/stats').then(setErrorStats);
  };

  useEffect(() => {
    if (tab === 'sessions') loadSessions();
    else loadErrors();
    loadStats();
  }, [tab, loadSessions, loadErrors]);

  const handleResolve = async (errorId) => {
    await api.post(`/logs/errors/${errorId}/resolve`);
    loadErrors();
    loadStats();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const getSeverityBadge = (severity) => {
    const types = { info: 'success', warning: 'warning', error: 'danger', critical: 'danger' };
    return h(Badge, { type: types[severity] || 'warning' }, severity);
  };

  const getStatusBadge = (status) => {
    const types = { started: 'success', ended: 'warning', crashed: 'danger' };
    return h(Badge, { type: types[status] || 'warning' }, status);
  };

  const tabStyle = (active) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
    fontWeight: active ? '600' : '400',
    color: active ? 'var(--primary)' : 'var(--text-muted)'
  });

  const canResolve = role === 'super_admin' || role === 'support_admin';

  return h('div', null,
    h('h2', { style: styles.title }, t('logs.title')),
    
    errorStats && h('div', { style: { ...styles.card, ...styles.grid, marginBottom: '1.5rem' } },
      h(Stat, { value: errorStats.total || 0, label: t('logs.totalErrors') }),
      h(Stat, { value: errorStats.unresolved || 0, label: t('logs.unresolvedErrors') }),
      h(Stat, { value: errorStats.today || 0, label: t('logs.todayErrors') })
    ),

    h('div', { style: { display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem' } },
      h('div', { style: tabStyle(tab === 'errors'), onClick: () => { setTab('errors'); setPage(1); } }, t('logs.errors')),
      h('div', { style: tabStyle(tab === 'sessions'), onClick: () => { setTab('sessions'); setPage(1); } }, t('logs.sessions'))
    ),

    tab === 'errors' && h('div', { style: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' } },
      h('select', { 
        value: severityFilter, 
        onChange: e => { setSeverityFilter(e.target.value); setPage(1); },
        style: { ...styles.input, width: 'auto' }
      },
        h('option', { value: 'all' }, t('logs.severity') + ': ' + t('logs.all')),
        h('option', { value: 'info' }, t('logs.info')),
        h('option', { value: 'warning' }, t('logs.warning')),
        h('option', { value: 'error' }, t('logs.error')),
        h('option', { value: 'critical' }, t('logs.critical'))
      ),
      h('select', { 
        value: resolvedFilter, 
        onChange: e => { setResolvedFilter(e.target.value); setPage(1); },
        style: { ...styles.input, width: 'auto' }
      },
        h('option', { value: 'all' }, t('logs.resolved') + ': ' + t('logs.all')),
        h('option', { value: 'unresolved' }, t('logs.unresolved')),
        h('option', { value: 'resolved' }, t('logs.resolved'))
      )
    ),

    h('div', { style: styles.card },
      loading ? h('div', { style: { textAlign: 'center', padding: '2rem' } }, t('common.loading')) :
      tab === 'sessions' ? 
        h(Table, {
          columns: [t('logs.sessionId'), t('logs.userId'), t('logs.platform'), t('logs.status'), t('logs.started'), t('logs.ended')],
          data: sessions.data || [],
          renderRow: (session) => h('tr', { key: session.id },
            h('td', { style: { ...styles.td, fontFamily: 'monospace', fontSize: '0.75rem' } }, session.id?.slice(0, 8) + '...'),
            h('td', { style: styles.td }, session.userId?.slice(0, 8) || '-'),
            h('td', { style: styles.td }, session.platform || '-'),
            h('td', { style: styles.td }, getStatusBadge(session.status)),
            h('td', { style: styles.td }, formatDate(session.startedAt)),
            h('td', { style: styles.td }, formatDate(session.endedAt))
          )
        }) :
        h(Table, {
          columns: [t('logs.code'), t('logs.severity'), t('logs.message'), t('logs.component'), 'Date', canResolve ? t('logs.resolve') : t('logs.status')],
          data: errors.data || [],
          renderRow: (err) => h('tr', { key: err.id },
            h('td', { style: { ...styles.td, fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' } }, err.code),
            h('td', { style: styles.td }, getSeverityBadge(err.severity)),
            h('td', { style: { ...styles.td, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' } }, err.message),
            h('td', { style: styles.td }, err.component || '-'),
            h('td', { style: styles.td }, formatDate(err.createdAt)),
            h('td', { style: styles.td }, 
              err.resolved ? 
                h(Badge, { type: 'success' }, t('logs.resolved')) :
                canResolve ? 
                  h(Button, { onClick: () => handleResolve(err.id), variant: 'secondary', style: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' } }, t('logs.resolve')) :
                  h(Badge, { type: 'danger' }, t('logs.unresolved'))
            )
          )
        }),
      
      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '1rem' } },
        h(Button, { 
          onClick: () => setPage(p => Math.max(1, p - 1)), 
          disabled: page === 1,
          variant: 'secondary'
        }, t('common.previous')),
        h('span', { style: { color: 'var(--text-muted)' } }, `${t('logs.filter')}: ${page}`),
        h(Button, { 
          onClick: () => setPage(p => p + 1), 
          disabled: (tab === 'sessions' ? sessions.data : errors.data).length < 30,
          variant: 'secondary'
        }, t('common.next'))
      )
    )
  );
}

function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (api.token) {
      api.get('/auth/me')
        .then(setAdmin)
        .catch(() => {
          api.clearToken();
          checkSetup();
        })
        .finally(() => setLoading(false));
    } else {
      checkSetup();
    }
  }, []);

  const checkSetup = async () => {
    try {
      await api.post('/setup', {});
    } catch (err) {
      if (err.status === 403) {
        setNeedsSetup(false);
      } else if (err.status === 400) {
        setNeedsSetup(true);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    api.clearToken();
    setAdmin(null);
  };

  if (loading) {
    return h('div', { className: 'loading' },
      h('div', { className: 'spinner' }),
      h('p', null, t('common.loading'))
    );
  }

  if (!admin) {
    return h(LoginScreen, { 
      onLogin: setAdmin, 
      needsSetup,
      onSetup: () => setNeedsSetup(false)
    });
  }

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard') },
    { id: 'users', label: t('nav.users') },
    { id: 'families', label: t('nav.families') },
    { id: 'trials', label: t('nav.trials') },
    { id: 'donations', label: t('nav.donations') },
    admin.role === 'super_admin' && { id: 'payments', label: t('nav.payments') },
    { id: 'logs', label: t('nav.logs') },
    { id: 'audit', label: t('nav.audit') },
    admin.role === 'super_admin' && { id: 'ai', label: t('nav.ai') }
  ].filter(Boolean);

  return h('div', { style: styles.container },
    h('div', { style: styles.nav },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '1rem', marginRight: 'auto' } },
        h('span', { style: { fontWeight: 'bold', color: 'var(--primary)' } }, 'Kinova Admin'),
        h('span', { style: { color: 'var(--text-muted)', fontSize: '0.875rem' } }, admin.displayName)
      ),
      navItems.map(item => 
        h('div', { 
          key: item.id, 
          style: { ...styles.navItem, ...(view === item.id ? styles.navActive : {}) },
          onClick: () => setView(item.id)
        }, item.label)
      ),
      h('div', { style: { ...styles.navItem, marginLeft: 'auto' }, onClick: handleLogout }, t('nav.logout'))
    ),
    view === 'dashboard' && h(Dashboard),
    view === 'users' && h(Users, { role: admin.role }),
    view === 'families' && h(Families, { role: admin.role }),
    view === 'trials' && h(Trials, { role: admin.role }),
    view === 'donations' && h(Donations),
    view === 'payments' && h(PaymentSettings),
    view === 'logs' && h(Logs, { role: admin.role }),
    view === 'audit' && h(AuditLog),
    view === 'ai' && h(AiConfig, { role: admin.role })
  );
}

const script1 = document.createElement('script');
script1.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
script1.crossOrigin = '';
script1.onload = () => {
  const script2 = document.createElement('script');
  script2.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
  script2.crossOrigin = '';
  script2.onload = () => {
    createRoot(document.getElementById('root')).render(h(AdminApp));
  };
  document.head.appendChild(script2);
};
document.head.appendChild(script1);
