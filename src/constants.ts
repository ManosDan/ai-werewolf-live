import { Role, AIProvider, Playstyle } from './types';

// =================================================================
// 🎭 1. 玩家全维配置表 (核心中枢)
// =================================================================

const TTS_MODEL_BASE = "FunAudioLLM/CosyVoice2-0.5B";

export const PLAYER_CONFIG: Record<number, { 
    name: string; 
    gender: 'male' | 'female';
    personality: string;      
    voice: string;            
    speed: number;            
}> = {
    0: { name: "上帝", gender: 'male', personality: "客观、公正。", voice: `${TTS_MODEL_BASE}:alex`, speed: 1.0 },
    1: { name: "理智哥", gender: 'male', personality: "逻辑缜密。", voice: `${TTS_MODEL_BASE}:david`, speed: 1.0 },
    2: { name: "小甜心", gender: 'female', personality: "绿茶性格。", voice: `${TTS_MODEL_BASE}:anna`, speed: 1.1 },
    3: { name: "暴躁大叔", gender: 'male', personality: "脾气火爆。", voice: `${TTS_MODEL_BASE}:benjamin`, speed: 1.25 },
    4: { name: "高冷御姐", gender: 'female', personality: "话少高傲。", voice: `${TTS_MODEL_BASE}:bella`, speed: 0.9 },
    5: { name: "乐子人", gender: 'male', personality: "阴阳怪气。", voice: `${TTS_MODEL_BASE}:alex`, speed: 1.1 },
    6: { name: "温柔阿姨", gender: 'female', personality: "知心大姐姐。", voice: `${TTS_MODEL_BASE}:diana`, speed: 0.95 },
    7: { name: "逻辑帝", gender: 'male', personality: "严谨论文风。", voice: `${TTS_MODEL_BASE}:charles`, speed: 1.0 },
    8: { name: "胆小妹", gender: 'female', personality: "谨慎。", voice: `${TTS_MODEL_BASE}:anna`, speed: 0.85 },
    9: { name: "冲动男", gender: 'male', personality: "直肠子。", voice: `${TTS_MODEL_BASE}:david`, speed: 1.2 },
    10: { name: "深沉男", gender: 'male', personality: "城府深。", voice: `${TTS_MODEL_BASE}:benjamin`, speed: 0.9 },
    11: { name: "普通青年", gender: 'male', personality: "看状态。", voice: `${TTS_MODEL_BASE}:alex`, speed: 1.0 },
    12: { name: "焦虑女", gender: 'female', personality: "神经质。", voice: `${TTS_MODEL_BASE}:diana`, speed: 1.2 }
};

export const getPlayerConfig = (id: number) => {
    const cfg = PLAYER_CONFIG[id];
    return {
        name: cfg ? cfg.name : `${id}号玩家`,
        gender: (cfg ? cfg.gender : 'male') as 'male' | 'female', 
        personality: cfg ? cfg.personality : "普通玩家。",
        voice: cfg ? cfg.voice : `${TTS_MODEL_BASE}:alex`,
        speed: cfg ? cfg.speed : 1.0
    };
};

export const PLAYSTYLES: Playstyle[] = [
  { label: "理智分析帝", description: "逻辑缜密", quote: "...", temperature: { think: 0.05, speak: 0.2 } },
  { label: "毒舌御姐", description: "气场强大", quote: "...", temperature: { think: 0.2, speak: 0.9 } },
  { label: "甜妹/豆包风", description: "高情商", quote: "...", temperature: { think: 0.3, speak: 0.95 } },
  { label: "冲浪达人", description: "思维跳跃", quote: "...", temperature: { think: 0.4, speak: 0.9 } },
  { label: "吃瓜乐子人", description: "心态超然", quote: "...", temperature: { think: 0.5, speak: 1.0 } }
];

export const AI_PROVIDERS: AIProvider[] = ['DeepSeek', 'Aliyun', 'Gemini', 'Zhipu', 'Moonshot', 'MiniMax', 'Tencent', 'Groq'];

// 🔥 核心修改：在这里定义 SiliconFlow 支持的真实模型 ID
export const MODEL_CATALOG: Record<string, string[]> = {
  // 注意：我们将 Qwen 也放在 DeepSeek 列表里，或者在 App.tsx 里强制指定 Provider 为 DeepSeek
  // 这样做是为了让 Qwen 也走 SiliconFlow 的 API Endpoint (api.siliconflow.cn)
  DeepSeek: [
      'deepseek-ai/DeepSeek-V3',       // 👑 主力战神 (便宜且强)
      'Qwen/Qwen2.5-7B-Instruct',      // 🆓 免费劳工 (极速)
      'Qwen/Qwen2.5-72B-Instruct',     // 🚀 备用强力模型
      'InternLM/internlm2_5-7b-chat'   // 🚀 备用免费模型
  ], 
  Aliyun:   ['qwen-plus', 'qwen-max'], 
  Gemini:   ['gemini-1.5-flash', 'gemini-1.5-pro'], 
  Zhipu:    ['glm-4', 'glm-4-flash'], 
  Moonshot: ['moonshot-v1-8k'], 
  MiniMax:  ['abab6.5s-chat'], 
  Tencent:  ['hunyuan-lite'], 
  Groq:     ['llama3-70b-8192'] 
};

export const PROVIDER_CONFIG = {
  DeepSeek: { label: 'SiliconFlow', icon: '⚡', color: 'text-blue-400', bg: 'bg-blue-900/40', border: 'border-blue-500/50' },
  Aliyun:   { label: '通义千问', icon: '🔶', color: 'text-orange-400', bg: 'bg-orange-900/40', border: 'border-orange-500/50' },
  Gemini:   { label: 'Gemini',   icon: '🌟', color: 'text-fuchsia-400', bg: 'bg-fuchsia-900/40', border: 'border-fuchsia-500/50' },
  Zhipu:    { label: '智谱GLM',  icon: '🧠', color: 'text-teal-400', bg: 'bg-teal-900/40', border: 'border-teal-500/50' },
  Moonshot: { label: 'Kimi',     icon: '🌙', color: 'text-indigo-400', bg: 'bg-indigo-900/40', border: 'border-indigo-500/50' },
  MiniMax:  { label: '海螺AI',   icon: '🐚', color: 'text-rose-400', bg: 'bg-rose-900/40', border: 'border-rose-500/50' },
  Tencent:  { label: '腾讯混元', icon: '🐧', color: 'text-sky-400', bg: 'bg-sky-900/40', border: 'border-sky-500/50' },
  Groq:     { label: 'Groq',     icon: '🚀', color: 'text-emerald-400', bg: 'bg-emerald-900/40', border: 'border-emerald-500/50' }
};

export const ROLE_CONFIG = {
  [Role.UNKNOWN]: { label: '待定', icon: '❓', color: 'text-slate-500', bg: 'bg-slate-800', border: 'border-slate-600' },
  [Role.WEREWOLF]: { label: '狼人', icon: '🐺', color: 'text-red-500', bg: 'bg-red-900/30', border: 'border-red-600' },
  [Role.VILLAGER]: { label: '平民', icon: '🧑‍🌾', color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-600' },
  [Role.SEER]: { label: '预言家', icon: '🔮', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-600' },
  [Role.WITCH]: { label: '女巫', icon: '🧪', color: 'text-fuchsia-400', bg: 'bg-fuchsia-900/30', border: 'border-fuchsia-600' },
  [Role.HUNTER]: { label: '猎人', icon: '🔫', color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-600' },
  [Role.GUARD]: { label: '守卫', icon: '🛡️', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-600' },
};

export const INITIAL_ROLE_DISTRIBUTION = [
  Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF,
  Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
  Role.SEER, Role.WITCH, Role.GUARD, Role.HUNTER
];

export const AI_NAMES = Object.values(PLAYER_CONFIG).filter(p => p.name !== "上帝").map(p => p.name);

const SFX_POP = "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAAAAAAAAAAD/AAAAAAAA";
const SFX_CLICK = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export const REAL_AUDIO_ASSETS = {
    BGM: { DAY: "/sounds/bgm_day.mp3", NIGHT: "/sounds/bgm_night.mp3" },
    SFX: { CLAW: SFX_POP, GUN: SFX_POP, POTION: SFX_POP, VOTE: SFX_POP, SHERIFF: SFX_CLICK, DAY_NIGHT: SFX_CLICK }
};