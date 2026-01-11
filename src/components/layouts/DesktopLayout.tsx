import React from 'react';
import { Player, Phase, LogMessage } from '../../types';
import PlayerCard from '../PlayerCard';
import TacticalOverlay from '../TacticalOverlay';
import { AnimatePresence } from 'framer-motion';

interface DesktopLayoutProps {
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
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
    players, cardRefs, gridContainerRef, phase, showRoles, userPlayerId,
    activeBubbles, thinkingPlayers, speakingPlayerId, currentSpeech, currentThought, isAnyActive, logs
}) => {
    
    // Helper logic moved from App.tsx loop
    const shouldRevealRole = (p: Player) => {
        if (showRoles) return true;
        if (userPlayerId === p.id) return true;
        // 🔥 核心修改：只看 isRoleRevealed (只有猎人开枪才变 true，普通死法是 false)
        if (p.isRoleRevealed) return true;
        
        const user = players.find(player => player.id === userPlayerId);
        if (user?.role === 'WEREWOLF' && p.role === 'WEREWOLF') return true;
        return false;
    };

    return (
        <div 
            ref={gridContainerRef} 
            className="grid grid-cols-4 grid-rows-3 gap-4 md:gap-6 lg:gap-8 w-full h-full relative perspective-1000"
        >
            <AnimatePresence>
            {players.map((player) => {
                const bubble = activeBubbles.get(player.id);
                const isSeqSpeaking = speakingPlayerId === player.id;
                const isSpeaking = isSeqSpeaking || (bubble?.type === 'SPEECH');
                const isThinking = thinkingPlayers.has(player.id);
                const contentSpeech = isSeqSpeaking ? currentSpeech : (bubble?.type === 'SPEECH' ? bubble.text : null);
                const contentThought = isSeqSpeaking ? currentThought : (bubble?.type === 'THOUGHT' ? bubble.text : null);
                
                return (
                    <div 
                        id={`player-card-${player.id}`} 
                        key={player.id} 
                        className={`w-full h-full relative min-h-0 transition-all duration-300 ${isSpeaking || isThinking ? 'z-50' : 'z-10'}`}
                    >
                        <PlayerCard 
                            ref={(el: HTMLDivElement | null) => {
                                if (el) cardRefs.current.set(player.id, el);
                                else cardRefs.current.delete(player.id);
                            }}
                            player={player}
                            isSpeaking={isSpeaking}
                            isThinking={isThinking}
                            currentSpeech={contentSpeech}
                            currentThought={contentThought}
                            revealRole={shouldRevealRole(player)}
                            isUser={userPlayerId === player.id}
                            votesReceived={players.filter(p => p.voteTarget === player.id && phase.includes('VOTE')).length}
                            onSelect={() => {}}
                            isAnyActive={isAnyActive} 
                        />
                    </div>
                );
            })}
            </AnimatePresence>
            <TacticalOverlay 
                players={players} 
                cardRefs={cardRefs} 
                phase={phase}
                showRoles={showRoles}
                containerRef={gridContainerRef}
                logs={logs}
                thinkingPlayers={thinkingPlayers}
                isGreenScreen={false}
            />
        </div>
    );
};
export default DesktopLayout;