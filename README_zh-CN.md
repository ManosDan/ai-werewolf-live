Markdown

# 🐺 AI Werewolf Live: Agent-based Werewolf Simulation
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Stream Ready](https://img.shields.io/badge/OBS-Stream_Ready-ff0000?logo=youtube&logoColor=white)](https://obsproject.com/)

> **全球首个专为直播设计的、由 LLM 驱动的 12 人全自动狼人杀竞技场。**
> World's first LLM-driven, Stream-Ready 12-player Werewolf simulation arena.

![游戏演示](./assets/demo.gif)
---

## ✨ 为什么这个项目很酷？(Core Features)

本项目不仅仅是一个多智能体研究（MAS）环境，更是一个**开箱即用的无人直播内容生成器**。

### 🎥 直播/推流就绪 (Stream Ready)
* **OBS 绿幕模式**：内置 `StreamLayout`，一键开启透明背景，直接嵌入 OBS 直播间。
* **动态战术盘 (Tactical Overlay)**：实时可视化 AI 的怀疑链（如：3号 🔴--> 5号），观众能直观看到 AI 的“杀心”。
* **沉浸式 UI**：不仅有代码日志，还有卡牌动画、发言气泡和语音合成（TTS）。
![游戏演示](./assets/speach-demo.gif)

### 🧠 硬核 AI 逻辑 (Deep Logic)
* **伪装与欺诈**：狼人 AI 具备 `[Inner Thought]`（私有思考）和 `[Public Speech]`（公开发言）双重通道，会倒钩、悍跳、甚至互相踩队友做身份。
* **上帝视角隔离**：严格的 `InformationService` 确保平民看不到狼队频道，神职只能看到自己的技能反馈。
* **物理规则引擎**：内置 `ConstraintGenerator`，从代码层面锁死非法操作（如：女巫不可自救、守卫不可同守），防止 AI 产生幻觉。

### 📊 结构化思维
AI 不仅输出文本，还输出**结构化认知矩阵 (Cognitive Matrix)**：
```json
{
  "thought": "3号刚才的发言逻辑有漏洞，像是强行找补...",
  "speech": "3号，既然你是预言家，为什么不留警徽流？",
  "tactics": { "suspicion_target": 3, "aggressiveness": 80 }
}
🛠️ 技术栈 (Tech Stack)
UI/Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion (动画)

Logic Core: Custom State Machine (自定义状态机)

AI Brain: Google Gemini Pro / DeepSeek-V3 (支持多模型切换)

Voice/TTS: Web Speech API / Edge TTS

🚀 快速开始 (Quick Start)
1. 克隆项目
Bash

git clone [https://github.com/YOUR_USERNAME/ai-werewolf-live.git](https://github.com/YOUR_USERNAME/ai-werewolf-live.git)
cd ai-werewolf-live
2. 安装依赖
Bash

npm install
# 或者 yarn install
3. 配置环境
复制 .env.example 为 .env。由于项目支持多模型，请至少填入一个 Key：

代码段

# 推荐使用 Google Gemini (免费且逻辑强) 或 DeepSeek
REACT_APP_GEMINI_API_KEY=AIzaSy...
# REACT_APP_DEEPSEEK_API_KEY=sk-...
4. 启动 (开发模式)
Bash

npm start
# 默认运行在 http://localhost:3000
🧠 系统架构 (System Architecture)
代码段

graph TD
    User[观众/直播间] --> UI[React UI / OBS Overlay]
    UI --> App[App.tsx (中央状态机)]
    
    subgraph "Core Logic"
        App --> Logic[LogicService (规则校验)]
        App --> Info[InformationService (视野隔离)]
    end
    
    subgraph "AI Brain"
        App --> GenAI[GeminiService (Prompt工程)]
        GenAI --> LLM[LLM API]
    end
🤝 贡献与路线图 (Roadmap)
我们正在寻找开发者一起完善：

[ ] 弹幕互动：接入 TikTok/B站 弹幕，允许观众送礼复活玩家或查验身份。

[ ] 更多角色：增加“白痴”、“骑士”等复杂角色。

[ ] 本地模型：适配 Ollama，让游戏可以完全离线运行。

欢迎提交 PR！

📄 License
MIT © 2024