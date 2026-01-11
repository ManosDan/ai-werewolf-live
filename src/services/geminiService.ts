import { Player, Role, GameState, AIProvider, AIResponse } from "../types";
import { validateAndFixResponse, ConstraintGenerator } from "./logicService";
import { InformationExtractor } from "./informationService";
import { DecisionEngine } from "./decisionEngine"; // ✅ 确保你已经创建了这个文件
import { getPlayerConfig } from '../constants'; 

interface ProviderConfig { endpoint: string; apiKey: string; type: 'openai-compatible' | 'gemini-native'; }
const ENV = import.meta.env;

const PROVIDER_REGISTRY: Record<AIProvider, ProviderConfig> = {
    'DeepSeek': { endpoint: "https://api.siliconflow.cn/v1/chat/completions", apiKey: ENV.VITE_DEEPSEEK_API_KEY || "", type: 'openai-compatible' },
    'Aliyun': { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", apiKey: ENV.VITE_ALIYUN_API_KEY || "", type: 'openai-compatible' },
    'Gemini': { endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey: ENV.VITE_GEMINI_API_KEY || "", type: 'openai-compatible' },
    'Moonshot': { endpoint: "https://api.moonshot.cn/v1/chat/completions", apiKey: ENV.VITE_MOONSHOT_API_KEY || "", type: 'openai-compatible' },
    'MiniMax': { endpoint: "https://api.minimax.chat/v1/text/chatcompletion_v2", apiKey: ENV.VITE_MINIMAX_API_KEY || "", type: 'openai-compatible' },
    'Zhipu': { endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions", apiKey: ENV.VITE_ZHIPU_API_KEY || "", type: 'openai-compatible' },
    'Tencent': { endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions", apiKey: ENV.VITE_TENCENT_API_KEY || "", type: 'openai-compatible' },
    'Groq': { endpoint: "https://api.groq.com/openai/v1/chat/completions", apiKey: ENV.VITE_GROQ_API_KEY || "", type: 'openai-compatible' }
};

const SAFE_FALLBACK_PROVIDER: AIProvider = 'DeepSeek'; 
const SAFE_FALLBACK_MODEL = "Qwen/Qwen2.5-7B-Instruct"; 

// --- JSON 清洗工具 ---
const cleanJSONResponse = (text: string): any => {
    try {
        let cleanText = text.trim();
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        const firstOpen = cleanText.indexOf('{');
        const lastClose = cleanText.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) cleanText = cleanText.substring(firstOpen, lastClose + 1);
        cleanText = cleanText.replace(/[\r\n\t]+/g, ' '); 
        return JSON.parse(cleanText);
    } catch (e) {
        return { speech: "...", thought: "（解析错误，跳过）", voteTarget: 0 };
    }
};

// --- API 请求器 ---
const executeAIRequest = async (provider: AIProvider, initialModel: string, systemPrompt: string, userContent: string, temperature: number): Promise<any> => {
    let config = PROVIDER_REGISTRY[provider];
    if (!config || !config.apiKey) {
        config = PROVIDER_REGISTRY[SAFE_FALLBACK_PROVIDER];
        initialModel = SAFE_FALLBACK_MODEL;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); 
    
    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: initialModel, 
                messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userContent } ],
                temperature: temperature, 
                max_tokens: 512
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        return cleanJSONResponse(data.choices[0].message.content || "{}");
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// --- 🔥 [核心] 生成玩家行动 (深度汉化版) ---
export const generatePlayerTurn = async (player: Player, gameState: GameState, specificInstruction: string): Promise<AIResponse> => {
    
    // 1. 🧠 认知层：生成大脑上下文 (From DecisionEngine)
    const context = DecisionEngine.createDecisionContext(player, gameState);
    
    // 2. 👁️ 感知层：获取视野内的最近日志 (From InformationService)
    const visibleLogs = InformationExtractor.getVisibleLogsForPlayer(gameState, player, 10);
    
    // 3. 🔒 物理层：获取合法的行动目标
    const constraints = ConstraintGenerator.generateConstraintsForAI(player, gameState);
    const validTargets = constraints.phaseConstraints.targetOptions;

    // 4. 🗣️ 表达层：构建全中文 Prompt
    const systemPrompt = `
# 核心指令
你正在进行一场真实的狼人杀游戏。你是一个**真人玩家**。
请扮演 {id}号玩家 ({role})。

## 🎭 你的角色设定
- **名字**: ${getPlayerConfig(player.id).name}
- **当前心态**: ${context.mindset}
- **发言风格**: ${context.speechStyle}
- **当前目标**: ${context.goals.join(", ")}

## 🧠 你的记忆库 (已知事实)
${context.knows.map(k => `✅ ${k}`).join('\n')}

## 🚫 你的盲区 (严禁出现幻觉)
${context.doesntKnow.map(k => `❌ ${k}`).join('\n')}

## 📜 现场实况 (你最近看到/听到的)
${visibleLogs.length > 0 ? visibleLogs.join('\n') : "(暂无最近消息)"}

## 🎯 当前任务
指令: ${specificInstruction}
当前阶段: ${gameState.phase}
合法行动目标 (ID): [${validTargets.join(', ')}] 或填 0 (弃权/空过)

## 📝 输出规则 (严格 JSON 格式)
1. **纯净 JSON**: 只输出 JSON 字符串，严禁包含 \`\`\`json 或其他解释性文字。
2. **第一人称**: 必须用“我”来称呼自己。
3. **内心独白 (thought)**: 诚实地记录你的战术思考（仅观众可见）。
4. **公开言论 (speech)**: 这是最重要的！不仅面向玩家，也面向看游戏的观众！！这是你对所有人说的话（如果你是狼人，必须在 speech 里伪装，但 thought 要诚实）。
5. **行动参数**: 必须包含 voteTarget。

JSON 格式示例:
{
  "speech": "大家听我说，我觉得5号逻辑不通...",
  "thought": "5号踩到我痛脚了，我要把他抗推出去...",
  "voteTarget": 5,
  "actionParams": { "useAntidote": false, "poisonTarget": 0 }
}
`;

    const userContent = `现在轮到你了 (${player.id}号)。请根据场上局势执行指令。`;

    try {
        // 使用配置的温度，若无则默认 0.7
        const temp = player.profile.temperature?.speak || 0.7;
        
        const rawResponse = await executeAIRequest(player.aiProvider, player.modelName, systemPrompt, userContent, temp);
        
        // 逻辑层兜底修正
        return validateAndFixResponse(player, gameState, rawResponse);
    } catch (e) {
        console.error(`[AI Error] ${player.id}号 生成失败`, e);
        return { 
            speech: "...", 
            thought: "（思考中断）", 
            voteTarget: 0 
        };
    }
};

export const generateWolfStrategy = async (gameState: GameState): Promise<string> => {
    return "自由行动，优先击杀神职"; 
};