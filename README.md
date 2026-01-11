# 🐺 AI Werewolf Live: Agent-based Werewolf Simulation

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Stream Ready](https://img.shields.io/badge/OBS-Stream_Ready-ff0000?logo=youtube&logoColor=white)](https://obsproject.com/)

> **World's first LLM-driven, Stream-Ready 12-player Werewolf simulation arena.**
> 全球首个专为直播设计的、由 LLM 驱动的 12 人全自动狼人杀竞技场。

[🇨🇳 中文文档 (Chinese Documentation)](./README_zh-CN.md)

---

![Game Demo](./assets/demo.gif)

## ✨ Why This Project? (Core Features)

This project is not just a Multi-Agent System (MAS) research environment, but a **content generation engine ready for live streaming**.

### 🎥 Stream-Ready & OBS Optimized
* **Green Screen Mode**: Built-in `StreamLayout` provides a transparent background for instant OBS integration.
* **Tactical Overlay**: Real-time visualization of the AI's "Suspicion Chain" (e.g., Player 3 🔴--> Player 5).
* **Immersive UI**: Features card animations, speech bubbles, and TTS (Text-to-Speech) support.

### 🧠 Advanced AI Logic (Theory of Mind)
* **Deception & Camouflage**: Werewolf agents possess dual channels: `[Inner Thought]` (Private) and `[Public Speech]`. They can perform advanced tactics like "Self-Charge" (Barbwire) or "Framing".
* **Information Gap**: Strict `InformationService` ensures Villagers cannot see the Wolf Channel, and Seers only see their own check results.
* **Physics Rule Engine**: A built-in `ConstraintGenerator` prevents hallucinations by locking illegal actions at the code level (e.g., Witch cannot self-save).

### 📊 Structured Cognitive Output
Agents act based on structured data, not just text generation:
```json
{
  "thought": "Player 3's logic has a flaw...",
  "speech": "Player 3, if you are the Seer, why didn't you leave a badge flow?",
  "tactics": { 
    "suspicion_target": 3, 
    "aggressiveness": 80,
    "intention": "QUESTIONING"
  }
}
🛠️ Tech Stack
UI/Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion

Logic Core: Custom Finite State Machine (FSM)

AI Brain: Google Gemini Pro / DeepSeek-V3 (Multi-model support)

Voice/TTS: Web Speech API / Edge TTS

🚀 Quick Start
1. Clone the Repo
Bash

git clone [https://github.com/YOUR_USERNAME/ai-werewolf-live.git](https://github.com/YOUR_USERNAME/ai-werewolf-live.git)
cd ai-werewolf-live
2. Install Dependencies
Bash

npm install
# or yarn install
3. Configure Environment
Copy .env.example to .env. Fill in at least one API Key:

代码段

# Google Gemini (Recommended for logic/cost) or DeepSeek
REACT_APP_GEMINI_API_KEY=AIzaSy...
# REACT_APP_DEEPSEEK_API_KEY=sk-...
4. Run (Dev Mode)
Bash

npm start
# Opens at http://localhost:3000
🧠 System Architecture
代码段

graph TD
    User[Audience/OBS] --> UI[React UI / Overlay]
    UI --> App[App.tsx (State Machine)]
    
    subgraph "Core Logic"
        App --> Logic[LogicService (Rule Validation)]
        App --> Info[InformationService (Fog of War)]
    end
    
    subgraph "AI Brain"
        App --> GenAI[GeminiService (Prompt Engineering)]
        GenAI --> LLM[LLM API]
    end
🤝 Roadmap & Contribution
We are looking for contributors to help with:

[ ] Live Interaction: Connect with TikTok/Bilibili API to allow audience to "Revive" or "Check" players via gifts.

[ ] Complex Roles: Add "Idiot", "Knight", or "Gravekeeper".

[ ] Local LLM: Support Ollama for fully offline play.

PRs are welcome!

📄 License
MIT © 2024