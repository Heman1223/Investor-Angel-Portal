import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Calendar, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { companyAPI } from '../services/api';
import { formatCurrencyCompact } from '../utils/formatters';
import { useNavigate, Link } from 'react-router-dom';

export default function CompanyUpdates() {
    const navigate = useNavigate();
    const { data: updates, isLoading, error } = useQuery({
        queryKey: ['companyUpdates'],
        queryFn: async () => {
            const res = await companyAPI.getUpdates();
            return res.data.data;
        },
    });

    if (isLoading) {
        return (
            <>
                <style>{UPDATES_CSS}</style>
                <div className="u-root">
                    <div className="u-shimmer" style={{ height: 100, borderRadius: 16, marginBottom: 20 }} />
                    <div className="u-shimmer" style={{ height: 300, borderRadius: 16 }} />
                </div>
            </>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-center gap-4">
                <AlertCircle size={24} />
                <div>
                    <h3 className="font-bold">Error Loading Updates</h3>
                    <p className="text-sm opacity-80">We couldn't fetch your updates. Please try refreshing the page.</p>
                </div>
            </div>
        );
    }

    const updatesList = updates || [];

    return (
        <>
            <style>{UPDATES_CSS}</style>
            <div className="u-root">
                <div className="u-header">
                    <div className="u-header-content">
                        <div className="u-header-icon">
                            <FileText size={20} color="#d4a843" />
                        </div>
                        <div>
                            <h1 className="u-title">Operating Updates</h1>
                            <p className="u-subtitle">History of reports submitted to your lead investors</p>
                        </div>
                    </div>
                    <Link to="/company/updates/new" className="u-btn-primary">
                        <Plus size={16} /> New Update
                    </Link>
                </div>

                {updatesList.length === 0 ? (
                    <div className="u-empty">
                        <div className="u-empty-icon">
                            <FileText size={40} color="#3d4f68" strokeWidth={1.5} />
                        </div>
                        <h2 className="u-empty-title">No updates found</h2>
                        <p className="u-empty-sub">Keep your investors informed by submitting your first monthly operating update.</p>
                        <Link to="/company/updates/new" className="u-btn-primary" style={{ padding: '12px 24px' }}>
                            Submit First Update
                        </Link>
                    </div>
                ) : (
                    <div className="u-list">
                        {updatesList.map((update: any, idx: number) => {
                            const isDraft = update.status === 'DRAFT';
                            return (
                                <div
                                    key={update.id}
                                    className="u-card"
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                    onClick={() => navigate(`/company/updates/${update.id}`)}
                                >
                                    <div className="u-card-left">
                                        <div className="u-card-status">
                                            {isDraft ? (
                                                <span className="u-badge u-badge-draft"><Clock size={10} /> DRAFT</span>
                                            ) : (
                                                <span className="u-badge u-badge-published"><ChevronRight size={10} /> PUBLISHED</span>
                                            )}
                                        </div>
                                        <h3 className="u-card-startup">{update.startup.name}</h3>
                                        <div className="u-card-date">
                                            <Calendar size={13} />
                                            <span>Period: {update.month}</span>
                                        </div>
                                    </div>

                                    <div className="u-card-metrics">
                                        <div className="u-card-metric">
                                            <span className="u-metric-lbl">MRR / REVENUE</span>
                                            <span className="u-metric-val">{formatCurrencyCompact(update.revenue)}</span>
                                        </div>
                                        <div className="u-card-metric">
                                            <span className="u-metric-lbl">BURN RATE</span>
                                            <span className="u-metric-val" style={{ color: '#F87171' }}>{formatCurrencyCompact(update.burnRate)}</span>
                                        </div>
                                        <div className="u-card-metric">
                                            <span className="u-metric-lbl">RUNWAY</span>
                                            <span className="u-metric-val" style={{ color: '#60A5FA' }}>
                                                {update.runwayMonths !== null ? `${update.runwayMonths} mo` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="u-card-right">
                                        <div className="u-view-btn">
                                            <span>{isDraft ? 'Resume' : 'View'}</span>
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>

                                    <div className="u-card-hover-edge" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

const UPDATES_CSS = `
.u-root {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: u-fadein 0.6s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
}

@keyframes u-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.u-shimmer { background: linear-gradient(90deg, rgba(10,22,40,0.8) 25%, rgba(15,29,50,0.8) 50%, rgba(10,22,40,0.8) 75%); background-size: 200% 100%; animation: u-shimmer 1.8s ease-in-out infinite; border: 1px solid rgba(212,168,67,0.06); border-radius: 16px; }
@keyframes u-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.u-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.u-header-content { display: flex; align-items: center; gap: 16px; }
.u-header-icon { width: 44px; height: 44px; border-radius: 14px; background: rgba(212,168,67,0.08); border: 1px solid rgba(212,168,67,0.15); display: flex; align-items: center; justify-content: center; transform: rotate(-5deg); transition: transform 0.3s; }
.u-header:hover .u-header-icon { transform: rotate(0deg); }

.u-title { font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size: 26px; font-weight: 800; color: var(--cream, #f0e6d0); letter-spacing: -0.02em; margin-bottom: 4px; }
.u-subtitle { font-size: 13px; color: #3d4f68; font-weight: 500; }

.u-btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #d4a843, #e8c468); border: none; border-radius: 12px; font-size: 14px; font-weight: 600; color: #060d19; text-decoration: none; transition: all 0.25s; box-shadow: 0 4px 16px rgba(212,168,67,0.25); }
.u-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(212,168,67,0.35); filter: brightness(1.05); }

.u-list { display: flex; flex-direction: column; gap: 12px; }

.u-card {
  background: rgba(10,22,40,0.55); border: 1px solid rgba(212,168,67,0.08); border-radius: 18px; padding: 20px 24px;
  display: grid; grid-template-columns: 1.5fr 2fr auto; align-items: center; gap: 20px;
  cursor: pointer; position: relative; overflow: hidden; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  transition: all 0.3s var(--ease-out); opacity: 0; animation: u-fadein 0.5s var(--ease-out) forwards;
}
.u-card:hover { border-color: rgba(212,168,67,0.18); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.4); background: rgba(12,25,45,0.7); }

.u-card-left { display: flex; flex-direction: column; gap: 6px; }
.u-card-startup { font-size: 18px; font-weight: 700; color: var(--cream, #f0e6d0); }
.u-card-date { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 11px; color: #3d4f68; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

.u-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 9px; font-weight: 700; letter-spacing: 0.06em; width: fit-content; margin-bottom: 4px; }
.u-badge-draft { background: rgba(107,122,148,0.12); color: #6b7a94; border: 1px solid rgba(107,122,148,0.2); }
.u-badge-published { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }

.u-card-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 0 20px; border-left: 1px solid rgba(212,168,67,0.08); border-right: 1px solid rgba(212,168,67,0.08); }
.u-card-metric { display: flex; flex-direction: column; gap: 4px; }
.u-metric-lbl { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 9px; font-weight: 600; color: #2d3a4f; letter-spacing: 0.08em; }
.u-metric-val { font-size: 15px; font-weight: 700; color: var(--cream, #f0e6d0); }

.u-card-right { display: flex; align-items: center; justify-content: flex-end; }
.u-view-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #d4a843; opacity: 0.6; transition: all 0.2s; }
.u-card:hover .u-view-btn { opacity: 1; transform: translateX(2px); }

.u-card-hover-edge { position: absolute; left: 0; top: 20%; bottom: 20%; width: 3px; background: #d4a843; border-radius: 0 4px 4px 0; transform: scaleY(0); transition: transform 0.3s var(--ease-spring); }
.u-card:hover .u-card-hover-edge { transform: scaleY(1); }

.u-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; background: rgba(10,22,40,0.4); border: 1px dashed rgba(212,168,67,0.15); border-radius: 20px; text-align: center; padding: 40px; }
.u-empty-icon { width: 80px; height: 80px; border-radius: 24px; background: rgba(212,168,67,0.04); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
.u-empty-title { font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif); font-size: 22px; font-weight: 700; color: var(--cream, #f0e6d0); margin-bottom: 10px; }
.u-empty-sub { font-size: 14px; color: #3d4f68; margin-bottom: 30px; max-width: 320px; line-height: 1.6; }

@media (max-width: 900px) {
  .u-card { grid-template-columns: 1fr auto; }
  .u-card-metrics { display: none; }
}
`;
