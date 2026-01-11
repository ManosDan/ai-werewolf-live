import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types';

interface SubtitleBarProps {
    player: Player | null;
    text: string | null;
}

const SubtitleBar: React.FC<SubtitleBarProps> = ({ player, text }) => {
    // 状态提升：将打字机索引的管理放在组件内部
    const [visibleCount, setVisibleCount] = useState(0);
    
    // 当文本或说话人改变时，重置打字机
    useEffect(() => {
        setVisibleCount(0);
        if (!text) return;

        const interval = setInterval(() => {
            setVisibleCount(prev => {
                if (prev >= text.length) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 40); // 40ms 打字速度

        return () => clearInterval(interval);
    }, [text, player?.id]);

    // 如果没有内容，渲染空占位，保证 AnimatePresence 正常工作
    if (!player || !text) return null;

    const displayedText = text.slice(0, visibleCount);

    return (
        <AnimatePresence mode="wait">
            {/* 🔥 关键修复：给 motion.div 加上唯一的 key，这是 React 识别动画对象的身份证 */}
            <motion.div 
                key={player.id + '-' + (text.slice(0, 10))} // 只要说话人或开头文字变了，就视为新字幕
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-[15%] left-4 right-4 z-[90] flex flex-col items-center pointer-events-none"
            >
                {/* 发言人名字 */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-t-lg border-x-2 border-t-2 border-white shadow-lg translate-y-1">
                    {player.id}号 {player.name}
                </div>

                {/* 字幕主体 */}
                <div className="bg-slate-900/90 border-4 border-white rounded-2xl p-4 shadow-[0_8px_16px_rgba(0,0,0,0.8)] w-full max-w-4xl text-center relative overflow-hidden">
                    {/* 装饰光效 */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>
                    
                    <p className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md" 
                       style={{ textShadow: '2px 2px 0 #000, -1px -1px 0 #000' }}>
                        {displayedText}
                        {/* 闪烁光标 */}
                        <span className="inline-block w-1 h-6 ml-1 bg-indigo-400 animate-pulse align-middle"/>
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SubtitleBar;