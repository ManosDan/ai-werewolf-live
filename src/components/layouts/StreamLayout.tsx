import React from 'react';
import { Player, Phase, LogMessage, GameState } from '../../types';
import PlayerCard from '../PlayerCard';
import TacticalOverlay from '../TacticalOverlay';
import VoteBoard from '../VoteBoard';
import GodEyeBoard from '../GodEyeBoard';

interface StreamLayoutProps {
    players: Player[];
    cardRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    gridContainerRef: React.RefObject<HTMLDivElement>;
    phase: Phase;
    showRoles: boolean;
    userPlayerId: number | null;
    activeBubbles: Map<number, { text: string, type: 'SPEECH'|'THOUGHT' }>;
    thinkingPlayers: Set<number>;
    speakingPlayerId: number | null;
    currentSpeech: string | null;
    currentThought: string | null;
    isAnyActive: boolean;
    logs: LogMessage[];
    isGreenScreen?: boolean;
    gameState: GameState;
    // 🔥 必须接收这个参数
    showThoughts: boolean;
}

const StreamLayout: React.FC<StreamLayoutProps> = ({
    players, cardRefs, gridContainerRef, phase, showRoles, userPlayerId,
    activeBubbles, thinkingPlayers, speakingPlayerId, currentSpeech, currentThought, isAnyActive, logs,
    gameState, showThoughts
}) => {
    
    const shouldRevealRole = (p: Player) => {
        if (showRoles) return true;
        if (userPlayerId === p.id) return true;
        if (p.isRoleRevealed) return true;
        const user = players.find(player => player.id === userPlayerId);
        if (user?.role === 'WEREWOLF' && p.role === 'WEREWOLF') return true;
        return false;
    };

    const isSheriffNomination = phase === Phase.DAY_SHERIFF_NOM;

    const getCardStyle = (index: number, total: number, isFocus: boolean): React.CSSProperties => {
        const BASE_Y = 40; 
        
        if (isFocus) {
            return {
                position: 'absolute', left: '50%', top: `${BASE_Y}%`, 
                transform: 'translate(-50%, -50%) scale(1.1)', 
                width: '320px', height: '420px', zIndex: 2000, 
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            };
        }
        
        const angleOffset = -Math.PI / 2; 
        const angle = (index / total) * 2 * Math.PI + angleOffset;
        const radiusX = 38; 
        const radiusY = 32; 
        
        const offsetX = Math.cos(angle) * radiusX; 
        const offsetY = Math.sin(angle) * radiusY; 
        
        const scale = 0.85 + Math.sin(angle) * 0.1; 
        const zIndex = 100 + Math.floor(Math.sin(angle) * 20);
        
        return {
            position: 'absolute', left: `calc(50% + ${offsetX}%)`, top: `calc(${BASE_Y}% + ${offsetY}%)`, 
            transform: `translate(-50%, -50%) scale(${scale})`, 
            width: '200px', height: '260px', 
            zIndex: zIndex,
            opacity: (speakingPlayerId && !isFocus) ? 0.8 : 1, 
            filter: (speakingPlayerId && !isFocus) ? 'brightness(0.6) grayscale(0.3)' : 'none',
            transition: 'all 0.5s ease-out' 
        };
    };

    const getCardProps = (player: Player) => {
        const bubble = activeBubbles.get(player.id);
        const isSeqSpeaking = speakingPlayerId === player.id;
        const isSpeaking = isSeqSpeaking || (bubble?.type === 'SPEECH');
        const isThinking = thinkingPlayers.has(player.id);
        const contentSpeech = isSeqSpeaking ? currentSpeech : (bubble?.type === 'SPEECH' ? bubble.text : null);
        const contentThought = isSeqSpeaking ? currentThought : (bubble?.type === 'THOUGHT' ? bubble.text : null);
        return {
            player, isSpeaking, isThinking, currentSpeech: contentSpeech, currentThought: contentThought,
            revealRole: shouldRevealRole(player), isUser: userPlayerId === player.id,
            votesReceived: players.filter(p => p.voteTarget === player.id && phase.includes('VOTE')).length,
            onSelect: () => {}, isAnyActive,
            isScanning: isSheriffNomination,
            showThoughts // 传下去
        };
    };

    const isAnyThinking = thinkingPlayers.size > 0;
    const isCoreActive = isAnyThinking || isSheriffNomination; 

    return (
        <div 
            ref={gridContainerRef} 
            className="fixed inset-0 z-0 overflow-hidden"
            style={{ 
                background: 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #020617 80%)' 
            }}
        >
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[60%] rounded-[100%] border border-indigo-500/10 bg-indigo-500/5 blur-3xl pointer-events-none z-0"></div>
            
            <div 
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center transition-all duration-500"
                style={{ top: '40%' }}
            >
                <div className={`
                    w-64 h-64 rounded-full border border-cyan-500/30 flex items-center justify-center transition-all duration-300
                    bg-cyan-950/20 backdrop-blur-sm shadow-[0_0_80px_rgba(6,182,212,0.15)]
                    ${isCoreActive ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}
                `}>
                     <div className={`absolute inset-0 rounded-full border-t-2 border-b-2 border-cyan-400 opacity-60 ${isCoreActive ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }}></div>
                     <div className="text-xl font-mono font-bold tracking-widest text-cyan-200 animate-pulse">
                        {isSheriffNomination ? 'VOTING' : 'AI CORE'}
                     </div>
                </div>
            </div>

            <div className="absolute inset-0 pointer-events-none z-10">
                <TacticalOverlay 
                    players={players} cardRefs={cardRefs} phase={phase} showRoles={showRoles} containerRef={gridContainerRef} logs={logs}
                    thinkingPlayers={thinkingPlayers} isGreenScreen={false}
                />
            </div>

            <VoteBoard 
                players={players} 
                phase={phase} 
                isGreenScreen={false} 
                candidates={
                    phase === Phase.DAY_SHERIFF_VOTE ? gameState.sheriffCandidates :
                    phase === Phase.DAY_SHERIFF_PK_VOTE ? gameState.pkCandidates :
                    phase === Phase.DAY_PK_VOTE ? gameState.pkCandidates :
                    [] 
                }
            />
            <GodEyeBoard gameState={gameState} isGreenScreen={false} />

            {players.map((p, i) => {
                const isFocus = speakingPlayerId === p.id;
                const style = getCardStyle(i, players.length, isFocus);
                const cardProps = getCardProps(p);

                return (
                    <div
                        key={p.id}
                        style={style} 
                        className="flex items-center justify-center pointer-events-auto"
                        ref={el => { 
                            if(el) cardRefs.current.set(p.id, el);
                            else cardRefs.current.delete(p.id);
                        }}
                    >
                        <div className={`w-full h-full relative transition-all duration-300 ${isFocus ? 'shadow-[0_0_100px_rgba(99,102,241,0.6)]' : 'shadow-2xl'}`}>
                            <PlayerCard 
                                {...cardProps}
                                compact={false} 
                                // 🔥🔥🔥 关键修正：isFocus 时也不要隐藏气泡！🔥🔥🔥
                                hideBubble={false} 
                                isGreenScreen={false} 
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StreamLayout;