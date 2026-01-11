import React, { useEffect, useState } from 'react';
import { GameState, Phase, Role, Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface GodEyeBoardProps {
    gameState: GameState;
    isGreenScreen: boolean;
}

const GodEyeBoard: React.FC<GodEyeBoardProps> = ({ gameState, isGreenScreen }) => {
    const { phase, players, guardProtectId, nightVictimId, witchPotionUsed, witchPoisonUsed, seerCheckId } = gameState;
    const [isVisible, setIsVisible] = useState(false);

    // 只有在夜间或白天公布结果前显示
    const isActivePhase = [
        Phase.NIGHT_START, Phase.NIGHT_GUARD, Phase.NIGHT_WEREWOLF, 
        Phase.NIGHT_WITCH, Phase.NIGHT_SEER, Phase.DAY_ANNOUNCE
    ].includes(phase);

    useEffect(() => {
        let timer: any;
        if (isActivePhase) {
            setIsVisible(true);
        } else {
            // 🔥 延时 5 秒消失，给观众留点时间看
            timer = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [isActivePhase]);

    if (!isVisible) return null;

    const getName = (id: number | null) => {
        if (!id) return '空';
        const p = players.find(pl => pl.id === id);
        return p ? `${id}号 ${p.name}` : `${id}号`;
    };

    const getSeerResult = () => {
        if (!seerCheckId) return null;
        const target = players.find(p => p.id === seerCheckId);
        if (!target) return null;
        return target.role === Role.WEREWOLF ? '查杀 🐺' : '金水 😇';
    };

    const containerClass = isGreenScreen
        ? "bg-slate-900 border-2 border-red-500 shadow-none" 
        : "bg-black/70 backdrop-blur-md border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                // 🔥 放大：宽度从 w-64 加大到 w-80
                className={`fixed z-[3000] top-28 left-6 w-80 rounded-xl overflow-hidden ${containerClass}`}
            >
                {/* 标题 */}
                <div className={`px-4 py-2 font-black text-center uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${isGreenScreen ? 'bg-red-600 text-black' : 'bg-red-900/40 text-red-200'}`}>
                    <span>👁️</span>
                    <span>上帝视角 · 夜间情报</span>
                </div>

                {/* 字体放大 */}
                <div className="p-4 flex flex-col gap-4 text-base">
                    {/* 1. 守卫信息 */}
                    {(phase === Phase.NIGHT_GUARD || guardProtectId) && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2 text-emerald-400">
                                <span className="text-xl">🛡️</span>
                                <span className="font-bold">守卫</span>
                            </div>
                            <div className="font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded border border-emerald-500/30">
                                {guardProtectId ? getName(guardProtectId) : '空守'}
                            </div>
                        </motion.div>
                    )}

                    {/* 2. 狼人信息 */}
                    {(phase === Phase.NIGHT_WEREWOLF || nightVictimId) && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2 text-red-400">
                                <span className="text-xl">🐺</span>
                                <span className="font-bold">狼刀</span>
                            </div>
                            <div className="font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded border border-red-500/30">
                                {nightVictimId ? getName(nightVictimId) : '思考中...'}
                            </div>
                        </motion.div>
                    )}

                    {/* 3. 女巫信息 */}
                    {(phase === Phase.NIGHT_WITCH || witchPotionUsed || witchPoisonUsed) && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-400">
                                    <span className="text-xl">🧪</span>
                                    <span className="font-bold">女巫</span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    {!witchPotionUsed && !witchPoisonUsed && phase !== Phase.NIGHT_WITCH && "未使用"}
                                    {phase === Phase.NIGHT_WITCH && !witchPotionUsed && !witchPoisonUsed && "思考中..."}
                                </div>
                            </div>
                            {witchPotionUsed && (
                                <div className="flex justify-end">
                                    <span className="text-sm font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                                        使用解药 💊
                                    </span>
                                </div>
                            )}
                            {witchPoisonUsed && (
                                <div className="flex justify-end">
                                    <span className="text-sm font-bold text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                                        使用毒药 ☠️
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* 4. 预言家信息 */}
                    {(phase === Phase.NIGHT_SEER || seerCheckId) && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col gap-2"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-400">
                                    <span className="text-xl">🔮</span>
                                    <span className="font-bold">查验</span>
                                </div>
                                <div className="font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded border border-blue-500/30">
                                    {seerCheckId ? getName(seerCheckId) : '思考中...'}
                                </div>
                            </div>
                            {seerCheckId && (
                                <div className="flex justify-end">
                                    <span className={`text-sm font-bold px-3 py-0.5 rounded ${
                                        getSeerResult()?.includes('狼') ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'
                                    }`}>
                                        {getSeerResult()}
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GodEyeBoard; 