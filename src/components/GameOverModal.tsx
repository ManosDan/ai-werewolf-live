
import React from 'react';
import { Player, Role, Faction } from '../types';
import { ROLE_CONFIG } from '../constants';

interface GameOverModalProps {
  winner: Faction;
  players: Player[];
  onRestart: () => void;
  onViewHistory: () => void; // 🔥 新增接口定义
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, players, onRestart, onViewHistory }) => {
  const isGoodWin = winner === Faction.GOOD;
  const sortedPlayers = [...players].sort((a, b) => a.id - b.id);

  const theme = isGoodWin ? {
      bg: 'bg-slate-900/95 shadow-indigo-500/20',
      titleGradient: 'from-amber-300 via-yellow-200 to-amber-500',
      titleText: '好人阵营 胜利',
      icon: '🏆',
      borderColor: 'border-amber-500/30'
  } : {
      bg: 'bg-slate-950/95 shadow-red-900/20',
      titleGradient: 'from-red-500 via-rose-500 to-red-800',
      titleText: '狼人阵营 屠城',
      icon: '🐺',
      borderColor: 'border-red-500/30'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-700 backdrop-blur-sm bg-black/60">
      
      <div className={`w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border-2 ${theme.borderColor} ${theme.bg} shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500`}>
        
        {/* Header */}
        <div className="relative pt-10 pb-6 text-center shrink-0">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b ${isGoodWin ? 'from-amber-500/20' : 'from-red-600/20'} to-transparent blur-3xl -z-10 pointer-events-none`}></div>
            <div className="text-6xl mb-4 filter drop-shadow-lg animate-bounce duration-[2000ms]">{theme.icon}</div>
            <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-widest bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent drop-shadow-sm`}>
                {theme.titleText}
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-mono uppercase tracking-[0.2em]">Game Settlement</p>
        </div>

        {/* Player Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-black/20 scrollbar-thin scrollbar-thumb-white/10">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sortedPlayers.map(p => {
                    const config = ROLE_CONFIG[p.role];
                    const isWinner = (isGoodWin && p.role !== Role.WEREWOLF) || (!isGoodWin && p.role === Role.WEREWOLF);
                    
                    return (
                        <div key={p.id} className={`relative group flex flex-col items-center p-3 rounded-xl border transition-all duration-300 ${
                            isWinner 
                                ? 'bg-gradient-to-br from-white/10 to-transparent border-white/20 shadow-lg' 
                                : 'bg-slate-900/50 border-slate-800 opacity-60 grayscale-[0.8]'
                        }`}>
                            {isWinner && <div className="absolute -top-2 -right-2 text-lg filter drop-shadow">🌟</div>}
                            <div className="relative mb-2">
                                <div className={`text-3xl ${!p.isAlive ? 'filter grayscale brightness-50' : ''}`}>
                                    {config.icon}
                                </div>
                                {!p.isAlive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-red-600 text-3xl font-black drop-shadow-md">✕</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-center w-full">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] flex items-center justify-center text-slate-400 font-bold border border-slate-700">{p.id}</span>
                                    <span className="font-bold text-slate-200 text-xs truncate max-w-[60px]">{p.name}</span>
                                </div>
                                <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider mb-1 ${config.bg} ${config.color} border ${config.border} bg-opacity-20`}>
                                    {config.label}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono">
                                    {p.isAlive ? <span className="text-emerald-500">存活</span> : '死亡'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-center gap-4 shrink-0">
             {/* 🔥 新增：查看复盘按钮 🔥 */}
             <button
                onClick={onViewHistory}
                className="px-6 py-4 rounded-2xl font-bold text-lg border border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/30 transition-all flex items-center gap-2 shadow-lg"
             >
                <span>📜</span>
                <span>查看复盘</span>
             </button>

             <button 
                onClick={onRestart}
                className={`px-12 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 ${
                    isGoodWin 
                    ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20' 
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                }`}
             >
                <span>↺</span>
                <span>再来一局</span>
             </button>
        </div>

      </div>
    </div>
  );
};

export default GameOverModal;
