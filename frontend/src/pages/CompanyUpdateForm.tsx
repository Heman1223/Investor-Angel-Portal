import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Save, Send, Calendar, ArrowLeft, Info, CheckCircle2, Users, AlertTriangle, LifeBuoy, Building2 } from 'lucide-react';
import { companyAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function CompanyUpdateForm() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const state = location.state as { startupId?: string; onlyInvestorId?: string } | null;

    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['companyDashboard'],
        queryFn: async () => {
            const res = await companyAPI.getDashboard();
            return res.data.data;
        },
    });

    const startups = Array.isArray(dashboard) ? dashboard : (dashboard?.startups || []);

    const [startupId, setStartupId] = useState('');
    const [month, setMonth] = useState('');
    const [revenue, setRevenue] = useState('');
    const [burnRate, setBurnRate] = useState('');
    const [cashBalance, setCashBalance] = useState('');
    const [runwayMonths, setRunwayMonths] = useState('');
    const [selectedInvestors, setSelectedInvestors] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState('');
    const [headcount, setHeadcount] = useState('');
    const [keyWins, setKeyWins] = useState('');
    const [keyChallenges, setKeyChallenges] = useState('');
    const [helpNeeded, setHelpNeeded] = useState('');

    // skeleton loading
    if (isLoading || !dashboard) {
        return (
            <>
                <style>{FORM_CSS}</style>
                <div className="f-root animate-pulse">
                    <header className="f-header">
                        <div className="f-back" style={{ opacity: 0.5 }}><ArrowLeft size={18} /></div>
                        <div>
                            <div className="sd-skel-line w-48 h-8 mb-2" />
                            <div className="sd-skel-line w-64 h-4" />
                        </div>
                    </header>
                    <div className="f-container">
                        <div className="f-grid">
                            <div className="f-section">
                                <div className="sd-skel-line w-full h-64" />
                            </div>
                            <div className="f-section">
                                <div className="sd-skel-line w-full h-64" />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // 1. Initialize startupId once dashboard data is ready
    useEffect(() => {
        if (!isLoading && dashboard && !startupId) {
            if (state?.startupId) {
                setStartupId(state.startupId);
            } else if (startups.length > 0) {
                const firstS = startups[0];
                setStartupId(firstS.id || firstS._id);
            }
        }
    }, [isLoading, dashboard, state?.startupId, startups, startupId]);

    // 2. Initialize month once
    useEffect(() => {
        if (!month) {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            setMonth(`${yyyy}-${mm}`);
        }
    }, [month]);

    // 3. Initialize selectedInvestors when startupId changes
    useEffect(() => {
        if (startupId && startups.length > 0) {
            const selectedStartup = startups.find((s: any) => (s.id || s._id) === startupId);
            if (selectedStartup?.investors) {
                const initial: Record<string, boolean> = {};
                selectedStartup.investors.forEach((inv: any) => {
                    const invId = inv.id || inv._id;
                    if (state?.onlyInvestorId) {
                        initial[invId] = invId === state.onlyInvestorId;
                    } else {
                        initial[invId] = true;
                    }
                });
                setSelectedInvestors(initial);
            }
        }
    }, [startupId, startups, state?.onlyInvestorId]);

    const mutation = useMutation({
        mutationFn: async (payload: { data: any, action: 'DRAFT' | 'SUBMITTED' }) => {
            const { data, action } = payload;
            let res;
            if (id) {
                res = await companyAPI.updateUpdate(id, data);
            } else {
                res = await companyAPI.createUpdate(data);
            }

            if (action === 'SUBMITTED') {
                const updateId = res.data.data.id || res.data.data._id;
                const targetInvestorIds = Object.entries(selectedInvestors)
                    .filter(([_, selected]) => selected)
                    .map(([invId]) => invId);
                await companyAPI.submitUpdate(updateId, targetInvestorIds);
            }
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['companyUpdates'] });
            queryClient.invalidateQueries({ queryKey: ['companyDashboard'] });
            toast.success(variables.action === 'SUBMITTED' ? 'Update published successfully' : 'Update saved as draft');
            navigate('/company/updates');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to process update');
        }
    });

    const handleSubmit = (action: 'DRAFT' | 'SUBMITTED') => {
        const finalStartupId = startupId || (startups.length > 0 ? (startups[0].id || startups[0]._id) : null);
        if (!finalStartupId) { toast.error('No company available to report for.'); return; }
        if (!month) { toast.error('Please select a month'); return; }

        if (action === 'SUBMITTED') {
            const targetInvestorIds = Object.entries(selectedInvestors).filter(([_, s]) => s);
            if (targetInvestorIds.length === 0) {
                toast.error('Please select at least one investor to notify');
                return;
            }
        }

        mutation.mutate({
            data: {
                startupId: finalStartupId,
                month,
                revenue: Number(revenue) || 0,
                burnRate: Number(burnRate) || 0,
                cashBalance: Number(cashBalance) || 0,
                runwayMonths: runwayMonths ? Number(runwayMonths) : undefined,
                notes: notes || undefined,
                headcount: headcount ? Number(headcount) : undefined,
                keyWins: keyWins || undefined,
                keyChallenges: keyChallenges || undefined,
                helpNeeded: helpNeeded || undefined,
            },
            action,
        });
    };

    return (
        <>
            <style>{FORM_CSS}</style>
            <div className="f-root">
                <header className="f-header">
                    <button onClick={() => navigate('/company/updates')} className="f-back">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="f-title">{id ? 'Edit Report' : 'New Monthly Report'}</h1>
                        <p className="f-subtitle">Share your startup's performance metrics with investors</p>
                    </div>
                </header>

                <div className="f-card">
                    <div className="f-grid">
                        <div className="f-section">
                            <div className="f-section-head">
                                <Calendar size={18} color="#d4a843" />
                                <h3>Organization & Recipients</h3>
                            </div>

                            <div className="f-fields">
                                <div className="f-field-row">
                                    {startups.length > 1 ? (
                                        <div className="f-field" style={{ flex: 1.5 }}>
                                            <label>SELECT COMPANY PROFILE</label>
                                            <div className="f-select-wrap">
                                                <select
                                                    value={startupId}
                                                    onChange={e => setStartupId(e.target.value)}
                                                    className="f-input"
                                                >
                                                    <option value="" disabled>Select a startup</option>
                                                    {startups.map((s: any) => (
                                                        <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="f-field" style={{ flex: 1.5 }}>
                                            <label>YOUR COMPANY</label>
                                            <div className="f-static-value">
                                                <Building2 size={16} style={{ marginRight: 8, opacity: 0.6 }} />
                                                {startups[0]?.name}
                                            </div>
                                        </div>
                                    )}

                                    <div className="f-field" style={{ flex: 1 }}>
                                        <label>REPORTING MONTH</label>
                                        <div className="f-input-group">
                                            <Calendar size={16} className="f-input-icon" />
                                            <input
                                                type="month"
                                                value={month}
                                                onChange={e => setMonth(e.target.value)}
                                                className="f-input has-icon"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {startupId && (
                                    <div className="f-field">
                                        <label>CHOOSE INVESTOR(S) TO SEND REPORT TO</label>
                                        <div className="f-investors-grid">
                                            {(() => {
                                                const selectedStartup = startups.find((s: any) => (s.id || s._id) === startupId);
                                                const investors = selectedStartup?.investors || [];
                                                if (investors.length === 0) return (
                                                    <div className="f-no-data">
                                                        <Info size={14} />
                                                        <span>No active investors connected to {selectedStartup?.name}. Accepted invites will appear here.</span>
                                                    </div>
                                                );
                                                return investors.map((inv: any) => {
                                                    const invId = inv.id || inv._id;
                                                    const isSelected = !!selectedInvestors[invId];
                                                    return (
                                                        <div
                                                            key={invId}
                                                            className={`f-investor-chip ${isSelected ? 'is-selected' : ''}`}
                                                            onClick={() => setSelectedInvestors(prev => ({ ...prev, [invId]: !prev[invId] }))}
                                                        >
                                                            <div className="f-chip-check">
                                                                <div className="f-chip-check-inner" />
                                                            </div>
                                                            <div className="f-chip-info">
                                                                <span className="f-chip-name">{inv.name}</span>
                                                                <span className="f-chip-email">{inv.email}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        <p className="f-field-hint">Only investors selected above will be able to view this update and receive a notification.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="f-section">
                            <div className="f-section-head">
                                <div className="f-currency-icon">₹</div>
                                <h3>Financial Metrics</h3>
                                <div className="f-info-tip" title="Enter values in ₹ (Decimals supported)">
                                    <Info size={14} />
                                </div>
                            </div>

                            <div className="f-fields f-grid-2">
                                <div className="f-field">
                                    <label>REVENUE / MRR</label>
                                    <div className="f-input-group">
                                        <span className="f-input-prefix">₹</span>
                                        <input
                                            type="number"
                                            value={revenue}
                                            onChange={e => setRevenue(e.target.value)}
                                            placeholder="0.00"
                                            className="f-input"
                                        />
                                    </div>
                                </div>
                                <div className="f-field">
                                    <label>BURN RATE</label>
                                    <div className="f-input-group">
                                        <span className="f-input-prefix">₹</span>
                                        <input
                                            type="number"
                                            value={burnRate}
                                            onChange={e => setBurnRate(e.target.value)}
                                            placeholder="0.00"
                                            className="f-input"
                                        />
                                    </div>
                                </div>
                                <div className="f-field">
                                    <label>CASH BALANCE</label>
                                    <div className="f-input-group">
                                        <span className="f-input-prefix">₹</span>
                                        <input
                                            type="number"
                                            value={cashBalance}
                                            onChange={e => setCashBalance(e.target.value)}
                                            placeholder="0.00"
                                            className="f-input"
                                        />
                                    </div>
                                </div>
                                <div className="f-field">
                                    <label>EXPECTED RUNWAY</label>
                                    <div className="f-input-group">
                                        <input
                                            type="number"
                                            value={runwayMonths}
                                            onChange={e => setRunwayMonths(e.target.value)}
                                            placeholder="Mo."
                                            className="f-input"
                                        />
                                        <span className="f-input-suffix">Months</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="f-section">
                            <div className="f-section-head">
                                <Users size={18} color="#d4a843" />
                                <h3>Team & Traction</h3>
                            </div>
                            <div className="f-fields">
                                <div className="f-field">
                                    <label>TOTAL HEADCOUNT</label>
                                    <input
                                        type="number"
                                        value={headcount}
                                        onChange={e => setHeadcount(e.target.value)}
                                        placeholder="Full-time employees"
                                        className="f-input"
                                    />
                                </div>
                                <div className="f-field">
                                    <label>KEY WINS (THIS MONTH)</label>
                                    <textarea
                                        value={keyWins}
                                        onChange={e => setKeyWins(e.target.value)}
                                        placeholder="Major acquisitions, product launches, hires..."
                                        className="f-textarea f-small"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="f-grid" style={{ marginTop: '20px' }}>
                        <div className="f-section">
                            <div className="f-section-head">
                                <AlertTriangle size={18} color="#d4a843" />
                                <h3>Critical Challenges</h3>
                            </div>
                            <textarea
                                value={keyChallenges}
                                onChange={e => setKeyChallenges(e.target.value)}
                                placeholder="Bottlenecks, risks, or blockers..."
                                className="f-textarea f-small"
                            />
                        </div>
                        <div className="f-section">
                            <div className="f-section-head">
                                <LifeBuoy size={18} color="#d4a843" />
                                <h3>Help Needed / Asks</h3>
                            </div>
                            <textarea
                                value={helpNeeded}
                                onChange={e => setHelpNeeded(e.target.value)}
                                placeholder="Intros, hiring needs, feedback..."
                                className="f-textarea f-small"
                            />
                        </div>
                    </div>

                    <div className="f-section" style={{ borderTop: '1px solid rgba(212,168,67,0.08)', paddingTop: '24px', marginTop: '12px' }}>
                        <div className="f-section-head">
                            <FileText size={18} color="#d4a843" />
                            <h3>Qualitative Update</h3>
                        </div>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Highlights, challenges, key hires, or asks for your investors... (Markdown supported)"
                            className="f-textarea"
                        />
                    </div>

                    <div className="f-footer">
                        <div className="f-footer-note">
                            <CheckCircle2 size={16} color="#34d399" />
                            <span>Updating this report will notify all portfolio investors.</span>
                        </div>
                        <div className="f-actions">
                            <button
                                onClick={() => handleSubmit('DRAFT')}
                                disabled={mutation.isPending}
                                className="f-btn-ghost"
                            >
                                <Save size={16} /> Save Draft
                            </button>
                            <button
                                onClick={() => handleSubmit('SUBMITTED')}
                                disabled={mutation.isPending}
                                className="f-btn-primary"
                            >
                                <Send size={16} /> Publish Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const FORM_CSS = `
.f-root { max-width: 900px; margin: 0 auto; animation: f-fadein 0.6s var(--ease-out, cubic-bezier(0.16,1,0.3,1)); }
@keyframes f-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

.f-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
.f-back { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(212,168,67,0.1); color: #3d4f68; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.f-back:hover { background: rgba(212,168,67,0.06); color: #d4a843; border-color: rgba(212,168,67,0.25); transform: translateX(-2px); }

.f-title { font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size: 28px; font-weight: 800; color: var(--cream, #f0e6d0); letter-spacing: -0.02em; margin-bottom: 4px; }
.f-subtitle { font-size: 14px; color: #3d4f68; font-weight: 500; }

.f-card { background: rgba(10,22,40,0.5); border: 1px solid rgba(212,168,67,0.12); border-radius: 24px; padding: 40px; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); box-shadow: 0 20px 60px rgba(0,0,0,0.3); }

.f-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; margin-bottom: 32px; }
.f-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.f-section { display: flex; flex-direction: column; gap: 20px; }
.f-section-head { display: flex; align-items: center; gap: 12px; }
.f-section-head h3 { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--cream, #f0e6d0); }
.f-currency-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #d4a843; font-size: 18px; }
.f-info-tip { color: #3d4f68; cursor: help; transition: color 0.2s; }
.f-info-tip:hover { color: #d4a843; }

.f-fields { display: flex; flex-direction: column; gap: 20px; }
.f-field-row { display: flex; gap: 16px; }
.f-field { display: flex; flex-direction: column; gap: 8px; }
.f-field label { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #2d3a4f; letter-spacing: 0.1em; }

.f-static-value { height: 52px; background: rgba(212,168,67,0.05); border: 1px solid rgba(212,168,67,0.15); border-radius: 14px; padding: 0 16px; color: #d4a843; display: flex; align-items: center; font-weight: 700; font-size: 15px; }

.f-input { width: 100%; height: 52px; background: rgba(6,13,25,0.6); border: 1px solid rgba(212,168,67,0.1); border-radius: 14px; padding: 0 16px; color: #f0e6d0; font-family: var(--font-body); font-size: 15px; font-weight: 500; transition: all 0.25s; }
.f-input:focus { border-color: #d4a843; outline: none; background: rgba(6,13,25,0.8); box-shadow: 0 0 0 4px rgba(212,168,67,0.08); }
.f-input::placeholder { color: #222d3d; }
.f-input[type="month"] { -webkit-appearance: none; appearance: none; color-scheme: dark; }

.f-input-group { position: relative; display: flex; align-items: center; width: 100%; }
.f-input-icon, .f-input-prefix { position: absolute; left: 14px; color: #3d4f68; font-weight: 700; font-size: 14px; pointer-events: none; display: flex; align-items: center; justify-content: center; }
.f-input-suffix { position: absolute; right: 16px; color: #3d4f68; font-weight: 600; font-size: 12px; pointer-events: none; }
.f-input.has-icon, .f-input-group .f-input { padding-left: 42px; }
.f-input-group .f-input:has(+ .f-input-suffix) { padding-right: 70px; }

.f-investors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.f-investor-chip { 
  display: flex; align-items: center; gap: 12px; padding: 12px 16px; 
  background: rgba(255,255,255,0.02); border: 1px solid rgba(212,168,67,0.08); border-radius: 14px; 
  cursor: pointer; transition: all 0.2s; user-select: none;
}
.f-investor-chip:hover { background: rgba(212,168,67,0.04); border-color: rgba(212,168,67,0.2); }
.f-investor-chip.is-selected { 
  background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.3); 
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.f-chip-check { 
  width: 18px; height: 18px; border-radius: 50%; border: 2px solid #3d4f68; 
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.is-selected .f-chip-check { border-color: #10B981; background: #10B981; }
.f-chip-check-inner { 
  width: 6px; height: 6px; border-radius: 50%; background: #060d19; 
  transform: scale(0); transition: transform 0.2s;
}
.is-selected .f-chip-check-inner { transform: scale(1); }

.f-chip-info { display: flex; flex-direction: column; min-width: 0; }
.f-chip-name { font-size: 13px; font-weight: 700; color: #f0e6d0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-chip-email { font-size: 10px; color: #3d4f68; font-family: var(--font-mono); }
.is-selected .f-chip-name { color: #10B981; }

.f-no-data { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #3d4f68; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.05); }

.f-textarea { width: 100%; min-height: 160px; background: rgba(6,13,25,0.4); border: 1px solid rgba(212,168,67,0.08); border-radius: 16px; padding: 20px; color: #f0e6d0; font-family: var(--font-body); font-size: 15px; line-height: 1.6; resize: vertical; transition: all 0.25s; }
.f-textarea:focus { border-color: #d4a843; outline: none; background: rgba(6,13,25,0.6); box-shadow: 0 0 0 4px rgba(212,168,67,0.08); }
.f-textarea.f-small { min-height: 100px; padding: 16px; font-size: 14px; }

.f-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(212,168,67,0.12); }
.f-footer-note { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #3d4f68; font-weight: 500; }
.f-actions { display: flex; align-items: center; gap: 16px; }

.f-btn-ghost { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: transparent; border: 1px solid rgba(212,168,67,0.15); border-radius: 12px; font-size: 14px; font-weight: 600; color: #d4a843; cursor: pointer; transition: all 0.2s; }
.f-btn-ghost:hover { background: rgba(212,168,67,0.05); border-color: #d4a843; }

.f-btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #d4a843, #e8c468); border: none; border-radius: 12px; font-size: 14px; font-weight: 700; color: #060d19; cursor: pointer; transition: all 0.25s; box-shadow: 0 4px 20px rgba(212,168,67,0.25); }
.f-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(212,168,67,0.4); filter: brightness(1.05); }

.f-field-hint { font-size: 11px; color: #3d4f68; margin-top: 4px; font-style: italic; }

.sd-skel-line { background: rgba(212,168,67,0.05); border-radius: 4px; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

@media (max-width: 900px) {
  .f-grid { grid-template-columns: 1fr; gap: 24px; }
  .f-card { padding: 24px; }
  .f-footer { flex-direction: column; text-align: center; }
  .f-field-row { flex-direction: column; }
}
`;
