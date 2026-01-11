import React, { useEffect, useState } from 'react';
import { Player, Phase } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface VoteBoardProps {
    players: Player[];
    phase: Phase;
    isGreenScreen: boolean;
    candidates?: number[]; 
}

// 缓存数据接口
interface CachedVoteData {
    sortedTargets: number[];
    voteMap: Record<number, Player[]>;
    abstainers: Player[];
    totalVoters: number;
}

const VoteBoard: React.FC<VoteBoardProps> = ({ players, phase, isGreenScreen, candidates = [] }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [cachedData, setCachedData] = useState<CachedVoteData | null>(null);

    const isVotePhase = [
        Phase.DAY_VOTE, Phase.DAY_PK_VOTE, 
        Phase.DAY_SHERIFF_VOTE, Phase.DAY_SHERIFF_PK_VOTE
    ].includes(phase);

    // 🔥 核心逻辑：数据快照 🔥
    useEffect(() => {
        if (isVotePhase) {
            setIsVisible(true);
            
            // 实时计算投票数据
            const voteMap: Record<number, Player[]> = {};
            const abstainers: Player[] = [];
            candidates.forEach(id => { voteMap[id] = []; });

            players.forEach(p => {
                if (!p.isAlive) return;
                if (p.voteTarget && p.voteTarget !== 0) {
                    if (!voteMap[p.voteTarget]) voteMap[p.voteTarget] = [];
                    voteMap[p.voteTarget].push(p);
                } else {
                    const isCandidateInSheriff = (phase === Phase.DAY_SHERIFF_VOTE || phase === Phase.DAY_SHERIFF_PK_VOTE) && candidates.includes(p.id);
                    if (!isCandidateInSheriff) abstainers.push(p);
                }
            });

            const sortedTargets = Object.keys(voteMap)
                .map(Number)
                .sort((a, b) => voteMap[b].length - voteMap[a].length);

            // 更新缓存，只有当有有效数据时
            setCachedData({
                sortedTargets,
                voteMap,
                abstainers,
                totalVoters: players.filter(p => p.isAlive).length
            });
        } else {
            // 当阶段结束时，延时关闭
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 6000); // 留存6秒
            return () => clearTimeout(timer);
        }
    }, [phase, players, isVotePhase, candidates]);

    if (!isVisible || !cachedData) return null;

    const { sortedTargets, voteMap, abstainers, totalVoters } = cachedData;

    const containerClass = isGreenScreen
        ? "bg-slate-900 border-2 border-yellow-500 shadow-none" 
        : "bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                // 🔥 放大：宽度 w-72 -> w-96 (约384px)
                className={`fixed z-[3000] top-28 right-6 w-96 rounded-xl overflow-hidden flex flex-col ${containerClass}`}
            >
                <div className={`px-4 py-3 font-black text-center uppercase tracking-widest text-sm ${isGreenScreen ? 'bg-yellow-600 text-black' : 'bg-indigo-900/50 text-indigo-200'}`}>
                    📊 投票结果 (总人数: {totalVoters})
                </div>

                <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                    {sortedTargets.map(targetId => {
                        // 注意：这里需要从 cachedData 或者 current players 拿名字，为了防止人死了名字没了，我们还是尝试从 current players 拿
                        const target = players.find(p => p.id === targetId);
                        const voters = voteMap[targetId];
                        
                        return (
                             <div key={targetId} className="flex flex-col gap-1 mb-1">
                                <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                            {targetId}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-200 leading-none">{target?.name || `Player ${targetId}`}</span>
                                            {isGreenScreen && <span className="text-[10px] text-slate-500">候选人</span>}
                                        </div>
                                    </div>
                                    <div className={`text-base font-black px-3 py-0.5 rounded ${voters.length > 0 ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        {voters.length}票
                                    </div>
                                </div>
                                
                                {voters.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pl-11">
                                        {voters.map(v => (
                                            <div key={v.id} className="relative group/voter">
                                                <div className="w-6 h-6 rounded bg-slate-700 border border-slate-500 flex items-center justify-center text-[10px] text-slate-300 cursor-help font-bold">
                                                    {v.id}
                                                </div>
                                                {!isGreenScreen && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover/voter:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                                        {v.name}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {abstainers.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                             <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-xs text-slate-400 font-bold uppercase">弃票 / 未投票</span>
                                <span className="text-xs text-slate-500">{abstainers.length}</span>
                             </div>
                             <div className="flex flex-wrap gap-1.5">
                                {abstainers.map(v => (
                                    <div key={v.id} className="w-6 h-6 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                        {v.id}
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VoteBoard;