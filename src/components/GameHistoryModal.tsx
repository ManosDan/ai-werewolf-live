
import React, { useState, useMemo } from 'react';
import { LogMessage, Player, Role } from '../types';
import { ROLE_CONFIG } from '../constants';

interface GameHistoryModalProps {
  logs: LogMessage[];
  players: Player[]; 
  onClose: () => void;
}

const GameHistoryModal: React.FC<GameHistoryModalProps> = ({ logs, players, onClose }) => {
  // 默认开启上帝视角，与主界面保持一致
  const [showHidden, setShowHidden] = useState(true);

  // Helper to get player info
  const getPlayer = (id: number) => players.find(p => p.id === id);

  // Helper: Copy Log
  const handleCopyLog = () => {
    const text = logs.map(l => {
        const claim = l.claim?.role ? ROLE_CONFIG[l.claim.role] : null;
        const roleStr = claim ? `[跳${claim.label}] ` : '';
        const prefix = `[第${l.day}天|${l.phase}]`;

        if (l.type === 'SPEECH') return `${prefix} ${l.senderId}号${roleStr}: ${l.content}`;
        if (l.type === 'THOUGHT') return `${prefix} ${l.senderId}号(心声): ${l.content}`;
        if (l.type === 'SYSTEM' || l.type === 'DEATH' || l.type === 'SHERIFF') return `${prefix} [公告]: ${l.content}`;
        return `${prefix} [${l.type}]: ${l.content}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
        alert("✅ 全局日志已复制到剪贴板！");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
  };

  // 🔥 性能优化：将投票图表的渲染逻辑提取出来，避免内联函数的重复创建 🔥
  const VoteChart = ({ voteLogs }: { voteLogs: LogMessage[] }) => {
    // 预处理数据，避免在 JSX 中做复杂计算
    const { votes, abstain } = useMemo<{ votes: Record<string, number[]>; abstain: number[] }>(() => {
        const v: Record<string, number[]> = {};
        const a: number[] = [];
        
        voteLogs.forEach(l => {
            const targetMatch = l.content.match(/-> (\d+)号/);
            const voterPartMatch = l.content.match(/^(.*?)号? 投票给了/);
            const abstainMatch = l.content.match(/^(.*?)号? 弃票/);

            if (targetMatch && voterPartMatch) {
                const target = targetMatch[1];
                const ids = voterPartMatch[1].match(/\d+/g);
                const voterIds = ids ? (ids as string[]).map(Number) : [];
                if (!v[target]) v[target] = [];
                v[target].push(...voterIds);
            } else if (abstainMatch) {
                const ids = abstainMatch[1].match(/\d+/g);
                const voterIds = ids ? (ids as string[]).map(Number) : [];
                a.push(...voterIds);
            }
        });
        return { votes: v, abstain: a };
    }, [voteLogs]);

    return (
        <div className="bg-slate-900/50 rounded-lg p-3 my-2 border border-slate-700/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-bold">票型统计</div>
            <div className="space-y-2">
                {Object.entries(votes).map(([target, voters]) => (
                    <div key={target} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16 shrink-0">
                            <div className="text-xl">{ROLE_CONFIG[getPlayer(parseInt(target))?.role || Role.UNKNOWN].icon}</div>
                            <div className="text-xs font-bold text-slate-200">{target}号</div>
                        </div>
                        <div className="text-slate-600">←</div>
                        <div className="flex flex-wrap gap-1 flex-1">
                            {(voters as number[]).map(v => (
                                <span key={v} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 border border-slate-700">
                                    {v}号
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
                {abstain.length > 0 && (
                    <div className="flex items-center gap-3 opacity-60">
                         <div className="w-16 text-xs text-slate-500 font-bold shrink-0">弃票</div>
                         <div className="text-slate-600">←</div>
                         <div className="flex flex-wrap gap-1 flex-1">
                            {abstain.map(v => (
                                <span key={v} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">
                                    {v}号
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  // 🔥 核心优化：全量缓存渲染内容 (MemoizedRender) 🔥
  // 只有当 logs 长度变化或 showHidden 切换时才重新计算 DOM
  // 这能极大减少打开弹窗时的 CPU 占用
  const renderedTimeline = useMemo(() => {
    const days: Record<number, LogMessage[]> = {};
    logs.forEach(log => {
      if (!days[log.day]) days[log.day] = [];
      days[log.day].push(log);
    });
    
    const sortedDays = Object.entries(days).sort((a, b) => Number(a[0]) - Number(b[0]));

    return sortedDays.map(([day, dayLogs]) => (
        <div key={day} className="relative">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-y border-slate-700 py-1 px-4 shadow-md">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">第 {day} 天</span>
            </div>

            <div className="p-4 space-y-4 relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800"></div>

                {(() => {
                    const items: React.ReactNode[] = [];
                    let voteBuffer: LogMessage[] = [];

                    const flushVotes = () => {
                        if (voteBuffer.length > 0) {
                            // 使用独立的 Memoized 组件
                            items.push(
                                <div key={`votes-${voteBuffer[0].id}`} className="ml-8 relative">
                                    <VoteChart voteLogs={[...voteBuffer]} />
                                </div>
                            );
                            voteBuffer = [];
                        }
                    };

                    dayLogs.forEach((log) => {
                        // Filter Logic
                        if (!showHidden && (log.type === 'THOUGHT' || log.type === 'WOLF_CHANNEL')) return;
                        if (!showHidden && log.type.startsWith('ACTION') && log.type !== 'ACTION_VOTE') return;

                        if (log.type === 'ACTION_VOTE') {
                            voteBuffer.push(log);
                            return;
                        }

                        flushVotes();

                        let content = null;
                        let icon = '•';
                        
                        if (log.type === 'DEATH') {
                            icon = '💀';
                            content = <div className="bg-red-950/40 border border-red-900/50 p-2 rounded text-red-300 text-sm font-bold">{log.content}</div>;
                        } else if (log.type === 'SHERIFF' && log.content.includes('当选')) {
                            icon = '🤠';
                            content = <div className="bg-amber-950/40 border border-amber-900/50 p-2 rounded text-amber-300 text-sm font-bold">{log.content}</div>;
                        } else if (log.type === 'SPEECH') {
                            const player = getPlayer(log.senderId!);
                            icon = ROLE_CONFIG[player?.role || Role.UNKNOWN].icon;
                            content = (
                                <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none border border-slate-700 text-sm text-slate-300 shadow-sm relative group">
                                    <div className="text-[10px] text-slate-500 mb-1 font-bold flex justify-between">
                                        <span>{log.senderId}号 {player?.name}</span>
                                    </div>
                                    {log.content}
                                </div>
                            );
                        } else if (log.type === 'THOUGHT') {
                            icon = '💭';
                            content = <div className="bg-indigo-950/30 text-indigo-300/80 text-xs italic p-2 rounded border border-indigo-900/30">{log.content}</div>;
                        } else if (log.type === 'WOLF_CHANNEL') {
                            icon = '🐺';
                            content = <div className="bg-red-950/30 text-red-400/80 text-xs p-2 rounded border border-red-900/30 flex flex-col"><span className="text-[9px] font-bold opacity-50 mb-0.5">{log.senderId}号 狼人语音</span>{log.content}</div>;
                        } else if (log.type === 'ACTION_CHECK') {
                            icon = '🔮';
                            content = <div className="text-purple-400 text-xs font-mono border border-purple-900/30 bg-purple-900/20 px-2 py-1 rounded inline-block">{log.content}</div>;
                        } else if (log.type === 'ACTION_SAVE') {
                            icon = '🧪';
                            content = <div className="text-green-400 text-xs font-mono border border-green-900/30 bg-green-900/20 px-2 py-1 rounded inline-block">{log.content}</div>;
                        } else if (log.type === 'ACTION_KILL') {
                            icon = '💉';
                            content = <div className="text-red-400 text-xs font-mono border border-red-900/30 bg-red-900/20 px-2 py-1 rounded inline-block">{log.content}</div>;
                        } else {
                            if (log.content.includes('平安夜')) icon = '🌙';
                            content = <div className="text-slate-500 text-xs py-1">{log.content}</div>;
                        }

                        items.push(
                            <div key={log.id} className="flex gap-4 relative">
                                <div className="w-5 flex flex-col items-center z-10 bg-slate-900 shrink-0">
                                    <span className="text-lg leading-none filter drop-shadow">{icon}</span>
                                </div>
                                <div className="flex-1 pb-2">
                                    {content}
                                </div>
                            </div>
                        );
                    });

                    flushVotes();
                    return items;
                })()}
            </div>
        </div>
    ));
  }, [logs, showHidden, players]); // 依赖项

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-3xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <div>
                  <h2 className="text-lg font-bold text-white">时光回溯</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">TIMELINE REPLAY</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <button 
                  onClick={handleCopyLog}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                  <span>📋</span> 复制剧本
              </button>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showHidden} 
                    onChange={e => setShowHidden(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                  <span className="text-xs font-bold text-slate-300">上帝视角</span>
              </label>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-all text-xl">
                  ✕
              </button>
          </div>
        </div>

        {/* Timeline Body - 渲染缓存的 DOM */}
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700">
            {renderedTimeline}
            
            <div className="p-8 text-center text-slate-600 text-xs font-mono uppercase tracking-widest">
                End of Records
            </div>
        </div>

      </div>
    </div>
  );
};

export default GameHistoryModal;
