import React, { useState, useEffect, useRef } from 'react';
import { 
  Player, Role, Phase, GameState, LogMessage, Faction, AnimationEvent, AIProvider, PlayerClaim, SpeechMetadata,
  AIResponse 
} from './types';
import { 
  AI_NAMES, INITIAL_ROLE_DISTRIBUTION, AI_PROVIDERS, ROLE_CONFIG, MODEL_CATALOG, PLAYSTYLES, 
  getPlayerConfig 
} from './constants';
import { generatePlayerTurn } from './services/geminiService';
import { speak, testAudio, cancelSpeech, loadVoices, prefetch, playAudio } from './services/ttsService';
import PlayerCard from './components/PlayerCard';
import GameLog from './components/GameLog'; 
import ControlPanel from './components/ControlPanel';
import AnimationLayer from './components/AnimationLayer';
import GameOverModal from './components/GameOverModal';
import TacticalOverlay from './components/TacticalOverlay';
import GameHistoryModal from './components/GameHistoryModal'; 
import SubtitleBar from './components/SubtitleBar';
import SoundManager from './components/SoundManager';
import StreamLayout from './components/layouts/StreamLayout';
import DesktopLayout from './components/layouts/DesktopLayout';
import { motion, AnimatePresence } from 'framer-motion';

const shuffle = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const translatePhase = (phase: Phase): string => {
  switch (phase) {
    case Phase.SETUP: return '游戏准备';
    case Phase.NIGHT_START: return '入夜';
    case Phase.NIGHT_GUARD: return '守卫行动';
    case Phase.NIGHT_WEREWOLF: return '狼人行动';
    case Phase.NIGHT_WITCH: return '女巫行动';
    case Phase.NIGHT_SEER: return '预言家行动';
    case Phase.DAY_START: return '天亮';
    case Phase.DAY_SHERIFF_NOM: return '警长竞选';
    case Phase.DAY_SHERIFF_SPEECH: return '竞选发言';
    case Phase.DAY_SHERIFF_VOTE: return '竞选投票';
    case Phase.DAY_SHERIFF_PK_SPEECH: return '警长PK发言';
    case Phase.DAY_SHERIFF_PK_VOTE: return '警长PK投票';
    case Phase.DAY_ANNOUNCE: return '公布昨夜';
    case Phase.DAY_LAST_WORDS: return '遗言环节';
    case Phase.DAY_DISCUSS: return '自由讨论';
    case Phase.DAY_VOTE: return '放逐投票';
    case Phase.DAY_PK_SPEECH: return '放逐PK发言';
    case Phase.DAY_PK_VOTE: return '放逐PK投票';
    case Phase.DAY_EXECUTE: return '执行放逐';
    case Phase.SHERIFF_HANDOVER: return '移交警徽';
    case Phase.GAME_OVER: return '游戏结束';
    default: return phase;
  }
};

async function processWithStagger<T, R>(items: T[], batchSize: number, delay: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`[Concurrency] 正在处理第 ${i / batchSize + 1} 批次 (${batch.length} 个请求)...`);
    const batchResults = await Promise.all(batch.map(task));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return results;
}

const getNextAlivePlayer = (currentId: number, players: Player[]): number => {
  const maxId = 12;
  let nextId = currentId;
  for (let i = 0; i < maxId; i++) {
    nextId = (nextId % maxId) + 1;
    const player = players.find(p => p.id === nextId);
    if (player && player.isAlive) return nextId;
  }
  return 0;
};

const generateSpeakingOrder = (players: Player[], sheriffId: number | null, nightDeadIds: number[]): number[] => {
  const aliveCount = players.filter(p => p.isAlive).length;
  const order: number[] = [];
  if (sheriffId !== null) {
    const sheriff = players.find(p => p.id === sheriffId);
    if (sheriff && sheriff.isAlive) {
        let current = getNextAlivePlayer(sheriffId, players);
        while (current !== 0 && current !== sheriffId && order.length < aliveCount - 1) {
            order.push(current);
            current = getNextAlivePlayer(current, players);
        }
        order.push(sheriffId);
        return order;
    }
  }
  if (nightDeadIds.length > 0) {
    const startNode = Math.min(...nightDeadIds);
    let current = getNextAlivePlayer(startNode, players);
    while (current !== 0 && order.length < aliveCount) {
        order.push(current);
        current = getNextAlivePlayer(current, players);
    }
    return order;
  }
  const aliveIds = players.filter(p => p.isAlive).map(p => p.id);
  return shuffle(aliveIds); 
};

const assignModelByRole = (role: Role): { provider: AIProvider, model: string } => {
    if (role === Role.WEREWOLF || role === Role.SEER || role === Role.WITCH || role === Role.GUARD || role === Role.HUNTER) {
        return { provider: 'DeepSeek', model: 'deepseek-ai/DeepSeek-V3' };
    }
    return { provider: 'DeepSeek', model: 'Qwen/Qwen2.5-7B-Instruct' };
};

const createInitialState = (): GameState => {
  const shuffledRoles = shuffle(INITIAL_ROLE_DISTRIBUTION);
  const players: Player[] = shuffledRoles.map((role, index) => {
    const id = index + 1;
    const config = getPlayerConfig(id);
    const { provider, model } = assignModelByRole(role);
    const style = PLAYSTYLES[Math.floor(Math.random() * PLAYSTYLES.length)];

    return {
        id: id,
        name: config.name,
        gender: config.gender,
        role: role, 
        aiProvider: provider, 
        modelName: model,
        profile: style, 
        isAlive: true, 
        isProtected: false, 
        isPoisoned: false, 
        isSavedByWitch: false, 
        isKnownBySeer: false, 
        voteTarget: null, 
        isSheriff: false, 
        isCampaigning: false,
        isRoleRevealed: false 
    };
  });

  return {
    globalTick: 0, day: 0, phase: Phase.SETUP, 
    players, logs: [], winner: null,
    nightVictimId: null, witchPotionUsed: false, witchPoisonUsed: false, seerCheckId: null, 
    guardProtectId: null, lastGuardProtectId: null, discussionQueue: [], sheriffId: null, 
    sheriffCandidates: [], pkCandidates: [], nextPhaseAfterLastWords: Phase.NIGHT_START 
  };
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(100); 
  const [animation, setAnimation] = useState<AnimationEvent | null>(null);
  const [showRoles, setShowRoles] = useState(true); 
  const [userPlayerId, setUserPlayerId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'DESKTOP' | 'STREAM'>(
      window.innerWidth < window.innerHeight ? 'STREAM' : 'DESKTOP'
  );
  const [isGreenScreen, setIsGreenScreen] = useState(false);
  const [speakingPlayerId, setSpeakingPlayerId] = useState<number | null>(null);
  const [currentSpeech, setCurrentSpeech] = useState<string | null>(null);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [thinkingPlayers, setThinkingPlayers] = useState<Set<number>>(new Set());
  const [activeBubbles, setActiveBubbles] = useState<Map<number, { text: string, type: 'SPEECH'|'THOUGHT' }>>(new Map());
  const [enableTTS, setEnableTTS] = useState(true);
  const [stepTrigger, setStepTrigger] = useState(0); 
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); 
  const [isAutoLoop, setIsAutoLoop] = useState(false);
  const [highlights, setHighlights] = useState<string[]>([]);
  
  const [logDirHandle, setLogDirHandle] = useState<any>(null);
  
  // 🔥 新增：心声开关状态
  const [showThoughts, setShowThoughts] = useState(false);

  const autoLoopTimerRef = useRef<any>(null);
  const gameStateRef = useRef(gameState);
  const isProcessingRef = useRef(false);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const nextTurnTaskRef = useRef<{ id: number; task: Promise<{ res: AIResponse, audioUrl?: string | null }> } | null>(null);
  const gameSessionIdRef = useRef(1); 
  
  const enableTTSRef = useRef(enableTTS);
  useEffect(() => { enableTTSRef.current = enableTTS; }, [enableTTS]);

  const isAnyActive = speakingPlayerId !== null || thinkingPlayers.size > 0 || activeBubbles.size > 0;

  const addHighlight = (text: string) => {
      const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const log = `[${now}] Day${gameStateRef.current.day}: ${text}`;
      console.log("🎬 " + log);
      setHighlights(prev => [...prev, log]);
  };

  const handleSelectSaveDir = async () => {
      try {
          // @ts-ignore
          const handle = await window.showDirectoryPicker();
          setLogDirHandle(handle);
          alert("✅ 目录已锁定！战报将直接写入该文件夹，不再弹出下载。");
      } catch (err) {
          console.error("取消选择目录", err);
      }
  };

  const saveGameRecord = async (winnerFaction: Faction) => {
      const timestamp = new Date();
      const dateStr = timestamp.toLocaleDateString().replace(/\//g, '-');
      const timeStr = timestamp.toLocaleTimeString('zh-CN', { hour12: false }).replace(/:/g, '-');
      const filename = `AI狼人杀_第${gameSessionIdRef.current}局_${dateStr}_${timeStr}.txt`;

      let content = `=== 🐺 AI 狼人杀对局记录 ===\n`;
      content += `时间: ${timestamp.toLocaleString()}\n`;
      content += `场次: 第 ${gameSessionIdRef.current} 局\n`;
      content += `获胜方: ${winnerFaction === Faction.GOOD ? '🟢 好人阵营' : '🔴 狼人阵营'}\n\n`;

      content += `--- 🎭 演员表 ---\n`;
      gameStateRef.current.players.forEach(p => {
          content += `${p.id.toString().padStart(2, '0')}号: ${ROLE_CONFIG[p.role].label} (${p.name})\n`;
      });

      content += `\n--- 🎬 高光时刻 (剪辑时间轴) ---\n`;
      if (highlights.length === 0) content += "(本局无特殊高光)\n";
      highlights.forEach(line => {
          content += `${line}\n`;
      });

      content += `\n=== 游戏结束 ===\n`;

      try {
          if (logDirHandle) {
              const fileHandle = await logDirHandle.getFileHandle(filename, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(content);
              await writable.close();
              console.log(`📂 已写入本地文件: ${filename}`);
          } else {
              const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', filename);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log(`📝 战报已触发下载: ${filename}`);
          }
      } catch (e) {
          console.error("保存战报失败:", e);
      }
  };

  const handleGameReset = (autoStart: boolean = false) => {
      console.log("🔄 执行游戏重置程序...");
      gameSessionIdRef.current += 1;
      if (autoLoopTimerRef.current) clearTimeout(autoLoopTimerRef.current);
      isProcessingRef.current = false;
      nextTurnTaskRef.current = null;
      cancelSpeech();
      setSpeakingPlayerId(null);
      setCurrentSpeech(null);
      setCurrentThought(null);
      setThinkingPlayers(new Set());
      setActiveBubbles(new Map());
      setAnimation(null);
      setStepTrigger(0);
      setHighlights([]); 
      setGameState(createInitialState());
      setIsPlaying(autoStart);
  };

  const getSpeechContext = (phase: Phase, isDead: boolean) => {
    if (isDead || phase === Phase.DAY_LAST_WORDS) return `【阶段：遗言】\n你已出局。`;
    if (phase === Phase.DAY_SHERIFF_SPEECH) return `【阶段：警长竞选】\n目标：争取拿到警徽。`;
    if (phase === Phase.DAY_SHERIFF_PK_SPEECH) return `【阶段：警长PK】\n局势焦灼，说服大家。`;
    if (phase === Phase.DAY_PK_SPEECH) return `【阶段：生死PK】\n保住性命。`;
    if (phase === Phase.DAY_DISCUSS) return `【阶段：白天辩论】\n归票、站边、施压。`;
    return `【阶段：白天发言】`;
  };

  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerWidth < window.innerHeight;
      if (isPortrait && viewMode !== 'STREAM') setViewMode('STREAM');
      else if (!isPortrait && viewMode !== 'DESKTOP') setViewMode('DESKTOP');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  useEffect(() => { cancelSpeech(); loadVoices(); }, []);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    if (autoLoopTimerRef.current) {
        clearTimeout(autoLoopTimerRef.current);
        autoLoopTimerRef.current = null;
    }
    if (gameState.winner) {
        saveGameRecord(gameState.winner);
        if (isAutoLoop) {
            console.log("⏳ 30秒后自动开始下一局...");
            autoLoopTimerRef.current = setTimeout(() => {
                handleGameReset(true);
            }, 30000); 
        }
    }
    return () => { if (autoLoopTimerRef.current) clearTimeout(autoLoopTimerRef.current); };
  }, [gameState.winner, isAutoLoop]); 

  useEffect(() => {
    if (isPlaying && !gameState.winner && !isProcessingRef.current) {
       const timer = setTimeout(() => { advanceGame(); }, gameSpeed);
       return () => clearTimeout(timer);
    }
  }, [isPlaying, stepTrigger, gameState.winner, gameSpeed]);

  const addLog = (state: GameState, type: LogMessage['type'], content: string, senderId?: number, claim?: PlayerClaim, metadata?: SpeechMetadata): GameState => {
    const newTick = (state.globalTick || 0) + 1;
    const newLog: LogMessage = {
      id: Math.random().toString(36).substr(2, 9), 
      tick: newTick, day: state.day, phase: state.phase, senderId, type, content, claim, metadata
    };
    return { ...state, logs: [...state.logs, newLog], globalTick: newTick };
  };

  const performSpeech = async (text: string, playerId?: number) => {
      if (!enableTTS) return; 
      if (!text || text.trim() === '' || text === '...' || text.endsWith('发言: ...')) return;
      try { await speak(text, playerId || 0); } catch (e) {}
  };

  const handleToggleTTS = async () => {
    const newState = !enableTTS;
    setEnableTTS(newState);
    if (newState) await speak("语音已开启", 0); else cancelSpeech();
  };

  const checkVictory = (players: Player[]): Faction | null => {
      const wolves = players.filter(p => p.role === Role.WEREWOLF && p.isAlive).length;
      const villagers = players.filter(p => p.role === Role.VILLAGER && p.isAlive).length;
      const gods = players.filter(p => [Role.SEER, Role.WITCH, Role.HUNTER, Role.GUARD].includes(p.role) && p.isAlive).length;
      if (wolves === 0) return Faction.GOOD;
      if (villagers === 0 || gods === 0) return Faction.BAD; 
      return null;
  };

  const callAI = async (player: Player, state: GameState, context: string) => {
      setThinkingPlayers(prev => new Set(prev).add(player.id));
      try {
          const res = await generatePlayerTurn(player, state, context);
          setThinkingPlayers(prev => { const next = new Set(prev); next.delete(player.id); return next; });
          return res;
      } catch (e) {
          setThinkingPlayers(prev => { const next = new Set(prev); next.delete(player.id); return next; });
          throw e;
      }
  };

  const startFastTrack = (player: Player, state: GameState, context: string) => {
      const task = (async () => {
          try {
              const res = await callAI(player, state, context);
              let audioUrl = null;
              if (enableTTSRef.current && res.speech && res.speech.trim() !== '' && res.speech !== '...') {
                  audioUrl = await prefetch(res.speech, player.id);
              }
              return { res, audioUrl };
          } catch (e) {
              return { res: { speech: "...", thought: "Error", voteTarget: 0 } as AIResponse }; 
          }
      })();
      nextTurnTaskRef.current = { id: player.id, task };
  };

  const triggerBubble = (id: number, text: string, type: 'SPEECH'|'THOUGHT') => {
      setActiveBubbles(prev => new Map(prev).set(id, { text, type }));
      setTimeout(() => { setActiveBubbles(prev => { const next = new Map(prev); next.delete(id); return next; }); }, 4000); 
  };

  const clearDisplay = () => {
      setSpeakingPlayerId(null); setCurrentSpeech(null); setCurrentThought(null);
  };

  const advanceGame = async () => {
    const currentSessionId = gameSessionIdRef.current;
    if (isProcessingRef.current || gameStateRef.current.winner) return;
    isProcessingRef.current = true;
    let nextState = { ...gameStateRef.current };

    const handleSheriffHandover = async (currentState: GameState): Promise<GameState> => {
        const sheriffId = currentState.sheriffId;
        if (!sheriffId) return currentState;
        const sheriffPlayer = currentState.players.find(p => p.id === sheriffId);
        if (! sheriffPlayer || sheriffPlayer.isAlive) return currentState;
        let state = { ...currentState };
        try {
            state = addLog(state, 'SYSTEM', '警长已死亡，请决定警徽流向...');
            await performSpeech("警长已死亡，请决定移交警徽。");
            if (currentSessionId !== gameSessionIdRef.current) return state;

            const context = `【移交警徽】\n你已死亡。请决定警徽流向。\n规则: 移交(voteTarget=ID) 或 撕毁(0)。`;
            const res = await callAI(sheriffPlayer, state, context);
            
            if (currentSessionId !== gameSessionIdRef.current) return state;

            let targetId = res.voteTarget || 0;
            if (targetId !== 0) {
                const targetP = state.players.find(p => p.id === targetId);
                if (!targetP || !targetP.isAlive) targetId = 0;
            }
            state.players = state.players.map(p => ({ ...p, isSheriff: false })); 
            if (targetId !== 0) {
                state.sheriffId = targetId;
                state.players = state.players.map(p => p.id === targetId ? { ...p, isSheriff: true } : p);
                state = addLog(state, 'SHERIFF', `${sheriffPlayer.id}号警长将警徽移交给 -> ${targetId}号`);
                addHighlight(`👮 警徽移交: ${sheriffPlayer.id} -> ${targetId}`); 
                setAnimation({ type: 'SHERIFF', text: '警徽移交' });
            } else {
                state.sheriffId = null;
                state = addLog(state, 'SHERIFF', `${sheriffPlayer.id}号警长撕掉了警徽`);
                addHighlight(`👮 警徽撕毁: ${sheriffPlayer.id}号`); 
                setAnimation({ type: 'SHERIFF', text: '警徽撕毁' });
            }
            await new Promise(r => setTimeout(r, 500));
        } finally {
            setAnimation(null);
        }
        return state;
    };

    const handleHunterShoot = async (currentState: GameState, deadPlayerId: number): Promise<{ state: GameState, killedId: number | null }> => {
        const player = currentState.players.find(p => p.id === deadPlayerId);
        if (!player || player.role !== Role.HUNTER || currentState.phase.includes('POISON')) return { state: currentState, killedId: null }; 
        if (player.isPoisoned) {
             currentState = addLog(currentState, 'SYSTEM', `${player.id}号猎人死亡，中毒无法开枪。`);
             addHighlight(`🔫 猎人闷枪: ${player.id}号被毒杀无法开枪`); 
             return { state: currentState, killedId: null };
        }
        let state = { ...currentState };
        let killedId = null;
        state.players = state.players.map(p => p.id === deadPlayerId ? { ...p, isRoleRevealed: true } : p);
        try {
            state = addLog(state, 'SYSTEM', `${player.id}号猎人发动技能...`);
            setAnimation({ type: 'GUN', text: '猎人开枪' });
            await performSpeech("请猎人发动技能。");
            
            if (currentSessionId !== gameSessionIdRef.current) return { state: currentState, killedId: null };

            const context = `【发动技能】\n你已死亡。作为猎人，请带走一人(voteTarget)。`;
            const res = await callAI(player, state, context);

            if (currentSessionId !== gameSessionIdRef.current) return { state: currentState, killedId: null };

            if (res.voteTarget && res.voteTarget !== 0) {
                const target = state.players.find(p => p.id === res.voteTarget && p.isAlive);
                if (target) {
                    target.isAlive = false; target.deathReason = 'HUNTER_SHOOT'; killedId = target.id;
                    state = addLog(state, 'ACTION_KILL', `${player.id}号猎人带走 -> ${target.id}号`, player.id);
                    addHighlight(`💥 猎人开枪! ${player.id} 带走 ${target.id}`); 
                    setAnimation({ type: 'GUN', text: `带走 ${target.id}号`, targetId: target.id });
                    await performSpeech(`${player.id}号猎人开枪带走了 ${target.id}号`);
                }
            } else {
                 state = addLog(state, 'SYSTEM', `${player.id}号猎人放弃开枪`);
                 addHighlight(`🔫 猎人空枪: ${player.id}号放弃带人`); 
            }
            await new Promise(r => setTimeout(r, 500));
        } finally { setAnimation(null); }
        return { state, killedId };
    };

    if (nextState.day > 15) {
        console.warn("⚠️ 游戏回合数过长，强制结束");
        nextState.winner = Faction.BAD; 
        nextState.phase = Phase.GAME_OVER;
        setGameState(nextState);
        isProcessingRef.current = false;
        return;
    }

    try {
      switch (nextState.phase) {
        case Phase.SETUP: nextState.phase = Phase.NIGHT_START; break;
        case Phase.NIGHT_START:
          nextState.day++; 
          nextState.players = nextState.players.map(p => ({
              ...p, isProtected: false, isPoisoned: false, isSavedByWitch: false, voteTarget: null, isCampaigning: false
          }));
          nextState.nightVictimId = null; nextState.seerCheckId = null; nextState.guardProtectId = null;
          nextState.pkCandidates = []; nextState.sheriffCandidates = [];
          nextState = addLog(nextState, 'SYSTEM', `=== 第 ${nextState.day} 夜 ===`);
          setAnimation({ type: 'DAY_NIGHT', text: '入夜' });
          await performSpeech(`天黑请闭眼。第 ${nextState.day} 夜。`);
          
          if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

          await new Promise(r => setTimeout(r, 1500)); 
          setAnimation(null);
          nextState.phase = Phase.NIGHT_GUARD;
          break;
        case Phase.NIGHT_GUARD:
          const guard = nextState.players.find(p => p.role === Role.GUARD && p.isAlive);
          if (guard) {
             await performSpeech("守卫请睁眼。");
             if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

             setSpeakingPlayerId(guard.id);
             let context = `【夜间行动】\n请选择守护目标 (voteTarget)。\n状态: 昨晚守护了 ${nextState.lastGuardProtectId || '空'}。`;
             const res = await callAI(guard, nextState, context);
             
             if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

             if (res.thought) {
                 setCurrentThought(res.thought);
                 nextState = addLog(nextState, 'THOUGHT', res.thought, guard.id, undefined, res.metadata);
                 await new Promise(r => setTimeout(r, 500)); setCurrentThought(null);
             }
             let target = res.voteTarget || 0;
             if (target === nextState.lastGuardProtectId) target = 0; 
             if (target !== 0) {
                 nextState.guardProtectId = target; nextState.lastGuardProtectId = target;
                 nextState.players = nextState.players.map(p => p.id === target ? { ...p, isProtected: true, voteTarget: target } : p);
                 nextState = addLog(nextState, 'ACTION_SAVE', `守护了 ${target}号`, guard.id);
                 setAnimation({ type: 'SHIELD', text: '守卫守护' });
             } else {
                 nextState.lastGuardProtectId = null;
                 nextState = addLog(nextState, 'ACTION_SAVE', `守卫选择空守`, guard.id);
             }
             clearDisplay(); await new Promise(r => setTimeout(r, 500)); setAnimation(null);
          }
          nextState.phase = Phase.NIGHT_WEREWOLF;
          break;
        case Phase.NIGHT_WEREWOLF:
          await performSpeech("狼人请睁眼。");
          const wolves = nextState.players.filter(p => p.role === Role.WEREWOLF && p.isAlive);
          let wolfStrategyContext = "";
          if (wolves.length > 0) {
              console.log("[WolfPack] 正在制定今晚战术..."); 
              wolfStrategyContext = await import('./services/geminiService').then(m => m.generateWolfStrategy(nextState));
              
              if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }
              console.log("[WolfPack] 战术已下达:", wolfStrategyContext);
          }
          const wolfResults = await processWithStagger<Player, { wolf: Player, res: AIResponse }>(wolves, 2, 1000, async (wolf: Player) => {
               const context = `【夜间行动】\n狼人请指刀。请选择击杀目标。\n\n⚠️【狼队最高指令】\n${wolfStrategyContext}\n\n请参考上述指令行动，确保团队配合！`;
               try {
                   const res = await callAI(wolf, nextState, context);
                   return { wolf, res };
               } catch (e) { return { wolf, res: { speech: '', thought: '', voteTarget: 0 } as any }; }
          });

          if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

          let killTargetId = 0; 
          const wolfVotes: number[] = [];
          for (const { wolf, res } of wolfResults) {
               if (res.thought) {
                   triggerBubble(wolf.id, res.thought, 'THOUGHT');
                   nextState = addLog(nextState, 'THOUGHT', res.thought, wolf.id, undefined, res.metadata);
               }
               if (res.speech) nextState = addLog(nextState, 'WOLF_CHANNEL', res.speech, wolf.id, undefined, res.metadata);
               if (res.voteTarget) {
                   wolfVotes.push(res.voteTarget);
                   nextState.players = nextState.players.map(p => p.id === wolf.id ? { ...p, voteTarget: res.voteTarget || null } : p);
               }
          }
          const voteCounts: Record<number, number> = {};
          wolfVotes.forEach(v => voteCounts[v] = (voteCounts[v] || 0) + 1);
          let maxV = 0;
          Object.entries(voteCounts).forEach(([id, count]) => { if (count > maxV) { maxV = count; killTargetId = parseInt(id); } });
          if (killTargetId !== 0) {
              nextState.nightVictimId = killTargetId;
              setAnimation({ type: 'CLAW', text: '狼人袭击' });
              nextState = addLog(nextState, 'ACTION_KILL', `狼队锁定目标 -> ${killTargetId}号`);
          } else {
              nextState = addLog(nextState, 'ACTION_KILL', `狼队空刀`);
          }
          await new Promise(r => setTimeout(r, 1000));
          nextState.players = nextState.players.map(p => ({ ...p, voteTarget: null }));
          setAnimation(null); clearDisplay();
          nextState.phase = Phase.NIGHT_WITCH;
          break;
        case Phase.NIGHT_WITCH:
          const witch = nextState.players.find(p => p.role === Role.WITCH && p.isAlive);
          if (witch) {
              await performSpeech("女巫请睁眼。"); setSpeakingPlayerId(witch.id);
              const victimId = nextState.nightVictimId;
              let context = `【夜间行动】\n你的灵药[${nextState.witchPotionUsed?'已用':'可用'}], 毒药[${nextState.witchPoisonUsed?'已用':'可用'}]。\n`;
              if (victimId && !nextState.witchPotionUsed) context += `【倒牌信息】: 今晚 ${victimId}号 倒牌。\n`;
              
              const res = await callAI(witch, nextState, context);
              
              if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

              if (res.thought) {
                  setCurrentThought(res.thought);
                  nextState = addLog(nextState, 'THOUGHT', res.thought, witch.id, undefined, res.metadata);
                  await new Promise(r => setTimeout(r, 500)); setCurrentThought(null);
              }
              const action = res.actionParams || { useAntidote: false, poisonTarget: 0 };
              let finalVoteTarget = res.voteTarget || 0;
              if (action.poisonTarget) finalVoteTarget = action.poisonTarget;
              let actionTaken = false;
              if (action.useAntidote && victimId && !nextState.witchPotionUsed) {
                  nextState.players = nextState.players.map(p => p.id === victimId ? { ...p, isSavedByWitch: true } : p);
                  nextState.witchPotionUsed = true;
                  nextState = addLog(nextState, 'ACTION_SAVE', `使用解药救 ${victimId}号`, witch.id);
                  addHighlight(`🧪 女巫解药: 救 ${victimId}号`); 
                  setAnimation({ type: 'POTION', text: '女巫用药' }); actionTaken = true;
              } else if (finalVoteTarget !== 0 && !nextState.witchPoisonUsed) {
                  const target = finalVoteTarget;
                  nextState.players = nextState.players.map(p => p.id === target ? { ...p, isPoisoned: true } : p);
                  nextState.witchPoisonUsed = true;
                  nextState = addLog(nextState, 'ACTION_KILL', `使用毒药毒 ${target}号`, witch.id);
                  addHighlight(`☠️ 女巫撒毒: 毒 ${target}号`); 
                  setAnimation({ type: 'POTION', text: '女巫撒毒' }); actionTaken = true;
              }
              if (!actionTaken) nextState = addLog(nextState, 'ACTION_SAVE', `女巫未行动`, witch.id);
              clearDisplay(); await new Promise(r => setTimeout(r, 500)); setAnimation(null);
          }
          nextState.phase = Phase.NIGHT_SEER;
          break;
        case Phase.NIGHT_SEER:
          const seer = nextState.players.find(p => p.role === Role.SEER && p.isAlive);
          if (seer) {
              await performSpeech("预言家请睁眼。"); setSpeakingPlayerId(seer.id);
              
              const res = await callAI(seer, nextState, `【夜间行动】\n请务必选择一个查验目标 (voteTarget)。`);
              
              if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

              if (res.thought) {
                  setCurrentThought(res.thought);
                  nextState = addLog(nextState, 'THOUGHT', res.thought, seer.id, undefined, res.metadata);
                  await new Promise(r => setTimeout(r, 500)); setCurrentThought(null);
              }
              const targetId = res.voteTarget || 0;
              if (targetId !== 0) {
                  const targetP = nextState.players.find(p => p.id === targetId);
                  if (targetP) {
                      nextState.players = nextState.players.map(p => p.id === seer.id ? { ...p, voteTarget: targetId } : p);
                      nextState.players = nextState.players.map(p => p.id === targetP.id ? { ...p, isKnownBySeer: true } : p);
                      const identity = targetP.role === Role.WEREWOLF ? '狼人' : '好人';
                      nextState = addLog(nextState, 'ACTION_CHECK', `查验 ${targetId}号 -> ${identity}`, seer.id);
                      if (identity === '狼人') addHighlight(`🔮 预言家查杀: ${seer.id}查出${targetId}是狼`); 
                      setAnimation({ type: 'SEER', text: '预言家查验' }); nextState.seerCheckId = targetId;
                  }
              } else nextState = addLog(nextState, 'ACTION_CHECK', `预言家空过`, seer.id);
              clearDisplay(); await new Promise(r => setTimeout(r, 500));
              nextState.players = nextState.players.map(p => p.id === seer.id ? { ...p, voteTarget: null } : p);
              setAnimation(null);
          }
          nextState.phase = Phase.DAY_START;
          break;
        case Phase.DAY_START:
            // 白天开始，播报天亮
            nextState = addLog(nextState, 'SYSTEM', `=== 第 ${nextState.day} 天 ===`);
            setAnimation({ type: 'DAY_NIGHT', text: '天亮' });
            await performSpeech(`天亮了。第 ${nextState.day} 天。`);
            
            if (currentSessionId !== gameSessionIdRef.current) { 
                isProcessingRef.current = false; 
                return; 
            }

            await new Promise(r => setTimeout(r, 1500)); 
            setAnimation(null);
            
            // 根据天数决定进入哪个阶段
            // 第一天：先进行警长竞选
            // 第二天及以后：直接公布昨夜结果
            if (nextState.day === 1) {
                nextState.phase = Phase.DAY_SHERIFF_NOM;
            } else {
                nextState.phase = Phase.DAY_ANNOUNCE;
            }
            break;
        case Phase.DAY_SHERIFF_NOM: {
          await performSpeech("现在开始警长竞选，想要上警的玩家请举手。");
          const alivePlayers = nextState.players.filter(p => p.isAlive);
          
          const nomResults = await processWithStagger<Player, { id: number, res: AIResponse }>(alivePlayers, 4, 500, async (p: Player) => {
              const context = `【警长竞选】\n请决定是否上警。\n竞选(voteTarget=${p.id}) / 放弃(0)。`;
              try { const res = await callAI(p, nextState, context); return { id: p.id, res }; } 
              catch (e) { return { id: p.id, res: { voteTarget: 0 } as any }; }
          });

          if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

          for (const { id, res } of nomResults) {
              if (res.voteTarget === id) {
                  nextState.players = nextState.players.map(pl => pl.id === id ? { ...pl, isCampaigning: true, voteTarget: id } : pl);
              }
              if (res.thought) triggerBubble(id, res.thought, 'THOUGHT');
          }
          const candidates = nextState.players.filter(p => p.isCampaigning);
          if (candidates.length === 0) {
              nextState = addLog(nextState, 'SYSTEM', '无人竞选，本局无警长。'); nextState.sheriffId = null; nextState.phase = Phase.DAY_ANNOUNCE;
          } else {
              nextState.sheriffCandidates = candidates.map(p => p.id); nextState.discussionQueue = [...nextState.sheriffCandidates]; 
              nextState.phase = Phase.DAY_SHERIFF_SPEECH;
              nextState = addLog(nextState, 'SYSTEM', `上警玩家: ${nextState.sheriffCandidates.join(', ')}`);
              const firstSpeakerId = nextState.discussionQueue[0];
              const firstSpeaker = nextState.players.find(p => p.id === firstSpeakerId);
              if (firstSpeaker) {
                  const preContext = getSpeechContext(Phase.DAY_SHERIFF_SPEECH, false);
                  startFastTrack(firstSpeaker, nextState, preContext);
              }
              await performSpeech(`上警玩家有：${nextState.sheriffCandidates.join('号, ')}号。请按顺序发言。`);
          }
          await new Promise(r => setTimeout(r, 1000)); 
          nextState.players = nextState.players.map(p => ({ ...p, voteTarget: null }));
          break;
        }
        case Phase.DAY_ANNOUNCE: {
            let deadId = nextState.nightVictimId;
            if (deadId) {
                const victim = nextState.players.find(p => p.id === deadId);
                if (victim && (victim.isSavedByWitch || victim.isProtected)) deadId = null;
            }
            const poisoned = nextState.players.filter(p => p.isPoisoned && p.isAlive);
            const deaths: number[] = []; if (deadId) deaths.push(deadId); poisoned.forEach(p => deaths.push(p.id));
            let calculatedQueue: number[] = [];
            
            if (deaths.length > 0) {
                const deathText = deaths.map(d => `${d}号`).join(', ');
                nextState = addLog(nextState, 'DEATH', `昨夜 ${deathText} 死亡`);
                addHighlight(`💀 昨夜倒牌: ${deathText}`); 
                deaths.forEach(d => {
                    const p = nextState.players.find(pl => pl.id === d);
                    if (p) { p.isAlive = false; p.deathReason = 'NIGHT_DEATH'; }
                });
                
                for (const d of deaths) {
                     const p = nextState.players.find(pl => pl.id === d);
                     if (p && p.role === Role.HUNTER) {
                         const res = await handleHunterShoot(nextState, d);
                         if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; } 
                         nextState = res.state;
                     }
                     if (p && p.isSheriff) {
                         nextState = await handleSheriffHandover(nextState);
                         if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; } 
                     }
                }
                
                if (nextState.day === 1) {
                    nextState.discussionQueue = [...deaths]; nextState.nextPhaseAfterLastWords = Phase.DAY_DISCUSS; nextState.phase = Phase.DAY_LAST_WORDS;
                    const nextSpeakerId = deaths[0]; const nextP = nextState.players.find(p => p.id === nextSpeakerId);
                    if (nextP) startFastTrack(nextP, nextState, getSpeechContext(Phase.DAY_LAST_WORDS, true));
                } else {
                    nextState.phase = Phase.DAY_DISCUSS;
                    calculatedQueue = generateSpeakingOrder(nextState.players, nextState.sheriffId, deaths);
                    nextState.discussionQueue = calculatedQueue;
                    nextState = addLog(nextState, 'SYSTEM', `发言顺序: ${nextState.discussionQueue.join(' -> ')}`);
                    const nextSpeakerId = calculatedQueue[0]; const nextP = nextState.players.find(p => p.id === nextSpeakerId);
                    if (nextP) startFastTrack(nextP, nextState, getSpeechContext(Phase.DAY_DISCUSS, false));
                }
                await performSpeech(`昨夜 ${deathText} 倒牌。`);
            } else {
                nextState = addLog(nextState, 'SYSTEM', '昨夜平安夜'); nextState.phase = Phase.DAY_DISCUSS;
                calculatedQueue = generateSpeakingOrder(nextState.players, nextState.sheriffId, []);
                nextState.discussionQueue = calculatedQueue;
                nextState = addLog(nextState, 'SYSTEM', `发言顺序: ${nextState.discussionQueue.join(' -> ')}`);
                const firstId = calculatedQueue[0]; const firstP = nextState.players.find(p => p.id === firstId);
                if (firstP) startFastTrack(firstP, nextState, getSpeechContext(Phase.DAY_DISCUSS, false));
                await performSpeech("昨夜平安夜。");
            }
            await new Promise(r => setTimeout(r, 1000));
            break;
        }
        case Phase.DAY_SHERIFF_SPEECH:
        case Phase.DAY_DISCUSS:
        case Phase.DAY_SHERIFF_PK_SPEECH:
        case Phase.DAY_PK_SPEECH:
        case Phase.DAY_LAST_WORDS: {
          if (nextState.discussionQueue.length === 0) {
              clearDisplay();
              if (nextState.phase === Phase.DAY_LAST_WORDS) {
                  if (nextState.nextPhaseAfterLastWords) {
                      nextState.phase = nextState.nextPhaseAfterLastWords;
                      if (nextState.phase === Phase.DAY_DISCUSS) {
                          nextState.discussionQueue = generateSpeakingOrder(nextState.players, nextState.sheriffId, []);
                      }
                      nextState.nextPhaseAfterLastWords = undefined;
                  } else nextState.phase = Phase.NIGHT_START;
              }
              else if (nextState.phase === Phase.DAY_SHERIFF_SPEECH) nextState.phase = Phase.DAY_SHERIFF_VOTE;
              else if (nextState.phase === Phase.DAY_SHERIFF_PK_SPEECH) nextState.phase = Phase.DAY_SHERIFF_PK_VOTE;
              else if (nextState.phase === Phase.DAY_PK_SPEECH) nextState.phase = Phase.DAY_PK_VOTE;
              else if (nextState.phase === Phase.DAY_DISCUSS) nextState.phase = Phase.DAY_VOTE;
              nextTurnTaskRef.current = null;
              break;
          }
          const speakerId = nextState.discussionQueue.shift();
          const speaker = nextState.players.find(p => p.id === speakerId);
          if (speaker) {
              clearDisplay(); setSpeakingPlayerId(speaker.id);
              let res: AIResponse;
              const context = getSpeechContext(nextState.phase, !speaker.isAlive);
              
              // 🔥🔥 关键修改：在处理发言时，将 thought 设置为 state 以便 PlayerCard 显示 🔥🔥
              const handleResponse = async (response: AIResponse, audioUrl: string | null) => {
                  if (response.thought) {
                      // 这里设置为 state，让 PlayerCard 能读到
                      setCurrentThought(response.thought);
                      nextState = addLog(nextState, 'THOUGHT', response.thought, speaker.id, undefined, response.metadata);
                  }
                  
                  setCurrentSpeech(response.speech);
                  nextState = addLog(nextState, 'SPEECH', response.speech, speaker.id, response.claim, response.metadata);

                  if (nextState.discussionQueue.length > 0) {
                      const nextId = nextState.discussionQueue[0]; const nextPlayer = nextState.players.find(p => p.id === nextId);
                      if (nextPlayer) startFastTrack(nextPlayer, nextState, getSpeechContext(nextState.phase, !nextPlayer.isAlive));
                  } else {
                      nextTurnTaskRef.current = null;
                  }

                  if (audioUrl && enableTTS) { 
                      await playAudio(audioUrl); 
                  } else { 
                      if (response.speech && response.speech !== '...') {
                         await performSpeech(`${speaker.id}号发言: ` + response.speech, speaker.id); 
                      }
                  }
              };

              if (nextTurnTaskRef.current && nextTurnTaskRef.current.id === speaker.id) {
                  try { 
                      const taskResult = await nextTurnTaskRef.current.task; 
                      await handleResponse(taskResult.res, taskResult.audioUrl || null);
                  } catch (e) { 
                      res = await callAI(speaker, nextState, context); 
                      await handleResponse(res, null);
                  }
                  nextTurnTaskRef.current = null;
              } else {
                  res = await callAI(speaker, nextState, context);
                  await handleResponse(res, null);
              }
              
              if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }
              await new Promise(r => setTimeout(r, 500));
          }
          break;
        }
        case Phase.DAY_SHERIFF_VOTE:
        case Phase.DAY_SHERIFF_PK_VOTE: {
          const isPK = nextState.phase === Phase.DAY_SHERIFF_PK_VOTE;
          const candidates = isPK ? nextState.pkCandidates : nextState.sheriffCandidates;
          await performSpeech(isPK ? "请进行警长PK投票。" : "请投选警长。");
          const eligibleVoters = nextState.players.filter(p => p.isAlive && !candidates.includes(p.id));
          const votes = await processWithStagger<Player, { voterId: number, target: number, thought?: string }>(eligibleVoters, 4, 500, async (voter) => {
              const res = await callAI(voter, nextState, `【投票阶段】\n请投票给候选人: [${candidates.join(', ')}] 或弃票(0)。`);
              return { voterId: voter.id, target: res.voteTarget || 0, thought: res.thought };
          });

          if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

          const voteMap: Record<number, number> = {};
          votes.forEach(v => {
              if (candidates.includes(v.target)) {
                 voteMap[v.target] = (voteMap[v.target] || 0) + 1;
                 nextState = addLog(nextState, 'ACTION_VOTE', `${v.voterId}号 投票给了 -> ${v.target}号`, v.voterId);
                 nextState.players = nextState.players.map(p => p.id === v.voterId ? { ...p, voteTarget: v.target } : p);
              } else nextState = addLog(nextState, 'ACTION_VOTE', `${v.voterId}号 弃票`, v.voterId);
          });
          setGameState({ ...nextState }); await performSpeech("投票结果已出，请看大屏幕。"); await new Promise(r => setTimeout(r, 4000)); 
          let maxVotes = 0, winners: number[] = [];
          Object.entries(voteMap).forEach(([id, count]) => {
              if (count > maxVotes) { maxVotes = count; winners = [parseInt(id)]; }
              else if (count === maxVotes) winners.push(parseInt(id));
          });
          nextState.players = nextState.players.map(p => ({ ...p, voteTarget: null }));
          if (winners.length === 1) {
              const winnerId = winners[0]; nextState.sheriffId = winnerId;
              nextState.players = nextState.players.map(p => ({ ...p, isSheriff: p.id === winnerId }));
              addHighlight(`👮 警长当选: ${winnerId}号`); 
              setAnimation({ type: 'SHERIFF', text: '警长当选' }); await performSpeech(`${winnerId}号当选警长。`);
              nextState.phase = Phase.DAY_ANNOUNCE;
          } else if (winners.length > 1) {
              if (isPK) nextState.phase = Phase.DAY_ANNOUNCE;
              else {
                  nextState.pkCandidates = winners; nextState.discussionQueue = [...winners];
                  nextState.phase = Phase.DAY_SHERIFF_PK_SPEECH; await performSpeech("平票，进入PK发言。");
              }
          } else nextState.phase = Phase.DAY_ANNOUNCE;
          await new Promise(r => setTimeout(r, 1000)); setAnimation(null);
          break;
        }
        case Phase.DAY_VOTE:
        case Phase.DAY_PK_VOTE: {
            const isDayPK = nextState.phase === Phase.DAY_PK_VOTE;
            const dayCandidates = isDayPK ? nextState.pkCandidates : nextState.players.filter(p => p.isAlive).map(p => p.id);
            await performSpeech(isDayPK ? "请进行PK投票。" : "请投票放逐。");
            const dayVoters = nextState.players.filter(p => p.isAlive && (!isDayPK || !dayCandidates.includes(p.id)));
            const dayVotes = await processWithStagger<Player, { voterId: number, target: number, thought?: string }>(dayVoters, 4, 500, async (voter) => {
                const res = await callAI(voter, nextState, `【投票阶段】\n请投票放逐: [${dayCandidates.join(', ')}] 或弃票(0)。`);
                return { voterId: voter.id, target: res.voteTarget || 0, thought: res.thought };
            });

            if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }

            const dayVoteMap: Record<number, number> = {};
            dayVotes.forEach(v => {
                if (dayCandidates.includes(v.target)) {
                    dayVoteMap[v.target] = (dayVoteMap[v.target] || 0) + 1;
                    nextState = addLog(nextState, 'ACTION_VOTE', `${v.voterId}号 投票给了 -> ${v.target}号`, v.voterId);
                    nextState.players = nextState.players.map(p => p.id === v.voterId ? { ...p, voteTarget: v.target } : p);
                } else nextState = addLog(nextState, 'ACTION_VOTE', `${v.voterId}号 弃票`, v.voterId);
            });
            setGameState({ ...nextState }); await performSpeech("投票结果已出，请看大屏幕。"); await new Promise(r => setTimeout(r, 4000)); 
            let dayMax = 0, dayWinners: number[] = [];
            Object.entries(dayVoteMap).forEach(([cand, count]) => {
                if (count > dayMax) { dayMax = count; dayWinners = [parseInt(cand)]; }
                else if (count === dayMax) dayWinners.push(parseInt(cand));
            });
            nextState.players = nextState.players.map(p => ({ ...p, voteTarget: null }));
            if (dayWinners.length === 1) {
                const targetId = dayWinners[0];
                setAnimation({ type: 'VOTE', text: '放逐' }); await performSpeech(`${targetId}号 被投票放逐。`);
                nextState = addLog(nextState, 'VOTE', `${targetId}号 被投票放逐`);
                
                const targetP = nextState.players.find(p => p.id === targetId);
                const roleName = targetP ? ROLE_CONFIG[targetP.role].label : "未知";
                addHighlight(`🗳️ 投票放逐: ${targetId}号 (${roleName}) 出局`); 

                let deadPlayers = [targetId]; const p = nextState.players.find(pl => pl.id === targetId);
                if (p) { p.isAlive = false; p.deathReason = 'VOTE_EXILE'; }
                if (p && p.role === Role.HUNTER) {
                    const { state: newState, killedId } = await handleHunterShoot(nextState, targetId);
                    if (currentSessionId !== gameSessionIdRef.current) { isProcessingRef.current = false; return; }
                    nextState = newState; if (killedId) deadPlayers.push(killedId);
                }
                nextState.discussionQueue = deadPlayers; nextState.nextPhaseAfterLastWords = Phase.NIGHT_START; nextState.phase = Phase.DAY_LAST_WORDS;
                const w = checkVictory(nextState.players); if (w) { nextState.winner = w; nextState.phase = Phase.GAME_OVER; }
            } else if (dayWinners.length > 1) {
                if (isDayPK) nextState.phase = Phase.NIGHT_START;
                else {
                    nextState.pkCandidates = dayWinners; nextState.discussionQueue = [...dayWinners];
                    nextState.phase = Phase.DAY_PK_SPEECH; await performSpeech("平票，进入PK发言。");
                }
            } else nextState.phase = Phase.NIGHT_START;
            await new Promise(r => setTimeout(r, 1000)); setAnimation(null);
            break;
        }
        case Phase.SHERIFF_HANDOVER:
            nextState = await handleSheriffHandover(nextState);
            nextState.phase = (nextState.discussionQueue && nextState.discussionQueue.length > 0) ? Phase.DAY_LAST_WORDS : Phase.NIGHT_START;
            break;
         case Phase.GAME_OVER: break;
      }
    } catch (e) { 
        console.error("游戏循环严重报错:", e); 
        setAnimation(null); 
    }

    if (currentSessionId !== gameSessionIdRef.current) {
        console.warn("🛑 [SESSION] 最终提交被拦截: 游戏已重置");
        isProcessingRef.current = false;
        return;
    }

    isProcessingRef.current = false;
    setGameState(nextState);
    setStepTrigger(prev => prev + 1);
  };
  const handleStep = () => { setIsPlaying(false); advanceGame(); };
  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans select-none">
       <SoundManager phase={gameState.phase} animation={animation} isMuted={!enableTTS} />
       {!isGreenScreen && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>}
       {isGreenScreen && <div className="absolute inset-0 bg-[#00FF00] z-0"></div>}
       <AnimationLayer animation={animation} onDismiss={() => setAnimation(null)} />
       {viewMode === 'STREAM' && <SubtitleBar player={speakingPlayerId ? gameState.players.find(p => p.id === speakingPlayerId) || null : null} text={currentSpeech} />}
      {viewMode === 'STREAM' && !isGreenScreen && (
          <header className="absolute top-0 left-0 right-0 h-28 px-4 py-2 z-50 flex flex-col justify-start pointer-events-none bg-gradient-to-b from-black/90 to-transparent">
              <div className="flex flex-col items-center justify-center mt-2">
                  <div className="flex items-baseline gap-2">
                      <span className="text-indigo-400 font-black font-mono text-4xl drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]">Day {gameState.day}</span>
                  </div>
                  <div className="text-white font-black text-3xl tracking-widest uppercase mt-1 animate-pulse">{translatePhase(gameState.phase)}</div>
              </div>
              
              <div className="absolute top-4 left-4 flex gap-2 pointer-events-auto">
                  <button onClick={handleSelectSaveDir} className="bg-blue-800/80 text-blue-200 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-500/30 hover:bg-blue-700 flex items-center gap-1">
                      <span>📂</span> {logDirHandle ? '目录已锁定' : '设定战报目录'}
                  </button>
                  <button onClick={() => setIsHistoryOpen(true)} className="bg-slate-800/80 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 hover:bg-slate-700">
                      📜 记录
                  </button>
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-1 items-end opacity-90">
                  <div className="flex items-center gap-1 bg-red-900/40 px-2 py-1 rounded border border-red-500/30">
                      <span className="text-lg">🐺</span><span className="text-red-400 font-black font-mono text-xl">{gameState.players.filter(p => p.role === Role.WEREWOLF && p.isAlive).length}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-900/40 px-2 py-1 rounded border border-emerald-500/30">
                      <span className="text-lg">🧑</span><span className="text-emerald-400 font-black font-mono text-xl">{gameState.players.filter(p => p.role !== Role.WEREWOLF && p.isAlive).length}</span>
                  </div>
              </div>
          </header>
      )}
      {viewMode === 'STREAM' && isGreenScreen && (
          <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
              <h1 className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Day {gameState.day} | {translatePhase(gameState.phase)}</h1>
          </div>
      )}
      {viewMode === 'DESKTOP' && (
          <header className="flex justify-between items-center h-20 px-8 shrink-0 z-50 relative bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="flex items-center gap-4 pointer-events-auto">
                  <div className="w-1.5 h-12 bg-indigo-500 rounded-sm shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                  <div>
                      <h1 className="text-xl font-bold tracking-[0.2em] text-white uppercase opacity-80">AI 狼人杀 <span className="text-indigo-500">竞技场</span></h1>
                      <div className="flex items-center gap-3 text-3xl font-black font-mono mt-1 text-white">
                          <span className="text-indigo-400">第 {gameState.day} 天</span>
                          <span className="text-slate-600 text-2xl mx-1">|</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white glow-text">{translatePhase(gameState.phase)}</span>
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-4 pointer-events-auto">
                  <button onClick={handleSelectSaveDir} className="bg-blue-900/40 hover:bg-blue-800/80 text-xs text-blue-200 font-bold px-5 py-2.5 rounded-lg border border-blue-500/30 flex items-center gap-2">
                      <span>📂</span> {logDirHandle ? '目录已锁定' : '设定战报目录'}
                  </button>
                  <button onClick={() => setIsHistoryOpen(true)} className="bg-slate-900/40 hover:bg-slate-800/80 text-xs text-slate-300 font-bold px-5 py-2.5 rounded-lg border border-white/10">作战记录</button>
                  <div className="flex gap-4 text-sm font-bold bg-slate-900/60 px-5 py-2.5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 text-red-400"><span className="text-[10px] opacity-70">狼人</span><span className="font-mono text-xl">{gameState.players.filter(p => p.role === Role.WEREWOLF && p.isAlive).length}</span></div>
                      <div className="w-px h-full bg-white/10"></div>
                      <div className="flex items-center gap-2 text-emerald-400"><span className="text-[10px] opacity-70">好人</span><span className="font-mono text-xl">{gameState.players.filter(p => p.role !== Role.WEREWOLF && p.isAlive).length}</span></div>
                  </div>
              </div>
          </header>
      )}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 z-10 w-full max-w-7xl mx-auto">
           {viewMode === 'STREAM' ? (
                <StreamLayout 
                    players={gameState.players} 
                    cardRefs={cardRefs} 
                    gridContainerRef={gridContainerRef} 
                    phase={gameState.phase} 
                    showRoles={showRoles} 
                    userPlayerId={userPlayerId} 
                    activeBubbles={activeBubbles} 
                    thinkingPlayers={thinkingPlayers} 
                    speakingPlayerId={speakingPlayerId} 
                    currentSpeech={currentSpeech} 
                    currentThought={currentThought} 
                    isAnyActive={isAnyActive} 
                    logs={gameState.logs} 
                    isGreenScreen={isGreenScreen} 
                    gameState={gameState} 
                    showThoughts={showThoughts} // 🔥 传入
                />
           ) : (
                <DesktopLayout players={gameState.players} cardRefs={cardRefs} gridContainerRef={gridContainerRef} phase={gameState.phase} showRoles={showRoles} userPlayerId={userPlayerId} activeBubbles={activeBubbles} thinkingPlayers={thinkingPlayers} speakingPlayerId={speakingPlayerId} currentSpeech={currentSpeech} currentThought={currentThought} isAnyActive={isAnyActive} logs={gameState.logs} />
           )}
      </main>
      <ControlPanel 
          isPlaying={isPlaying} 
          onTogglePlay={() => setIsPlaying(!isPlaying)} 
          onStep={handleStep} 
          gameSpeed={gameSpeed} 
          onSpeedChange={setGameSpeed} 
          gameOver={!!gameState.winner} 
          enableTTS={enableTTS} 
          onToggleTTS={handleToggleTTS} 
          showRoles={showRoles} 
          onToggleRoles={() => setShowRoles(!showRoles)} 
          viewMode={viewMode} 
          onToggleViewMode={() => setViewMode(prev => prev === 'STREAM' ? 'DESKTOP' : 'STREAM')} 
          isAutoLoop={isAutoLoop} 
          onToggleAutoLoop={() => setIsAutoLoop(!isAutoLoop)} 
          isGreenScreen={isGreenScreen} 
          onToggleGreenScreen={() => setIsGreenScreen(!isGreenScreen)} 
          // 🔥 传入心声控制 props
          showThoughts={showThoughts}
          onToggleThoughts={() => setShowThoughts(!showThoughts)}
      />
      {gameState.winner && <GameOverModal winner={gameState.winner} players={gameState.players} onViewHistory={() => setIsHistoryOpen(true)} onRestart={() => handleGameReset(false)} />}
      {isHistoryOpen && <GameHistoryModal logs={gameState.logs} players={gameState.players} onClose={() => setIsHistoryOpen(false)} />}
    </div>
  );
};
export default App;