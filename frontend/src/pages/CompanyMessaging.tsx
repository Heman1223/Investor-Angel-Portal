import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Shield, Clock } from 'lucide-react';
import { companyAPI, messagingAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export default function CompanyMessaging() {
    const queryClient = useQueryClient();
    const { socket } = useSocket();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [newMessage, setNewMessage] = useState('');
    const [selectedStartupId, setSelectedStartupId] = useState<string>('');
    const [selectedInvestorId, setSelectedInvestorId] = useState<string>('');

    const { data: dashboard, isLoading: dashLoading } = useQuery({
        queryKey: ['companyDashboard'],
        queryFn: async () => {
            const res = await companyAPI.getDashboard();
            return res.data.data;
        },
    });

    const startups = dashboard?.startups || [];

    useEffect(() => {
        if (startups.length > 0 && !selectedStartupId) {
            setSelectedStartupId(startups[0].id);
        }
    }, [startups, selectedStartupId]);

    // Fetch threads (investors) for the selected startup
    const { data: threadsData, isLoading: threadsLoading } = useQuery({
        queryKey: ['messaging', 'threads', selectedStartupId],
        queryFn: async () => {
            if (!selectedStartupId) return [];
            const res = await messagingAPI.getThreads(selectedStartupId);
            return res.data.data;
        },
        enabled: !!selectedStartupId,
    });

    const threads = threadsData || [];

    useEffect(() => {
        if (threads.length > 0 && !selectedInvestorId) {
            setSelectedInvestorId(threads[0].investorId);
        } else if (threads.length === 0) {
            setSelectedInvestorId('');
        }
    }, [threads, selectedInvestorId]);

    const { data: convData, isLoading: convLoading } = useQuery({
        queryKey: ['messaging', 'messages', selectedStartupId, selectedInvestorId],
        queryFn: async () => {
            if (!selectedStartupId || !selectedInvestorId) return null;
            const res = await messagingAPI.getMessages(selectedStartupId, selectedInvestorId);
            return res.data.data;
        },
        enabled: !!selectedStartupId && !!selectedInvestorId,
        refetchInterval: 5000
    });

    const messages = convData?.messages || [];

    useEffect(() => {
        if (!socket || !selectedStartupId) return;
        socket.emit('join_startup', selectedStartupId);
        
        const handleNewMessage = (data: any) => {
            if (data.startupId === selectedStartupId) {
                queryClient.invalidateQueries({ queryKey: ['messaging', 'threads', selectedStartupId] });
                queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', selectedStartupId] });
            }
        };

        socket.on('new_message', handleNewMessage);
        return () => {
            socket.emit('leave_startup', selectedStartupId);
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, selectedStartupId, queryClient]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (selectedStartupId && selectedInvestorId) {
            messagingAPI.markSeen(selectedStartupId, selectedInvestorId).catch(console.error);
            queryClient.invalidateQueries({ queryKey: ['companyDashboard'] });
        }
    }, [selectedStartupId, selectedInvestorId, queryClient, messages.length]);

    const sendMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!selectedStartupId || !selectedInvestorId) throw new Error("Missing selection");
            return await messagingAPI.sendMessage(selectedStartupId, content, selectedInvestorId);
        },
        onSuccess: () => {
            setNewMessage('');
            queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', selectedStartupId, selectedInvestorId] });
            queryClient.invalidateQueries({ queryKey: ['messaging', 'threads', selectedStartupId] });
        },
        onError: () => toast.error('Failed to send message')
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedStartupId || !selectedInvestorId) return;
        sendMutation.mutate(newMessage);
    };

    if (dashLoading) return (
        <>
            <style>{MSG_CSS}</style>
            <div className="m-root">
                <div className="m-shimmer" style={{ height: 600, borderRadius: 24 }} />
            </div>
        </>
    );

    if (startups.length === 0) return (
        <div className="m-empty-root">
            <style>{MSG_CSS}</style>
            <div className="m-empty-card">
                <MessageSquare size={48} color="#3d4f68" strokeWidth={1.5} />
                <h3>No Active Channels</h3>
                <p>You haven't been assigned to any companies yet or your investors haven't initiated contact.</p>
            </div>
        </div>
    );

    const activeStartup = startups.find((s: any) => s.id === selectedStartupId);
    const activeThread = threads.find((t: any) => t.investorId === selectedInvestorId);

    return (
        <>
            <style>{MSG_CSS}</style>
            <div className="m-root">
                <div className="m-layout">
                    {/* Sidebar / Startup Selector */}
                    <div className="m-side">
                        <h4 className="m-side-title">STARTUPS</h4>
                        <div className="m-side-list">
                            {startups.map((s: any) => (
                                <button
                                    key={s.id}
                                    className={`m-side-item${selectedStartupId === s.id ? ' on' : ''}`}
                                    onClick={() => {
                                        setSelectedStartupId(s.id);
                                        setSelectedInvestorId(''); // Reset investor selection when startup changes
                                    }}
                                >
                                    <div className="m-side-avatar">{s.name[0]}</div>
                                    <span>{s.name}</span>
                                </button>
                            ))}
                        </div>

                        {selectedStartupId && (
                            <>
                                <h4 className="m-side-title" style={{ marginTop: 20 }}>INVESTORS</h4>
                                <div className="m-side-list">
                                    {threads.length === 0 && !threadsLoading ? (
                                        <p style={{ fontSize: 11, color: '#3d4f68', padding: '0 10px' }}>No active investor threads yet.</p>
                                    ) : (
                                        threads.map((t: any) => (
                                            <button
                                                key={t.id}
                                                className={`m-side-item${selectedInvestorId === t.investorId ? ' on' : ''}`}
                                                onClick={() => setSelectedInvestorId(t.investorId)}
                                            >
                                                <div className="m-side-avatar" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>{t.investor.name[0]}</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: 12 }}>{t.investor.name}</span>
                                                    {t.isUnread && <span style={{ fontSize: 8, color: '#d4a843', fontWeight: 800 }}>NEW MESSAGE</span>}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="m-chat">
                        <header className="m-chat-hd">
                            <div className="m-chat-hd-info">
                                <div className="m-chat-avatar">
                                    <Shield size={18} />
                                </div>
                                <div className="m-chat-text">
                                    <h2 className="m-chat-title">
                                        {activeThread ? `Chat with ${activeThread.investor.name}` : (activeStartup?.name || 'Investor Group')}
                                    </h2>
                                    <div className="m-chat-status">
                                        <div className="m-status-dot" />
                                        <span>Secure Investor Channel</span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div ref={scrollRef} className="m-chat-body">
                            {convLoading ? (
                                <div className="m-chat-loading">
                                    <div className="m-spinner" />
                                </div>
                            ) : !selectedInvestorId ? (
                                <div className="m-chat-empty">
                                    <MessageSquare size={32} />
                                    <p>Select an investor thread to start chatting</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="m-chat-empty">
                                    <MessageSquare size={32} />
                                    <p>Start a conversation with {activeThread?.investor.name}</p>
                                </div>
                            ) : (
                                [...messages].reverse().map((msg: any, i: number) => {
                                    const reversedMessages = [...messages].reverse();
                                    const isMe = msg.sender?.role === 'COMPANY_USER';
                                    const showName = i === 0 || reversedMessages[i - 1].sender?.id !== msg.sender?.id;
                                    return (
                                        <div key={msg.id} className={`m-msg-row ${isMe ? 'mine' : 'theirs'}`}>
                                            {!isMe && showName && <span className="m-msg-name">{msg.sender?.name || 'Investor'}</span>}
                                            <div className="m-msg-bubble">
                                                {msg.body}
                                                <div className="m-msg-time">
                                                    <Clock size={8} />
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <footer className="m-chat-ft">
                            <form onSubmit={handleSend} className="m-input-wrap">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Type a message to your investors..."
                                    disabled={!selectedInvestorId || sendMutation.isPending}
                                    className="m-input"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || !selectedInvestorId || sendMutation.isPending}
                                    className="m-send-btn"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </footer>
                    </div>
                </div>
            </div>
        </>
    );
}

const MSG_CSS = `
.m-root { height: calc(100vh - 120px); animation: m-fadein 0.6s var(--ease-out, cubic-bezier(0.16,1,0.3,1)); }
@keyframes m-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.m-layout { height: 100%; display: flex; gap: 24px; padding-bottom: 24px; }

.m-side { width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
.m-side-title { font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: #3d4f68; letter-spacing: 0.1em; }
.m-side-list { display: flex; flex-direction: column; gap: 8px; }
.m-side-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(212,168,67,0.05); color: #6b7a94; text-align: left; cursor: pointer; transition: all 0.2s; }
.m-side-item.on { background: rgba(212,168,67,0.1); border-color: rgba(212,168,67,0.3); color: #f0e6d0; }
.m-side-item:hover:not(.on) { background: rgba(255,255,255,0.06); color: #f0e6d0; }
.m-side-avatar { width: 24px; height: 24px; border-radius: 6px; background: rgba(212,168,67,0.1); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #d4a843; }

.m-chat { flex: 1; min-width: 0; display: flex; flex-direction: column; background: rgba(10,22,40,0.55); border: 1px solid rgba(212,168,67,0.12); border-radius: 24px; overflow: hidden; backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }

.m-chat-hd { padding: 20px 32px; border-bottom: 1px solid rgba(212,168,67,0.1); background: rgba(6,13,25,0.4); }
.m-chat-hd-info { display: flex; align-items: center; gap: 16px; }
.m-chat-avatar { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #d4a843, #e8c468); display: flex; align-items: center; justify-content: center; color: #060d19; box-shadow: 0 4px 16px rgba(212,168,67,0.2); }
.m-chat-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--cream, #f0e6d0); margin-bottom: 2px; }
.m-chat-status { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #3d4f68; text-transform: uppercase; letter-spacing: 0.05em; }
.m-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 10px rgba(52,211,153,0.5); }

.m-chat-body { flex: 1; padding: 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; scroll-behavior: smooth; }
.m-chat-body::-webkit-scrollbar { width: 5px; }
.m-chat-body::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.1); border-radius: 10px; }

.m-msg-row { display: flex; flex-direction: column; max-width: 75%; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.m-msg-row.mine { align-self: flex-end; align-items: flex-end; }
.m-msg-row.theirs { align-self: flex-start; align-items: flex-start; }

.m-msg-name { font-family: var(--font-mono); font-size: 9px; font-weight: 700; color: #3d4f68; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; }
.m-msg-bubble { 
  padding: 12px 18px; border-radius: 18px; font-size: 14px; line-height: 1.5; color: #f0e6d0; position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.mine .m-msg-bubble { background: linear-gradient(135deg, #d4a843, #e8c468); color: #060d19; font-weight: 500; border-bottom-right-radius: 4px; }
.theirs .m-msg-bubble { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.05); border-bottom-left-radius: 4px; }

.m-msg-time { display: flex; align-items: center; gap: 4px; font-size: 8px; font-family: var(--font-mono); opacity: 0.5; margin-top: 6px; }
.mine .m-msg-time { justify-content: flex-end; color: #060d19; }

.m-chat-ft { padding: 20px 32px; border-top: 1px solid rgba(212,168,67,0.08); background: rgba(6,13,25,0.2); }
.m-input-wrap { position: relative; }
.m-input { width: 100%; height: 54px; background: rgba(6,13,25,0.8); border: 1px solid rgba(212,168,67,0.1); border-radius: 16px; padding: 0 64px 0 20px; color: #f0e6d0; font-size: 14px; transition: all 0.25s; }
.m-input:focus { border-color: #d4a843; outline: none; box-shadow: 0 0 0 4px rgba(212,168,67,0.08); }
.m-send-btn { position: absolute; right: 8px; top: 8px; width: 38px; height: 38px; border-radius: 12px; background: #d4a843; border: none; color: #060d19; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(212,168,67,0.2); }
.m-send-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.m-send-btn:disabled { opacity: 0.4; filter: grayscale(1); }

/* Shimmer */
.m-shimmer { background: linear-gradient(90deg, rgba(10,22,40,0.8) 25%, rgba(15,29,50,0.8) 50%, rgba(10,22,40,0.8) 75%); background-size: 200% 100%; animation: m-shimmer 1.8s ease-in-out infinite; }
@keyframes m-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.m-chat-loading { height: 100%; display: flex; items-center justify-center; opacity: 0.5; }
.m-spinner { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(212,168,67,0.1); border-top-color: #d4a843; animation: m-spin 1s linear infinite; }
@keyframes m-spin { to { transform: rotate(360deg); } }

.m-chat-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; opacity: 0.3; }

.m-empty-root { height: 100%; display: flex; align-items: center; justify-content: center; padding: 40px; }
.m-empty-card { text-align: center; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: 16px; background: rgba(10,22,40,0.4); border: 1px dashed rgba(212,168,67,0.15); border-radius: 24px; padding: 48px; }
.m-empty-card h3 { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: #f0e6d0; }
.m-empty-card p { font-size: 14px; color: #3d4f68; line-height: 1.6; }
`;
