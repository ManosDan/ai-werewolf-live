import React, { useEffect, useRef, useState } from 'react';
import GameHistoryModal from './GameHistoryModal';
import { ROLE_CONFIG } from '../constants';
import { Role } from '../types';

const GameLog = ({ logs, userPlayerId, userRole, showRoles, players }: any) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (!isHistoryOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isHistoryOpen]);

  const isLogVisible = (l: any) => {
    if (l.type === 'THOUGHT' && !showRoles && l.senderId !== userPlayerId) return false;
    if (l.type === 'WOLF_CHANNEL' && !showRoles && userRole !== 'WEREWOLF') return false;
    return true;
  };

  const visibleLogs = logs.filter(isLogVisible);

  const renderLogItem = (l: any) => {
    let containerClass = "mb-3 flex flex-col animate-in slide-in-from-left-2 fade-in duration-300";
    let bubbleClass = "p-3 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[90%]";
    let metaClass = "text-[10px] text-slate-500 mb-1 ml-1 flex items-center gap-2";
    
    // Speech
    if (l.type === 'SPEECH') {
        bubbleClass += " bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700";
        
        // Defensive check for claim config
        const roleConf = (l.claim && l.claim.role) ? ROLE_CONFIG[l.claim.role] : null;

        return (
            <div key={l.id} className={containerClass}>
                <div className={metaClass}>
                    <span className="font-bold text-indigo-400">#{l.senderId} 发言</span>
                    {/* Render Explicit Claim Badge */}
                    {roleConf && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${roleConf.bg} ${roleConf.color} ${roleConf.border} border-opacity-50`}>
                             跳身份: {roleConf.label}
                        </span>
                    )}
                </div>
                <div className={bubbleClass}>{l.content}</div>
            </div>
        );
    }

    // Thoughts
    if (l.type === 'THOUGHT') {
        containerClass += " items-end";
        bubbleClass += " bg-indigo-950/40 text-indigo-300 italic border border-indigo-900/50 rounded-tr-none";
        return (
            <div key={l.id} className={containerClass}>
                <div className={`${metaClass} justify-end`}>
                    <span className="font-bold text-indigo-400">💭 我的想法</span>
                </div>
                <div className={bubbleClass}>{l.content}</div>
            </div>
        );
    }

    // Wolf Channel
    if (l.type === 'WOLF_CHANNEL') {
        bubbleClass += " bg-red-950/40 text-red-300 border border-red-900/50";
        return (
            <div key={l.id} className={containerClass}>
                 <div className={metaClass}>
                    <span className="font-bold text-red-500">🐺 狼队语音</span>
                    <span className="text-red-800">#{l.senderId}</span>
                </div>
                <div className={bubbleClass}>{l.content}</div>
            </div>
        );
    }

    // System Events
    if (l.type === 'SYSTEM' || l.type === 'DEATH' || l.type === 'SHERIFF') {
        let sysColor = "text-slate-400 bg-slate-900/50 border-slate-800";
        if (l.type === 'DEATH') sysColor = "text-red-400 bg-red-950/20 border-red-900/30";
        if (l.type === 'SHERIFF') sysColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";

        return (
             <div key={l.id} className="my-4 flex justify-center">
                <span className={`px-4 py-1.5 rounded-full text-xs font-medium border ${sysColor} shadow-sm text-center`}>
                   {l.content}
                </span>
             </div>
        );
    }

    // Actions
    if (l.type.startsWith('ACTION')) {
        return (
             <div key={l.id} className="mb-2 px-2 text-xs text-slate-500 font-mono flex items-center gap-2 opacity-70">
                <span>⚡</span>
                <span>{l.content}</span>
             </div>
        );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Feed Header */}
      <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-900/90 shadow-sm z-10 shrink-0">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">实时动态</span>
         </div>
         <button 
           onClick={() => setIsHistoryOpen(true)}
           className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 bg-slate-800 px-2 py-1 rounded hover:bg-slate-700"
         >
           <span>📜</span> 复盘
         </button>
      </div>

      {/* Main Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {visibleLogs.map(l => renderLogItem(l))}
        <div ref={bottomRef} />
      </div>

      {/* NEW: Timeline Replay Modal */}
      {isHistoryOpen && (
        <GameHistoryModal 
            logs={logs} 
            players={players || []} 
            onClose={() => setIsHistoryOpen(false)} 
        />
      )}
    </div>
  );
};
export default GameLog;