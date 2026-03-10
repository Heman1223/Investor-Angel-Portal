import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Save, Send, Calendar, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { companyAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function CompanyUpdateForm() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: dashboard } = useQuery({
        queryKey: ['companyDashboard'],
        queryFn: async () => {
            const res = await companyAPI.getDashboard();
            return res.data.data;
        },
    });

    const startups = dashboard?.startups || [];
    const defaultStartupId = startups.length === 1 ? startups[0].id : '';

    const [startupId, setStartupId] = useState(defaultStartupId);
    const [month, setMonth] = useState('');
    const [revenue, setRevenue] = useState('');
    const [burnRate, setBurnRate] = useState('');
    const [cashBalance, setCashBalance] = useState('');
    const [runwayMonths, setRunwayMonths] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!startupId && defaultStartupId) {
            setStartupId(defaultStartupId);
        }

        if (!month) {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            setMonth(`${yyyy}-${mm}`);
        }
    }, [defaultStartupId, startupId, month]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            return await companyAPI.createUpdate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companyUpdates'] });
            queryClient.invalidateQueries({ queryKey: ['companyDashboard'] });
            toast.success('Update saved successfully');
            navigate('/company/updates');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to save update');
        }
    });

    const handleSubmit = (action: 'DRAFT' | 'SUBMITTED') => {
        if (!startupId) { toast.error('Please select a company'); return; }
        if (!month) { toast.error('Please select a month'); return; }

        mutation.mutate({
            startupId,
            month,
            revenue: Number(revenue) || 0,
            burnRate: Number(burnRate) || 0,
            cashBalance: Number(cashBalance) || 0,
            runwayMonths: runwayMonths ? Number(runwayMonths) : undefined,
            notes: notes || undefined,
            status: action,
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
                                <h3>Organization & Period</h3>
                            </div>

                            <div className="f-fields">
                                <div className="f-field">
                                    <label>SELECT STARTUP</label>
                                    <div className="f-select-wrap">
                                        <select
                                            value={startupId}
                                            onChange={e => setStartupId(e.target.value)}
                                            className="f-input"
                                        >
                                            <option value="" disabled>Select a startup</option>
                                            {startups.map((s: any) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="f-field">
                                    <label>REPORTING MONTH</label>
                                    <input
                                        type="month"
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        className="f-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="f-section">
                            <div className="f-section-head">
                                <div className="f-currency-icon">₹</div>
                                <h3>Financial Metrics (in Paise)</h3>
                                <div className="f-info-tip" title="Enter values in ₹ Paise (e.g. 10000 = ₹100.00)">
                                    <Info size={14} />
                                </div>
                            </div>

                            <div className="f-fields f-grid-2">
                                <div className="f-field">
                                    <label>REVENUE / MRR</label>
                                    <input
                                        type="number"
                                        value={revenue}
                                        onChange={e => setRevenue(e.target.value)}
                                        placeholder="0"
                                        className="f-input"
                                    />
                                </div>
                                <div className="f-field">
                                    <label>BURN RATE</label>
                                    <input
                                        type="number"
                                        value={burnRate}
                                        onChange={e => setBurnRate(e.target.value)}
                                        placeholder="0"
                                        className="f-input"
                                    />
                                </div>
                                <div className="f-field">
                                    <label>CASH BALANCE</label>
                                    <input
                                        type="number"
                                        value={cashBalance}
                                        onChange={e => setCashBalance(e.target.value)}
                                        placeholder="0"
                                        className="f-input"
                                    />
                                </div>
                                <div className="f-field">
                                    <label>RUNWAY (MONTHS)</label>
                                    <input
                                        type="number"
                                        value={runwayMonths}
                                        onChange={e => setRunwayMonths(e.target.value)}
                                        placeholder="Optional"
                                        className="f-input"
                                    />
                                </div>
                            </div>
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

.f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
.f-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.f-section { display: flex; flex-direction: column; gap: 24px; }
.f-section-head { display: flex; align-items: center; gap: 12px; }
.f-section-head h3 { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--cream, #f0e6d0); }
.f-currency-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #d4a843; font-size: 18px; }
.f-info-tip { color: #3d4f68; cursor: help; transition: color 0.2s; }
.f-info-tip:hover { color: #d4a843; }

.f-fields { display: flex; flex-direction: column; gap: 20px; }
.f-field { display: flex; flex-direction: column; gap: 10px; }
.f-field label { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #2d3a4f; letter-spacing: 0.1em; }

.f-input { width: 100%; height: 52px; background: rgba(6,13,25,0.6); border: 1px solid rgba(212,168,67,0.1); border-radius: 14px; padding: 0 16px; color: #f0e6d0; font-family: var(--font-body); font-size: 15px; font-weight: 500; transition: all 0.25s; }
.f-input:focus { border-color: #d4a843; outline: none; background: rgba(6,13,25,0.8); box-shadow: 0 0 0 4px rgba(212,168,67,0.08); }
.f-input::placeholder { color: #222d3d; }
.f-input[type="month"] { -webkit-appearance: none; appearance: none; color-scheme: dark; }

.f-textarea { width: 100%; min-height: 200px; background: rgba(6,13,25,0.4); border: 1px solid rgba(212,168,67,0.08); border-radius: 16px; padding: 20px; color: #f0e6d0; font-family: var(--font-body); font-size: 15px; line-height: 1.6; resize: vertical; transition: all 0.25s; }
.f-textarea:focus { border-color: #d4a843; outline: none; background: rgba(6,13,25,0.6); box-shadow: 0 0 0 4px rgba(212,168,67,0.08); }

.f-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(212,168,67,0.12); }
.f-footer-note { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #3d4f68; font-weight: 500; }
.f-actions { display: flex; align-items: center; gap: 16px; }

.f-btn-ghost { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: transparent; border: 1px solid rgba(212,168,67,0.15); border-radius: 12px; font-size: 14px; font-weight: 600; color: #d4a843; cursor: pointer; transition: all 0.2s; }
.f-btn-ghost:hover { background: rgba(212,168,67,0.05); border-color: #d4a843; }

.f-btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #d4a843, #e8c468); border: none; border-radius: 12px; font-size: 14px; font-weight: 700; color: #060d19; cursor: pointer; transition: all 0.25s; box-shadow: 0 4px 20px rgba(212,168,67,0.25); }
.f-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(212,168,67,0.4); filter: brightness(1.05); }

@media (max-width: 800px) {
  .f-grid { grid-template-columns: 1fr; gap: 24px; }
  .f-card { padding: 24px; }
  .f-footer { flex-direction: column; text-align: center; }
}
`;
