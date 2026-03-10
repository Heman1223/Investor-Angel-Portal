import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Shield, Mail, User, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';

export default function InvitePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [inviteData, setInviteData] = useState<{ startupName: string; email: string; companyRole: string } | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/company/dashboard');
            return;
        }

        if (token) {
            authAPI.getInvite(token)
                .then(res => {
                    setInviteData(res.data.data);
                    setEmail(res.data.data.email);
                })
                .catch(err => {
                    setInviteError(err.response?.data?.error?.message || 'Invalid or expired invitation link');
                })
                .finally(() => setVerifying(false));
        } else {
            setInviteError('No invitation token found');
            setVerifying(false);
        }
    }, [isAuthenticated, navigate, token]);

    if (isAuthenticated) return null;

    if (verifying) {
        return (
            <div className="iv-root">
                <style>{IV_CSS}</style>
                <div className="iv-card" style={{ textAlign: 'center' }}>
                    <div className="iv-loader" style={{ justifyContent: 'center', marginBottom: 16 }}>
                        <span className="iv-spinner" />
                    </div>
                    <p style={{ color: '#f0e6d0', fontSize: '14px' }}>Verifying your secure invitation...</p>
                </div>
            </div>
        );
    }

    if (inviteError) {
        return (
            <div className="iv-root">
                <style>{IV_CSS}</style>
                <div className="iv-orb iv-orb-1" />
                <div className="iv-card" style={{ textAlign: 'center' }}>
                    <div className="iv-logo-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                        <Shield size={28} />
                    </div>
                    <h1 className="iv-title">Invitation Invalid</h1>
                    <p className="iv-subtitle" style={{ color: '#ef4444', opacity: 0.8 }}>{inviteError}</p>
                    <button onClick={() => navigate('/login')} className="iv-submit" style={{ marginTop: 32, background: 'rgba(255,255,255,0.05)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.2)' }}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    const handleAcceptInvite = async (e: FormEvent) => {
        e.preventDefault();
        if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        if (password !== confirmPw) { toast.error('Passwords do not match'); return; }
        if (!token) { toast.error('Invalid invite link'); return; }

        setLoading(true);
        try {
            const res = await authAPI.registerCompany(name, email, password, token);
            toast.success('Welcome to your Company Portal!');
            sessionStorage.setItem('accessToken', res.data.data.accessToken);
            window.location.href = '/company/dashboard';
        } catch (err: any) {
            toast.error(err.response?.data?.error?.message || 'Registration failed. The invite might be expired or invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="iv-root">
            <style>{IV_CSS}</style>

            {/* Background Orbs */}
            <div className="iv-orb iv-orb-1" />
            <div className="iv-orb iv-orb-2" />

            <div className="iv-card">
                <div className="iv-header">
                    <div className="iv-logo-wrap">
                        <Shield className="iv-logo-icon" size={28} />
                    </div>
                    <h1 className="iv-title">Join {inviteData?.startupName}</h1>
                    <p className="iv-subtitle">Set up your secure operator account to manage your portal for <strong>{inviteData?.startupName}</strong>.</p>
                </div>

                <form onSubmit={handleAcceptInvite} className="iv-form">
                    <div className="iv-field">
                        <label>FULL NAME</label>
                        <div className="iv-input-wrap">
                            <User className="iv-input-icon" size={16} />
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="Arjun Mehta"
                                className="iv-input"
                            />
                        </div>
                    </div>

                    <div className="iv-field">
                        <label>WORK EMAIL</label>
                        <div className="iv-input-wrap">
                            <Mail className="iv-input-icon" size={16} />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                disabled={!!inviteData}
                                placeholder="arjun@startup.io"
                                className="iv-input"
                                style={inviteData ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                            />
                        </div>
                    </div>

                    <div className="iv-grid">
                        <div className="iv-field">
                            <label>PASSWORD</label>
                            <div className="iv-input-wrap">
                                <Lock className="iv-input-icon" size={16} />
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="iv-input"
                                />
                                <button type="button" className="iv-eye" onClick={() => setShowPw(!showPw)}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="iv-field">
                            <label>CONFIRM PASSWORD</label>
                            <div className="iv-input-wrap">
                                <Check className="iv-input-icon" size={16} />
                                <input
                                    type="password"
                                    value={confirmPw}
                                    onChange={e => setConfirmPw(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="iv-input"
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="iv-submit" disabled={loading}>
                        {loading ? (
                            <div className="iv-loader">
                                <span className="iv-spinner" /> Setting up Portal...
                            </div>
                        ) : (
                            <>
                                <span>Finalize Registration</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="iv-footer">
                    Already have an account? <a href="/login">Log in to Portal</a>
                </div>

                {/* Trust Badges */}
                <div className="iv-trust">
                    <div className="iv-trust-item">
                        <Shield size={12} />
                        <span>AES-256 Encrypted</span>
                    </div>
                    <div className="iv-trust-sep" />
                    <div className="iv-trust-item">
                        <span>GDPR Compliant</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const IV_CSS = `
.iv-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #060d19;
    padding: 24px;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
}

.iv-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    z-index: 0;
    opacity: 0.15;
}
.iv-orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, #d4a843, transparent);
    top: -200px;
    right: -200px;
    animation: iv-float 20s infinite alternate;
}
.iv-orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #2d4f8b, transparent);
    bottom: -150px;
    left: -150px;
    animation: iv-float 25s infinite alternate-reverse;
}
@keyframes iv-float {
    from { transform: translate(0, 0); }
    to { transform: translate(100px, 50px); }
}

.iv-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 520px;
    background: rgba(10, 22, 40, 0.6);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid rgba(212, 168, 67, 0.12);
    border-radius: 28px;
    padding: 48px;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
    animation: iv-entry 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes iv-entry {
    from { opacity: 0; transform: translateY(20px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.iv-header {
    text-align: center;
    margin-bottom: 40px;
}
.iv-logo-wrap {
    width: 64px;
    height: 64px;
    background: rgba(212, 168, 67, 0.1);
    border: 1px solid rgba(212, 168, 67, 0.2);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: #d4a843;
    transform: rotate(-5deg);
}
.iv-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: #f0e6d0;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
}
.iv-subtitle {
    font-size: 14px;
    color: #3d4f68;
    line-height: 1.6;
    max-width: 360px;
    margin: 0 auto;
}

.iv-form { display: flex; flex-direction: column; gap: 24px; }
.iv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 480px) { .iv-grid { grid-template-columns: 1fr; } }

.iv-field { display: flex; flex-direction: column; gap: 10px; }
.iv-field label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    color: #2d3a4f;
    letter-spacing: 0.1em;
}

.iv-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}
.iv-input {
    width: 100%;
    height: 54px;
    background: rgba(6, 13, 25, 0.6);
    border: 1px solid rgba(212, 168, 67, 0.1);
    border-radius: 14px;
    padding: 0 48px;
    color: #f0e6d0;
    font-size: 15px;
    transition: all 0.25s;
}
.iv-input:focus {
    border-color: #d4a843;
    background: rgba(6, 13, 25, 0.8);
    outline: none;
    box-shadow: 0 0 0 4px rgba(212, 168, 67, 0.08);
}
.iv-input-icon {
    position: absolute;
    left: 18px;
    color: #3d4f68;
    pointer-events: none;
    transition: color 0.2s;
}
.iv-input:focus + .iv-input-icon,
.iv-input:focus ~ .iv-input-icon { color: #d4a843; }

.iv-eye {
    position: absolute;
    right: 14px;
    background: none;
    border: none;
    color: #3d4f68;
    cursor: pointer;
    padding: 6px;
    transition: color 0.2s;
}
.iv-eye:hover { color: #d4a843; }

.iv-submit {
    height: 56px;
    background: linear-gradient(135deg, #d4a843, #e8c468);
    border: none;
    border-radius: 14px;
    color: #060d19;
    font-weight: 700;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 20px rgba(212, 168, 67, 0.25);
    margin-top: 8px;
}
.iv-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(212, 168, 67, 0.4);
    filter: brightness(1.05);
}
.iv-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.iv-footer {
    text-align: center;
    margin-top: 32px;
    font-size: 14px;
    color: #3d4f68;
    font-weight: 500;
}
.iv-footer a {
    color: #d4a843;
    text-decoration: none;
    font-weight: 600;
    margin-left: 4px;
}
.iv-footer a:hover { text-decoration: underline; }

.iv-trust {
    margin-top: 40px;
    padding-top: 32px;
    border-top: 1px solid rgba(212, 168, 67, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
}
.iv-trust-item { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #2d3a4f; text-transform: uppercase; letter-spacing: 0.05em; }
.iv-trust-sep { width: 4px; height: 4px; border-radius: 50%; background: rgba(212, 168, 67, 0.2); }

.iv-loader { display: flex; align-items: center; gap: 10px; }
.iv-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(0,0,0,0.1);
    border-top-color: #060d19;
    border-radius: 50%;
    animation: iv-spin 0.8s linear infinite;
}
@keyframes iv-spin { to { transform: rotate(360deg); } }
`;
