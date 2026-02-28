/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Investment Background ────────────────────────────────────
// Four layered animations:
//   1. Drifting radial gold orbs
//   2. Faint candlestick chart (bottom-left)
//   3. Self-drawing equity curve with glowing dot (loops)
//   4. Floating % price-change tags rising upward
//   5. Subtle chart grid lines (right panel)
function InvestmentBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // ─ Types ────────────────────────────────────────────────
    interface Candle {
      x: number; open: number; close: number;
      hi: number; lo: number; up: boolean; cw: number;
    }
    interface PriceTag {
      x: number; y: number; speed: number;
      label: string; up: boolean; life: number; maxLife: number;
    }

    let W = 0, H = 0;
    let candles: Candle[] = [];
    let tags: PriceTag[] = [];

    const TAG_LABELS = [
      '+2.4%', '+0.8%', '+3.1%', '-0.9%', '+1.2%',
      '+4.5%', '-1.3%', '+0.6%', '+5.2%', '-0.4%',
      '+2.9%', '+1.8%', '-2.1%', '+0.3%', '+3.7%',
    ];

    // ─ Candles ──────────────────────────────────────────────
    function buildCandles() {
      candles = [];
      const count = 32, cw = 16, gap = 5;
      const startX = W * 0.02;
      const baseY = H * 0.80;
      const range = H * 0.20;
      let price = 0.40;
      for (let i = 0; i < count; i++) {
        price = Math.max(0.08, Math.min(0.92, price + (Math.random() - 0.44) * 0.055));
        const open = price;
        const close = Math.max(0.06, Math.min(0.94, price + (Math.random() - 0.44) * 0.035));
        const hi = Math.max(open, close) + Math.random() * 0.022;
        const lo = Math.min(open, close) - Math.random() * 0.022;
        candles.push({
          x: startX + i * (cw + gap),
          open: baseY - open * range,
          close: baseY - close * range,
          hi: baseY - hi * range,
          lo: baseY - lo * range,
          up: close >= open, cw,
        });
      }
    }

    // ─ Price tags ───────────────────────────────────────────
    function resetTag(p: PriceTag) {
      const idx = Math.floor(Math.random() * TAG_LABELS.length);
      p.label = TAG_LABELS[idx];
      p.up = p.label.startsWith('+');
      p.x = W * 0.03 + Math.random() * W * 0.34;
      p.y = H * 0.82 + Math.random() * H * 0.08;
      p.speed = 0.18 + Math.random() * 0.22;
      p.maxLife = 120 + Math.floor(Math.random() * 200);
      p.life = p.maxLife;
    }
    function buildTags() {
      tags = [];
      for (let i = 0; i < 12; i++) {
        const p = {} as PriceTag;
        resetTag(p);
        p.y -= Math.random() * H * 0.55; // stagger vertically
        tags.push(p);
      }
    }

    // ─ Resize ───────────────────────────────────────────────
    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      buildCandles();
      buildTags();
    }
    resize();
    window.addEventListener('resize', resize);

    // ─ Equity curve points (normalised 0→1) ─────────────────
    const CURVE: [number, number][] = [
      [0.00, 0.88], [0.05, 0.84], [0.10, 0.80], [0.15, 0.77], [0.20, 0.73],
      [0.25, 0.69], [0.30, 0.64], [0.34, 0.59], [0.38, 0.54], [0.42, 0.49],
      [0.46, 0.45], [0.50, 0.41], [0.54, 0.37], [0.58, 0.34], [0.62, 0.31],
      [0.66, 0.28], [0.70, 0.26], [0.74, 0.24], [0.78, 0.22], [0.82, 0.21],
      [0.86, 0.20], [0.90, 0.19], [0.95, 0.19], [1.00, 0.19],
    ];
    const CYCLE = 700; // frames for one full trace

    // ─ Orb config ───────────────────────────────────────────
    const ORBS = [
      { rx: 0.14, ry: 0.28, r: 520, a: 0.05, sp: 0.00030, ph: 0 },
      { rx: 0.80, ry: 0.65, r: 440, a: 0.033, sp: 0.00038, ph: 1.2 },
      { rx: 0.50, ry: 0.92, r: 360, a: 0.025, sp: 0.00022, ph: 2.5 },
    ];

    // ─ Draw ─────────────────────────────────────────────────
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // 1 – Orbs
      ORBS.forEach(o => {
        const ox = W * o.rx + Math.sin(t * o.sp + o.ph) * 70;
        const oy = H * o.ry + Math.cos(t * o.sp * 0.8 + o.ph) * 50;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r);
        g.addColorStop(0, `rgba(197,164,84,${o.a})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      // 2 – Grid lines (right panel)
      const gridX = W * 0.34;
      for (let i = 1; i <= 6; i++) {
        const gy = H * 0.15 + (H * 0.72 / 6) * i;
        const a = 0.10 + 0.04 * Math.sin(t * 0.008 + i * 0.7);
        ctx.strokeStyle = `rgba(30,44,72,${a})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(gridX, gy); ctx.lineTo(W * 0.98, gy); ctx.stroke();
        // ghost % labels
        ctx.fillStyle = `rgba(61,75,107,${a * 0.55})`;
        ctx.font = '8px Space Mono, monospace';
        ctx.fillText(`${(6 - i) * 20}%`, gridX - 30, gy + 3);
      }
      // vertical axis
      ctx.strokeStyle = 'rgba(30,44,72,0.18)';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(gridX, H * 0.14); ctx.lineTo(gridX, H * 0.90); ctx.stroke();

      // 3 – Candles
      const cAlpha = 0.12 + 0.04 * Math.sin(t * 0.005);
      candles.forEach(c => {
        const bodyTop = Math.min(c.open, c.close);
        const bodyH = Math.max(2, Math.abs(c.close - c.open));
        const col = c.up
          ? `rgba(34,197,94,${cAlpha})`
          : `rgba(239,68,68,${cAlpha * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(c.x + c.cw / 2, c.hi);
        ctx.lineTo(c.x + c.cw / 2, c.lo);
        ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(c.x, bodyTop, c.cw, bodyH, 2);
        ctx.fill();
      });

      // 4 – Equity curve (left panel, 0 → W*0.38)
      const progress = (t % CYCLE) / CYCLE;
      const N = CURVE.length;
      const drawUpTo = progress * (N - 1);
      const fullIdx = Math.floor(drawUpTo);
      const frac = drawUpTo - fullIdx;

      const CX = W * 0.01, CW = W * 0.37;
      const CY = H * 0.15, CH = H * 0.65;

      const cpx = (i: number) => CX + CURVE[i][0] * CW;
      const cpy = (i: number) => CY + CURVE[i][1] * CH;

      if (fullIdx >= 1) {
        const curX = fullIdx < N - 1
          ? cpx(fullIdx) + (cpx(fullIdx + 1) - cpx(fullIdx)) * frac
          : cpx(N - 1);
        const curY = fullIdx < N - 1
          ? cpy(fullIdx) + (cpy(fullIdx + 1) - cpy(fullIdx)) * frac
          : cpy(N - 1);

        ctx.save();

        // fill under curve
        ctx.beginPath();
        ctx.moveTo(cpx(0), cpy(0));
        for (let i = 1; i <= fullIdx && i < N; i++) {
          const mx = (cpx(i - 1) + cpx(i)) / 2;
          ctx.bezierCurveTo(mx, cpy(i - 1), mx, cpy(i), cpx(i), cpy(i));
        }
        if (fullIdx < N - 1) ctx.lineTo(curX, curY);
        ctx.lineTo(curX, H * 0.90);
        ctx.lineTo(cpx(0), H * 0.90);
        ctx.closePath();
        const fillG = ctx.createLinearGradient(0, CY, 0, H * 0.90);
        fillG.addColorStop(0, 'rgba(197,164,84,0.08)');
        fillG.addColorStop(1, 'rgba(197,164,84,0)');
        ctx.fillStyle = fillG;
        ctx.fill();

        // stroke
        ctx.beginPath();
        ctx.moveTo(cpx(0), cpy(0));
        for (let i = 1; i <= fullIdx && i < N; i++) {
          const mx = (cpx(i - 1) + cpx(i)) / 2;
          ctx.bezierCurveTo(mx, cpy(i - 1), mx, cpy(i), cpx(i), cpy(i));
        }
        if (fullIdx < N - 1) ctx.lineTo(curX, curY);
        const lineG = ctx.createLinearGradient(CX, 0, CX + CW, 0);
        lineG.addColorStop(0, 'rgba(197,164,84,0.15)');
        lineG.addColorStop(0.5, 'rgba(212,185,106,0.38)');
        lineG.addColorStop(1, 'rgba(240,208,128,0.20)');
        ctx.strokeStyle = lineG;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // pulsing leading dot
        const pulse = 0.4 + 0.4 * Math.sin(t * 0.09);
        const dotGrad = ctx.createRadialGradient(curX, curY, 0, curX, curY, 16);
        dotGrad.addColorStop(0, `rgba(197,164,84,${pulse * 0.65})`);
        dotGrad.addColorStop(1, 'rgba(197,164,84,0)');
        ctx.fillStyle = dotGrad;
        ctx.beginPath(); ctx.arc(curX, curY, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(220,190,110,${0.7 + pulse * 0.3})`;
        ctx.beginPath(); ctx.arc(curX, curY, 2.8, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
      }

      // 5 – Floating price tags
      ctx.save();
      ctx.font = '9px "Space Mono", monospace';
      tags.forEach(p => {
        p.y -= p.speed;
        p.life -= 1;
        if (p.life <= 0) resetTag(p);
        const a = Math.min(1, p.life / 50) * 0.20;
        ctx.fillStyle = p.up
          ? `rgba(34,197,94,${a})`
          : `rgba(239,68,68,${a})`;
        ctx.fillText(p.label, p.x, p.y);
      });
      ctx.restore();

      t++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'var(--bg)' }}
    />
  );
}

// ── Ticker ─────────────────────────────────────────────────
const MARQUEE = [
  { sym: 'SPX', val: '5,431.2', chg: '+0.62%', up: true },
  { sym: 'NIFTY', val: '22,147', chg: '+0.84%', up: true },
  { sym: 'SENSEX', val: '73,088', chg: '+0.71%', up: true },
  { sym: 'BTC', val: '68,440', chg: '+4.21%', up: true },
  { sym: 'GOLD', val: '$2,318', chg: '+0.33%', up: true },
  { sym: 'NVDA', val: '879.44', chg: '+3.12%', up: true },
  { sym: 'TSLA', val: '188.74', chg: '-1.67%', up: false },
  { sym: 'GOOGL', val: '175.38', chg: '-0.43%', up: false },
  { sym: 'JPM', val: '229.14', chg: '+0.92%', up: true },
  { sym: 'GS', val: '534.20', chg: '-0.55%', up: false },
  { sym: 'WTI', val: '78.42', chg: '+1.14%', up: true },
  { sym: 'EUR/USD', val: '1.0821', chg: '-0.22%', up: false },
];

// ── Mini sparkline SVG ───────────────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  const pts = up
    ? '0,14 8,12 16,10 24,11 32,7 40,8 48,4 56,6 64,2'
    : '0,2 8,4 16,6 24,5 32,9 40,7 48,11 56,10 64,14';
  return (
    <svg width="64" height="16" viewBox="0 0 64 16" fill="none">
      <polyline points={pts} stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
    </svg>
  );
}

// ── Main ────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    if (isAuthenticated) { navigate('/'); }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 'email') { setStep('password'); return; }
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Authentication failed');
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <style>{CSS}</style>
      <InvestmentBackground />

      {/* TICKER */}
      <div className="mc-ticker">
        <div className="mc-ticker-fade mc-ticker-fade-l" />
        <div className="mc-ticker-fade mc-ticker-fade-r" />
        <div className="mc-ticker-inner">
          <div className="mc-ticker-track">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((item, i) => (
              <span key={i} className="mc-tick-item">
                <span className="mc-tick-sym">{item.sym}</span>
                <span className="mc-tick-val">{item.val}</span>
                <span className={`mc-tick-chg ${item.up ? 'up' : 'dn'}`}>
                  {item.up ? '▲' : '▼'} {item.chg}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ROOT */}
      <div className={`mc-root ${mounted ? 'mounted' : ''}`}>

        {/* LEFT */}
        <div className="mc-left">

          {/* Brand */}
          <div className="mc-brand anim-1">
            <div className="mc-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 17L9 11L13 15L21 7" stroke="#C5A454" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 7H21V11" stroke="#C5A454" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="mc-brand-name">MERIDIAN</div>
              <div className="mc-brand-sub">CAPITAL PARTNERS</div>
            </div>
          </div>

          {/* Divider */}
          <div className="mc-brand-line anim-2" />

          {/* Hero copy */}
          <div className="mc-hero anim-3">
            <div className="mc-pill">
              <span className="mc-pill-dot" />
              Private Investment Intelligence
            </div>
            <h1 className="mc-headline">
              One view.<br />
              <span className="mc-headline-gold">Total clarity.</span>
            </h1>
            <p className="mc-desc">
              Track valuations, monitor runway, and measure returns
              across your entire portfolio in real time.
            </p>
          </div>

          {/* Stats */}
          <div className="mc-stats anim-4">
            {[
              { v: '₹284 Cr', l: 'Deployed Capital', trend: true },
              { v: '4.2×', l: 'Average MOIC', trend: true },
              { v: '38%', l: 'Net IRR', trend: true },
              { v: '16', l: 'Portfolio Companies', trend: false },
            ].map((s, i) => (
              <div key={i} className="mc-stat" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
                <div className="mc-stat-top">
                  <span className="mc-stat-val">{s.v}</span>
                  {s.trend && <Sparkline up={true} />}
                </div>
                <div className="mc-stat-lbl">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Client logos / trust bar */}
          <div className="mc-trust anim-5">
            <span className="mc-trust-label">Trusted by leading GPs & Family Offices</span>
            <div className="mc-trust-dots">
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} className="mc-trust-dot" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="mc-right">
          <div className="mc-card anim-card">

            {/* Card top bar */}
            <div className="mc-card-topbar">
              <div className="mc-steps">
                <div className={`mc-step ${step === 'email' ? 'active' : 'done'}`}>
                  {step === 'password' ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : '1'}
                </div>
                <div className="mc-step-connector" />
                <div className={`mc-step ${step === 'password' ? 'active' : ''}`}>2</div>
                <span className="mc-step-label">
                  {step === 'email' ? 'Identify' : 'Authenticate'}
                </span>
              </div>
              <div className="mc-ssl">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                256-bit SSL
              </div>
            </div>

            {/* Headline */}
            <div className="mc-form-head">
              <h2 className="mc-form-title">
                {step === 'email' ? <>Sign in to your<br /><span className="mc-form-title-gold">portfolio.</span></> : <>Verify your<br /><span className="mc-form-title-gold">identity.</span></>}
              </h2>
              <p className="mc-form-sub">
                {step === 'email'
                  ? 'Authorized access only. All activity is logged.'
                  : <span>Continuing as <strong>{email}</strong></span>}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mc-form">
              {step === 'email' ? (
                <div className="mc-field">
                  <label className="mc-label">Email Address</label>
                  <div className="mc-input-wrap">
                    <svg className="mc-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      type="email" className="mc-input" placeholder="partner@fund.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      required autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div className="mc-field">
                  <div className="mc-label-row">
                    <label className="mc-label">Password</label>
                    <a href="#" className="mc-forgot">Forgot password?</a>
                  </div>
                  <div className="mc-input-wrap">
                    <svg className="mc-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'} className="mc-input mc-input-pw"
                      placeholder="Enter your passphrase"
                      value={password} onChange={e => setPassword(e.target.value)}
                      required autoFocus
                    />
                    <button type="button" className="mc-eye" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="mc-submit" disabled={isLoading}>
                {isLoading
                  ? <span className="mc-loading"><span className="mc-spinner" /> Authenticating…</span>
                  : <span className="mc-btn-inner">
                    {step === 'email' ? 'Continue' : 'Open Portfolio'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>}
              </button>
            </form>

            {step === 'password' && (
              <button className="mc-back" onClick={() => setStep('email')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Use different email
              </button>
            )}

            {/* Divider */}
            <div className="mc-divider"><div className="mc-div-line" /><span>or continue with</span><div className="mc-div-line" /></div>

            {/* SSO */}
            <div className="mc-sso">
              <button className="mc-sso-btn">
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google Workspace
              </button>
              <button className="mc-sso-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#0072C6">
                  <path d="M21.4 0H2.6C1.2 0 0 1.2 0 2.6v18.8C0 22.8 1.2 24 2.6 24h18.8c1.4 0 2.6-1.2 2.6-2.6V2.6C24 1.2 22.8 0 21.4 0zM7.1 20.5H3.7V9h3.4v11.5zm-1.7-13C4.3 7.5 3.4 6.6 3.4 5.5s.9-2 2-2 2 .9 2 2-.9 2-2 2zm15.1 13h-3.4v-5.6c0-1.3 0-3-1.8-3s-2.1 1.5-2.1 3v5.6H9.8V9h3.3v1.6h.1c.5-.9 1.6-1.8 3.3-1.8 3.5 0 4.1 2.3 4.1 5.3v6.4z" />
                </svg>
                Microsoft Azure
              </button>
            </div>

            {/* Badges */}
            <div className="mc-badges">
              {['SOC 2 Type II', 'AES-256', 'SEBI Compliant', '2FA Required'].map(b => (
                <span key={b} className="mc-badge">{b}</span>
              ))}
            </div>

            <p className="mc-access">Don't have access? <a href="#">Request credentials →</a></p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mc-footer">
        <span>© 2026 Meridian Capital Partners LLP. All rights reserved.</span>
        <div className="mc-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Use</a>
          <a href="#">Security</a>
          <a href="#">Support</a>
        </div>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

:root {
  --bg:        #080E1C;
  --bg2:       #0C1424;
  --bg3:       #111B2E;
  --bg4:       #162038;
  --gold:      #C5A454;
  --gold-lt:   #D4B96A;
  --gold-dim:  rgba(197,164,84,0.08);
  --gold-bdr:  rgba(197,164,84,0.16);
  --gold-glow: rgba(197,164,84,0.22);
  --green:     #22c55e;
  --red:       #ef4444;
  --text:      #E8DECA;
  --text-2:    #8A91A8;
  --text-3:    #3D4B6B;
  --border:    #1E2C48;
  --ff:        'Outfit', sans-serif;
  --fm:        'Space Mono', monospace;
}

/* ── TICKER ── */
.mc-ticker {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: 34px; background: rgba(8,14,28,0.97);
  border-bottom: 1px solid var(--border);
  overflow: hidden; display: flex; align-items: center;
}
.mc-ticker-fade {
  position: absolute; top: 0; bottom: 0; width: 100px; z-index: 2; pointer-events: none;
}
.mc-ticker-fade-l { left: 0; background: linear-gradient(to right, var(--bg), transparent); }
.mc-ticker-fade-r { right: 0; background: linear-gradient(to left, var(--bg), transparent); }
.mc-ticker-inner { overflow: hidden; flex: 1; }
.mc-ticker-track {
  display: flex; align-items: center;
  animation: mc-scroll 40s linear infinite; white-space: nowrap;
}
@keyframes mc-scroll { 0%{ transform:translateX(0); } 100%{ transform:translateX(-33.333%); } }
.mc-tick-item {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0 24px; border-right: 1px solid var(--border);
  font-family: var(--fm); font-size: 9.5px;
}
.mc-tick-sym { color: var(--text-2); font-weight: 700; letter-spacing: 0.1em; }
.mc-tick-val { color: var(--text); }
.mc-tick-chg { font-weight: 700; letter-spacing: 0.06em; }
.mc-tick-chg.up { color: var(--green); }
.mc-tick-chg.dn { color: var(--red); }

/* ── ROOT ── */
.mc-root {
  min-height: 100vh;
  padding: 34px 0 44px;
  background: transparent;
  display: flex;
  font-family: var(--ff);
  position: relative;
  z-index: 10;
  overflow: hidden;
}

/* ── ANIMATIONS ── */
.mc-root .anim-1,
.mc-root .anim-2,
.mc-root .anim-3,
.mc-root .anim-4,
.mc-root .anim-5,
.mc-root .anim-card {
  opacity: 0; transform: translateY(20px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.mc-root.mounted .anim-1 { opacity: 1; transform: none; transition-delay: 0.05s; }
.mc-root.mounted .anim-2 { opacity: 1; transform: none; transition-delay: 0.12s; }
.mc-root.mounted .anim-3 { opacity: 1; transform: none; transition-delay: 0.2s; }
.mc-root.mounted .anim-4 { opacity: 1; transform: none; transition-delay: 0.3s; }
.mc-root.mounted .anim-5 { opacity: 1; transform: none; transition-delay: 0.42s; }
.mc-root.mounted .anim-card { opacity: 1; transform: none; transition-delay: 0.1s; }

/* ── LEFT ── */
.mc-left {
  flex: 1.15;
  display: flex; flex-direction: column; justify-content: center;
  padding: 48px 64px;
  position: relative; z-index: 5;
}

/* Brand */
.mc-brand {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 32px;
}
.mc-logo {
  width: 42px; height: 42px;
  background: var(--gold-dim);
  border: 1px solid var(--gold-bdr);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 20px rgba(197,164,84,0.1);
}
.mc-brand-name {
  font-family: var(--fm); font-size: 13px; font-weight: 700;
  letter-spacing: 0.3em; color: var(--text); display: block;
}
.mc-brand-sub {
  font-family: var(--fm); font-size: 8px; letter-spacing: 0.2em;
  color: var(--gold); display: block; margin-top: 3px;
}

/* Divider line */
.mc-brand-line {
  width: 48px; height: 1px;
  background: linear-gradient(to right, var(--gold), transparent);
  margin-bottom: 40px;
}

/* Hero */
.mc-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(197,164,84,0.06); border: 1px solid var(--gold-bdr);
  border-radius: 100px; padding: 5px 14px;
  font-family: var(--fm); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
  margin-bottom: 28px;
}
.mc-pill-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--green);
  animation: mc-blink 2.5s ease-in-out infinite;
  box-shadow: 0 0 6px var(--green);
}
@keyframes mc-blink { 0%,100%{opacity:1;} 50%{opacity:0.2;} }

.mc-headline {
  font-family: var(--ff);
  font-size: clamp(44px, 4.8vw, 68px);
  font-weight: 700;
  line-height: 1.06;
  color: var(--text);
  letter-spacing: -0.025em;
  margin-bottom: 22px;
}
.mc-headline-gold {
  color: transparent;
  background: linear-gradient(135deg, #C5A454, #F0D080, #C5A454);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: mc-shimmer 4s ease-in-out infinite;
}
@keyframes mc-shimmer {
  0%,100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.mc-desc {
  font-size: 15px; font-weight: 300; line-height: 1.8;
  color: var(--text-2); max-width: 400px;
  margin-bottom: 48px;
}

/* Stats */
.mc-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0; border: 1px solid var(--border);
  border-radius: 14px; overflow: hidden;
  margin-bottom: 28px;
  background: var(--bg3);
}
.mc-stat {
  padding: 20px 18px 16px;
  position: relative;
  border-right: 1px solid var(--border);
  transition: background 0.2s;
}
.mc-stat:last-child { border-right: none; }
.mc-stat:hover { background: var(--bg4); }
.mc-stat::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(to right, var(--gold), transparent);
  opacity: 0; transition: opacity 0.2s;
}
.mc-stat:hover::before { opacity: 1; }
.mc-stat-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 6px;
}
.mc-stat-val {
  font-family: var(--ff); font-size: 21px; font-weight: 700;
  color: var(--text); line-height: 1;
}
.mc-stat-lbl {
  font-family: var(--fm); font-size: 8px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3);
}

/* Trust bar */
.mc-trust {
  display: flex; align-items: center; gap: 16px;
}
.mc-trust-label {
  font-family: var(--fm); font-size: 9px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3);
}
.mc-trust-dots { display: flex; gap: 10px; }
.mc-trust-dot {
  width: 28px; height: 6px; border-radius: 3px;
  background: var(--border);
  animation: mc-trustpulse 3s ease-in-out infinite;
}
@keyframes mc-trustpulse {
  0%,100% { background: var(--border); }
  50% { background: var(--gold-bdr); }
}
.mc-trust-dot:nth-child(1) { animation-delay: 0s; }
.mc-trust-dot:nth-child(2) { animation-delay: 0.6s; }
.mc-trust-dot:nth-child(3) { animation-delay: 1.2s; }
.mc-trust-dot:nth-child(4) { animation-delay: 1.8s; }
.mc-trust-dot:nth-child(5) { animation-delay: 2.4s; }

/* ── RIGHT ── */
.mc-right {
  flex: 0.85;
  display: flex; align-items: center; justify-content: center;
  padding: 40px 56px;
  position: relative; z-index: 5;
}

/* Card */
.mc-card {
  width: 100%; max-width: 410px;
  background: rgba(12,20,36,0.90);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 30px 28px;
  backdrop-filter: blur(32px);
  box-shadow:
    0 32px 80px rgba(0,0,0,0.6),
    0 0 0 1px rgba(197,164,84,0.04),
    inset 0 1px 0 rgba(255,255,255,0.04);
  position: relative;
  overflow: hidden;
}
.mc-card::before {
  content: '';
  position: absolute; top: 0; left: 20px; right: 20px; height: 1px;
  background: linear-gradient(to right, transparent, rgba(197,164,84,0.4), transparent);
}

/* Card top bar */
.mc-card-topbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 28px;
}
.mc-steps { display: flex; align-items: center; gap: 0; }
.mc-step {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fm); font-size: 9.5px; font-weight: 700;
  border: 1.5px solid var(--border);
  color: var(--text-3);
  transition: all 0.35s ease;
  flex-shrink: 0;
}
.mc-step.active {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--bg);
  box-shadow: 0 0 16px rgba(197,164,84,0.35);
}
.mc-step.done {
  background: var(--gold-dim);
  border-color: var(--gold-bdr);
  color: var(--gold);
}
.mc-step-connector {
  width: 30px; height: 1px;
  background: var(--border); margin: 0 2px;
}
.mc-step-label {
  font-family: var(--fm); font-size: 9px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-3); margin-left: 10px;
}
.mc-ssl {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--fm); font-size: 9px; font-weight: 700;
  letter-spacing: 0.08em; color: var(--text-3);
  border: 1px solid var(--border); border-radius: 6px;
  padding: 4px 9px; opacity: 0.5;
}

/* Form head */
.mc-form-head { margin-bottom: 24px; }
.mc-form-title {
  font-family: var(--ff); font-size: 30px; font-weight: 700;
  color: var(--text); line-height: 1.1; margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.mc-form-title-gold { color: var(--gold); }
.mc-form-sub {
  font-size: 13px; font-weight: 400; color: var(--text-2);
  line-height: 1.5;
}
.mc-form-sub strong { color: var(--text); font-weight: 500; }

/* Fields */
.mc-form { margin-bottom: 0; }
.mc-field { margin-bottom: 18px; }
.mc-label {
  display: block; font-family: var(--fm); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-2);
  margin-bottom: 8px;
}
.mc-label-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.mc-forgot {
  font-size: 12px; color: var(--gold); text-decoration: none;
  font-weight: 500; opacity: 0.8; transition: opacity 0.2s;
}
.mc-forgot:hover { opacity: 1; }

.mc-input-wrap { position: relative; }
.mc-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--text-3); pointer-events: none;
  transition: color 0.2s;
}
.mc-input-wrap:focus-within .mc-input-icon { color: var(--gold); }

.mc-input {
  width: 100%; height: 48px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0 14px 0 40px;
  font-family: var(--ff); font-size: 14px; font-weight: 400;
  color: var(--text); outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.mc-input::placeholder { color: var(--text-3); }
.mc-input:focus {
  border-color: var(--gold-bdr);
  background: var(--gold-dim);
  box-shadow: 0 0 0 3px rgba(197,164,84,0.06);
}

.mc-input-pw { padding-right: 46px; }
.mc-eye {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--text-3); cursor: pointer;
  display: flex; align-items: center; padding: 0; transition: color 0.2s;
}
.mc-eye:hover { color: var(--gold); }

/* Submit */
.mc-submit {
  width: 100%; height: 50px; margin-top: 6px;
  background: linear-gradient(135deg, #C5A454, #D4B96A);
  border: none; border-radius: 12px;
  font-family: var(--ff); font-size: 14px; font-weight: 600;
  color: #0B1221; letter-spacing: 0.02em; cursor: pointer;
  position: relative; overflow: hidden;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  box-shadow: 0 4px 24px rgba(197,164,84,0.3);
}
.mc-submit::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.mc-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 32px rgba(197,164,84,0.42);
}
.mc-submit:active:not(:disabled) { transform: translateY(0); }
.mc-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.mc-btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
.mc-loading { display: flex; align-items: center; justify-content: center; gap: 10px; }
.mc-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(11,18,33,0.25);
  border-top-color: var(--bg);
  border-radius: 50%;
  animation: mc-spin 0.7s linear infinite;
}
@keyframes mc-spin { to { transform: rotate(360deg); } }

.mc-back {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font-family: var(--ff); font-size: 12.5px; font-weight: 400;
  color: var(--text-2); margin-top: 12px; padding: 0;
  transition: color 0.2s;
}
.mc-back:hover { color: var(--gold); }

/* Divider */
.mc-divider {
  display: flex; align-items: center; gap: 10px;
  margin: 20px 0;
  font-family: var(--fm); font-size: 9px; font-weight: 700;
  letter-spacing: 0.1em; color: var(--text-3); text-transform: uppercase;
}
.mc-div-line { flex: 1; height: 1px; background: var(--border); }

/* SSO */
.mc-sso { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
.mc-sso-btn {
  height: 42px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-family: var(--ff); font-size: 12px; font-weight: 500; color: var(--text-2);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.mc-sso-btn:hover {
  border-color: var(--gold-bdr);
  color: var(--text);
  background: var(--gold-dim);
}

/* Badges */
.mc-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.mc-badge {
  font-family: var(--fm); font-size: 7.5px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-3); border: 1px solid var(--border);
  border-radius: 4px; padding: 3px 7px;
}

.mc-access {
  font-size: 12.5px; color: var(--text-3); text-align: center;
}
.mc-access a {
  color: var(--gold); text-decoration: none; font-weight: 500; transition: opacity 0.2s;
}
.mc-access a:hover { opacity: 0.7; }

/* ── FOOTER ── */
.mc-footer {
  position: fixed; bottom: 0; left: 0; right: 0; height: 44px; z-index: 200;
  background: rgba(8,14,28,0.98);
  border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 48px;
  font-family: var(--fm); font-size: 9.5px;
  color: var(--text-3); letter-spacing: 0.06em;
}
.mc-footer-links { display: flex; gap: 24px; }
.mc-footer-links a { color: var(--text-3); text-decoration: none; transition: color 0.2s; }
.mc-footer-links a:hover { color: var(--text-2); }

/* Responsive */
@media (max-width: 960px) {
  .mc-left { display: none; }
  .mc-right { flex: 1; padding: 32px 20px; }
}
`;
