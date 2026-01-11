export enum Role {
  UNKNOWN = 'UNKNOWN',
  WEREWOLF = 'WEREWOLF',
  VILLAGER = 'VILLAGER',
  SEER = 'SEER',
  WITCH = 'WITCH',
  HUNTER = 'HUNTER',
  GUARD = 'GUARD'
}

export enum Faction {
  GOOD = 'GOOD',
  BAD = 'BAD'
}

export type AIProvider = 'DeepSeek' | 'Gemini' | 'Aliyun' | 'Zhipu' | 'Moonshot' | 'MiniMax' | 'Tencent' | 'Groq';

export enum Phase {
  SETUP = 'SETUP',
  NIGHT_START = 'NIGHT_START',
  NIGHT_GUARD = 'NIGHT_GUARD',
  NIGHT_WEREWOLF = 'NIGHT_WEREWOLF',
  NIGHT_WITCH = 'NIGHT_WITCH',
  NIGHT_SEER = 'NIGHT_SEER',
  DAY_START = 'DAY_START',
  DAY_SHERIFF_NOM = 'DAY_SHERIFF_NOM',
  DAY_SHERIFF_SPEECH = 'DAY_SHERIFF_SPEECH',
  DAY_SHERIFF_VOTE = 'DAY_SHERIFF_VOTE',
  DAY_SHERIFF_PK_SPEECH = 'DAY_SHERIFF_PK_SPEECH',
  DAY_SHERIFF_PK_VOTE = 'DAY_SHERIFF_PK_VOTE',
  DAY_ANNOUNCE = 'DAY_ANNOUNCE',
  DAY_LAST_WORDS = 'DAY_LAST_WORDS',
  DAY_DISCUSS = 'DAY_DISCUSS',
  DAY_VOTE = 'DAY_VOTE',
  DAY_PK_SPEECH = 'DAY_PK_SPEECH',
  DAY_PK_VOTE = 'DAY_PK_VOTE',
  DAY_EXECUTE = 'DAY_EXECUTE',
  SHERIFF_HANDOVER = 'SHERIFF_HANDOVER',
  GAME_OVER = 'GAME_OVER'
}

export interface Playstyle {
    label: string;      
    description: string; 
    quote: string;       
    temperature: {
        think: number;   
        speak: number;   
    };
}

export interface Player {
  id: number;
  name: string;
  gender: 'male' | 'female'; 
  role: Role;
  aiProvider: AIProvider;
  modelName: string;
  profile: Playstyle;
  isAlive: boolean;
  isProtected: boolean;
  isPoisoned: boolean;
  isSavedByWitch: boolean;
  isKnownBySeer: boolean;
  voteTarget: number | null;
  isSheriff: boolean;
  isCampaigning: boolean;
  isRoleRevealed: boolean; 
  deathReason?: 'NIGHT_DEATH' | 'VOTE_EXILE' | 'HUNTER_SHOOT';
}

export interface PlayerClaim {
  role: Role;
  targetId?: number;
  result?: 'GOOD' | 'BAD';
}

export interface PlayerAssessment {
    playerId: number;       
    roleLocation: 'WOLF' | 'GOOD' | 'GOD' | 'UNKNOWN'; 
    confidence: number;     
    aggression: number;     
    reason: string;         
}

export interface SpeechMetadata {
    matrix: PlayerAssessment[];
    intention: 'LEADING' | 'FOLLOWING' | 'DEFENDING' | 'FISHING';
}

export interface LogMessage {
  id: string;
  tick: number; 
  day: number;
  phase: string;
  senderId?: number;
  type: 'SYSTEM' | 'SPEECH' | 'THOUGHT' | 'ACTION_KILL' | 'ACTION_SAVE' | 'ACTION_CHECK' | 'ACTION_VOTE' | 'DEATH' | 'WOLF_CHANNEL' | 'VOTE_DETAIL' | 'SHERIFF'| 'VOTE';
  content: string;
  claim?: PlayerClaim;
  metadata?: SpeechMetadata; 
}

export interface GameState {
  globalTick: number; 
  day: number;
  phase: Phase;
  players: Player[];
  logs: LogMessage[];
  winner: Faction | null;
  nightVictimId: number | null;
  witchPotionUsed: boolean;
  witchPoisonUsed: boolean;
  seerCheckId: number | null;
  guardProtectId: number | null;
  lastGuardProtectId: number | null;
  discussionQueue: number[];
  sheriffId: number | null;
  sheriffCandidates: number[];
  pkCandidates: number[];
  nextPhaseAfterLastWords?: Phase; 
}

export type AnimationType = 'CLAW' | 'POTION' | 'SEER' | 'GUN' | 'SHIELD' | 'VOTE' | 'DAY_NIGHT' | 'SHERIFF' | null;

export interface AnimationEvent {
  type: AnimationType;
  targetId?: number;
  sourceId?: number;
  text?: string;
}

export interface StructuredGameState {
  day: number;
  phase: Phase;
  alivePlayerIds: number[];
  deadPlayerIds: number[];
  roles: {
    [playerId: number]: {
      claimed?: Role;          
      verified?: Role | null;  
    }
  };
  voteHistory: {
    [day: number]: {
      [phase: string]: {
        [voterId: number]: number; 
      }
    }
  };
  speechHighlights: {
    [playerId: number]: {
      claims: PlayerClaim[];     
      accusations: number[];     
    }
  };
}

export interface RosterItem {
    id: number;
    name: string;
    gender: string;
    status: string;
}

export interface PlayerPerspective {
  playerId: number;
  role: Role;
  faction: 'GOOD' | 'BAD';
  publicInfo: {
    alive: number[];
    dead: any[]; 
    sheriff: number | null;
    voteRecords: Array<{phase: string, voter: number, target: number}>;
    publicClaims: Array<{player: number, claim: PlayerClaim}>;
    roster?: RosterItem[];
    timeline: Array<{
        tick: number;
        day: number;
        phase: string;
        actor: number;
        event: string;
        summary: string;
    }>;
  };
  privateInfo: {
    // 🔥 [新增] 这里添加 textSummary 字段以修复报错
    textSummary?: string; 
    
    // (以下保持原有字段，防止其他地方报错)
    wolfTeam?: number[];
    wolfChannel?: Array<{sender: number, content: string}>;
    seerChecks?: Array<{target: number, result: 'GOOD' | 'BAD'}>;
    witchKnowledge?: {
      description: string;
      dyingPlayer: string;
      potionStatus: { antidote: string; poison: string };
    } | any;
    guardHistory?: Array<{night: number, target: number}>;
    seerKnowledge?: {
        description: string;
        history: Array<{targetId: number, identity: string, turn: number}>;
    };
  };
  tacticalState: {
    strategy: string;
  };
}

export interface PhaseConstraints {
  currentPhase: Phase;
  allowedActions: string[];  
  requiredActions?: string[];
  forbiddenActions: string[];
}

export interface RoleConstraints {
  role: Role;
  informationVisibility: {
    seesWerewolfTeam: boolean;
    seesSeerChecks: boolean;
    seesWitchPotions: boolean;
    seesGuardHistory: boolean;
    knowsNightKillTarget: boolean;
  };
  actionLimits: {
    canSelfTarget: boolean;
    canTargetTeammates: boolean;
    mustActIfPossible?: boolean;
  };
}

export interface GameConstraints {
  currentPhase: Phase;
  playerRole: Role;
  phaseConstraints: {
    canSpeak: boolean;
    canVote: boolean;
    mustVote?: boolean;
    targetOptions: number[]; 
    allowedActions: string[]; 
  };
  roleConstraints: {
    information: string[];   
    limits: string[];        
    permissions: string[];   
  };
}

// 🔥 核心修复：把 AIResponse 定义在这里，全项目通用
export interface AIResponse { 
    speech: string; 
    thought: string; 
    voteTarget?: number; 
    claim?: PlayerClaim;
    metadata?: any; 
    actionParams?: any;
}

export interface DecisionContext {
  // 基础身份
  playerId: number;
  role: Role;
  phase: string;
  isAlive: boolean;
  
  // 认知边界 (Cognitive Boundaries)
  knows: string[];       // 确定的事实 (我知道我是狼)
  doesntKnow: string[];  // 确定的未知 (我不知道谁是女巫)
  
  // 心理模型 (Mental Model)
  mindset: string;       // 当前的心理活动 (如：我要假装好人)
  speechStyle: string;   // 说话风格 (如：暴躁、阴阳怪气)
  goals: string[];       // 当前行动目标 (如：抗推预言家)
}