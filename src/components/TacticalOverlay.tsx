import React, { useEffect, useState } from 'react';
import { Player, Phase, Role, LogMessage } from '../types';

interface TacticalOverlayProps {
    players: Player[];
    cardRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    phase: Phase;
    showRoles: boolean; 
    containerRef: React.RefObject<HTMLDivElement>;
    logs: LogMessage[];
    thinkingPlayers: Set<number>;
    isGreenScreen: boolean;
}

interface LineData {
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    color: string;
    type: 'VOTE' | 'KILL' | 'CHECK' | 'GUARD' | 'SUSPECT' | 'THINKING'; 
}

const TacticalOverlay: React.FC<TacticalOverlayProps> = ({ players, cardRefs, phase, showRoles, containerRef, logs, thinkingPlayers, isGreenScreen }) => {
    const [lines, setLines] = useState<LineData[]>([]);

    useEffect(() => {
        const updateLines = () => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newLines: LineData[] = [];

            const centerX = containerRect.width / 2;
            const centerY = containerRect.height * (isGreenScreen ? 0.40 : 0.55);

            // 1. 思考连线
            thinkingPlayers.forEach(playerId => {
                const sourceEl = cardRefs.current.get(playerId);
                if (sourceEl) {
                    const srcRect = sourceEl.getBoundingClientRect();
                    const from = { 
                        x: srcRect.left - containerRect.left + srcRect.width / 2, 
                        y: srcRect.top - containerRect.top + srcRect.height / 2 
                    };
                    const to = { x: centerX, y: centerY };
                    newLines.push({ id: `THINK-${playerId}`, from, to, color: '#06b6d4', type: 'THINKING' });
                }
            });

            // 2. 战术动作连线
            players.forEach(p => {
                if (!p.voteTarget || p.voteTarget === 0) return;
                
                let color = 'transparent';
                let type: LineData['type'] = 'VOTE';
                let isVisible = false;

                // Day Vote
                if ((phase === Phase.DAY_VOTE || phase === Phase.DAY_PK_VOTE || phase === Phase.DAY_SHERIFF_VOTE || phase === Phase.DAY_SHERIFF_PK_VOTE) && p.isAlive) {
                    color = '#3b82f6'; 
                    type = 'VOTE';
                    isVisible = true;
                }
                // Night Kill
                else if (phase === Phase.NIGHT_WEREWOLF && p.role === Role.WEREWOLF && p.isAlive) {
                     if (showRoles || p.role === Role.WEREWOLF) { 
                         color = '#ef4444'; 
                         type = 'KILL';
                         isVisible = showRoles; 
                     }
                }
                // Seer/Guard
                else if (phase === Phase.NIGHT_SEER && p.role === Role.SEER && showRoles) {
                    color = '#a855f7'; 
                    type = 'CHECK';
                    isVisible = true;
                }
                else if (phase === Phase.NIGHT_GUARD && p.role === Role.GUARD && showRoles) {
                     color = '#22c55e'; 
                     type = 'GUARD';
                     isVisible = true;
                }

                if (!isVisible) return;

                const sourceEl = cardRefs.current.get(p.id);
                const targetEl = cardRefs.current.get(p.voteTarget);

                if (sourceEl && targetEl) {
                    const srcRect = sourceEl.getBoundingClientRect();
                    const tgtRect = targetEl.getBoundingClientRect();
                    // 🔥 坐标计算防御：防止除以0或无效Rect
                    if (srcRect.width > 0 && tgtRect.width > 0) {
                        const from = { x: srcRect.left - containerRect.left + srcRect.width / 2, y: srcRect.top - containerRect.top + srcRect.height / 2 };
                        const to = { x: tgtRect.left - containerRect.left + tgtRect.width / 2, y: tgtRect.top - containerRect.top + tgtRect.height / 2 };
                        newLines.push({ id: `${p.id}-${p.voteTarget}-${type}`, from, to, color, type });
                    }
                }
            });

            // 3. 怀疑链
            const lastMatrixLog = logs.slice().reverse().find(l => l.metadata?.matrix);
            if (lastMatrixLog && lastMatrixLog.senderId) {
                const sender = players.find(p => p.id === lastMatrixLog.senderId);
                if (sender && sender.isAlive) {
                    const matrix = lastMatrixLog.metadata!.matrix;
                    matrix.forEach((m: any) => {
                         if (m.aggression > 60) {
                             const target = players.find(p => p.id === m.playerId);
                             if (target) {
                                 const sourceEl = cardRefs.current.get(sender.id);
                                 const targetEl = cardRefs.current.get(target.id);
                                 if (sourceEl && targetEl) {
                                     const srcRect = sourceEl.getBoundingClientRect();
                                     const tgtRect = targetEl.getBoundingClientRect();
                                     const from = { x: srcRect.left - containerRect.left + srcRect.width / 2, y: srcRect.top - containerRect.top + srcRect.height / 2 };
                                     const to = { x: tgtRect.left - containerRect.left + tgtRect.width / 2, y: tgtRect.top - containerRect.top + tgtRect.height / 2 };
                                     newLines.push({ id: `${sender.id}-${target.id}-SUSPECT`, from, to, color: '#f97316', type: 'SUSPECT' });
                                 }
                             }
                         }
                    });
                }
            }

            setLines(newLines);
        };
        
        // 🔥 强化：不仅仅监听 resize，还设置一个定时器强制刷新几次，确保动画结束后的位置正确
        updateLines();
        window.addEventListener('resize', updateLines);
        let raf = requestAnimationFrame(function loop(){ updateLines(); raf = requestAnimationFrame(loop); });
        
        return () => { window.removeEventListener('resize', updateLines); cancelAnimationFrame(raf); };
    }, [players, phase, showRoles, logs, thinkingPlayers, isGreenScreen]);

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="10" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" /></marker>
                <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="10" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ef4444" /></marker>
                <marker id="arrow-purple" markerWidth="6" markerHeight="6" refX="10" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#a855f7" /></marker>
                <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="10" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#22c55e" /></marker>
                <marker id="arrow-orange" markerWidth="6" markerHeight="6" refX="10" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#f97316" /></marker>
            </defs>
            {lines.map(line => {
                const markerId = line.type === 'VOTE' ? 'url(#arrow-blue)' :
                    line.type === 'KILL' ? 'url(#arrow-red)' :
                    line.type === 'GUARD' ? 'url(#arrow-green)' : 
                    line.type === 'SUSPECT' ? 'url(#arrow-orange)' : 
                    line.type === 'CHECK' ? 'url(#arrow-purple)' : 'none';
                
                return (
                    <g key={line.id} filter="url(#glow)">
                        {line.type === 'THINKING' ? (
                            <>
                                <path d={`M${line.from.x},${line.from.y} L${line.to.x},${line.to.y}`} stroke={line.color} strokeWidth={2} strokeOpacity="0.3" fill="none" />
                                <path d={`M${line.from.x},${line.from.y} L${line.to.x},${line.to.y}`} stroke={line.color} strokeWidth={3} fill="none" strokeDasharray="5,10" strokeLinecap="round">
                                   <animate attributeName="stroke-dashoffset" from="15" to="0" dur="0.2s" repeatCount="indefinite" />
                                </path>
                            </>
                        ) : (
                            <>
                                <path d={`M${line.from.x},${line.from.y} L${line.to.x},${line.to.y}`} stroke={line.color} strokeWidth={line.type === 'SUSPECT' ? 4 : 6} strokeOpacity="0.3" fill="none" strokeLinecap="round" />
                                <path d={`M${line.from.x},${line.from.y} L${line.to.x},${line.to.y}`} stroke={line.color} strokeWidth={line.type === 'SUSPECT' ? 2 : 3} fill="none" markerEnd={markerId} strokeDasharray={line.type === 'VOTE' ? "0" : "10,10"} strokeLinecap="round">
                                   {line.type !== 'VOTE' && (<animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />)}
                                </path>
                                {line.type === 'VOTE' && (<circle r="4" fill="white"><animateMotion dur="1s" repeatCount="indefinite" path={`M${line.from.x},${line.from.y} L${line.to.x},${line.to.y}`} /></circle>)}
                            </>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default TacticalOverlay;