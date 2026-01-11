// 📂 services/decisionEngine.ts (新建文件)
import { Player, GameState, Role, DecisionContext } from "../types";
import { getPlayerConfig } from "../constants";

export class DecisionEngine {
  
  static createDecisionContext(player: Player, gameState: GameState): DecisionContext {
    const config = getPlayerConfig(player.id);
    const roleContext = this.getRoleSpecificContext(player, gameState);
    
    return {
      playerId: player.id,
      role: player.role,
      phase: gameState.phase,
      isAlive: player.isAlive,
      
      knows: roleContext.knows,
      doesntKnow: roleContext.doesntKnow,
      mindset: roleContext.mindset,
      
      // 将配置表里的性格描述转化为具体的 Prompt 指令
      speechStyle: this.getSpeechStyle(config.personality),
      goals: roleContext.goals
    };
  }

  private static getSpeechStyle(personality: string): string {
    if (personality.includes("逻辑")) return "极度理性，分析票型和逻辑漏洞，不谈感情。";
    if (personality.includes("暴躁")) return "情绪激动，攻击性强，容不得别人反驳，用词激烈。";
    if (personality.includes("绿茶")) return "语气柔弱，装作无辜，喜欢用反问句引导别人怀疑目标。";
    if (personality.includes("阴阳")) return "说话带刺，嘲讽技能满点，喜欢用比喻。";
    if (personality.includes("高冷")) return "字数极少，惜字如金，不屑于解释。";
    if (personality.includes("谨慎")) return "唯唯诺诺，不敢把话说死，经常用'可能'、'也许'。";
    return "自然、口语化，像个普通玩家一样说话。";
  }

  private static getRoleSpecificContext(player: Player, gameState: GameState) {
    const isNight = gameState.phase.includes("NIGHT");
    const dayCount = gameState.day;

    // --- 1. 狼人 (Werewolf) ---
    if (player.role === Role.WEREWOLF) {
      const teammates = gameState.players
        .filter(p => p.role === Role.WEREWOLF && p.id !== player.id)
        .map(p => p.id);
      
      const nightTarget = gameState.nightVictimId ? `${gameState.nightVictimId}号` : "未知";

      return {
        knows: isNight 
          ? [`我是狼人`, `我的狼队友是: ${teammates.length ? teammates.join(',')+'号' : '无'}`]
          : [`我是狼人 (白天必须死命伪装成好人!)`, `昨晚我们刀了: ${nightTarget}`],
        doesntKnow: [`谁是女巫`, `谁是猎人`, `谁是守卫`],
        mindset: isNight 
          ? "我要和队友配合，找出神职并击杀。如果队友有分歧，我要统一意见。" 
          : "我要潜伏在好人中。如果有必要，我可以悍跳预言家搅浑水，或者倒钩（出卖队友）来做好身份。",
        goals: ["生存", "误导好人", "找出神职", "将好人抗推"]
      };
    }

    // --- 2. 预言家 (Seer) ---
    if (player.role === Role.SEER) {
       const checkHistory = gameState.logs
          .filter(l => l.type === 'ACTION_CHECK' && l.senderId === player.id)
          .map(l => l.content); // 例如 "查验 3号 -> 狼人"

       return {
         knows: [`我是预言家`, ...checkHistory],
         doesntKnow: [`谁是女巫`, `谁是守卫`, `除查验外的狼人是谁`],
         mindset: "我是场上唯一的真预言家。我要诚恳地报出查验信息。面对悍跳狼，我要指出他的逻辑漏洞，用真诚打动好人。",
         goals: ["报出查验结果", "留下警徽流", "放逐悍跳狼"]
       };
    }

    // --- 3. 女巫 (Witch) ---
    if (player.role === Role.WITCH) {
      const potionStatus = `解药:${gameState.witchPotionUsed?'已用':'可用'}, 毒药:${gameState.witchPoisonUsed?'已用':'可用'}`;
      const silverWater = (!gameState.witchPotionUsed && gameState.nightVictimId) 
          ? `今晚 ${gameState.nightVictimId}号 倒牌了(我可以救)。` 
          : ``;

      return {
        knows: [`我是女巫`, potionStatus, silverWater].filter(Boolean),
        doesntKnow: [`谁是预言家`, `谁是猎人`, `我救的人到底是好人还是自刀狼`],
        mindset: "我拥有强大的生杀大权。如果有人穿我衣服（对跳女巫），我会毫不犹豫毒死他。首夜通常我会救人。",
        goals: ["平衡局势", "毒杀狼人", "保护好人核心"]
      };
    }

    // --- 4. 猎人 (Hunter) ---
    if (player.role === Role.HUNTER) {
        return {
            knows: ["我是猎人", "我死后可以开枪带走一人（除非被毒杀）"],
            doesntKnow: ["谁是好人", "谁是狼人"],
            mindset: "我是全场最强硬的牌。谁敢踩我，我就崩了谁。我不怕死，但我要带走狼人。",
            goals: ["通过强势发言找狼", "死后带走狼人"]
        };
    }

    // --- 5. 守卫 (Guard) ---
    if (player.role === Role.GUARD) {
        const lastProtect = gameState.lastGuardProtectId ? `昨晚守了 ${gameState.lastGuardProtectId}号` : "昨晚空守";
        return {
            knows: ["我是守卫", lastProtect, "我不能连续两晚守同一个人"],
            doesntKnow: ["谁是女巫", "谁是预言家"],
            mindset: "我要预判狼人的刀法，守护预言家或女巫。我要藏好身份，别被狼人抿出来。",
            goals: ["守护关键人物", "创造平安夜"]
        };
    }

    // --- 6. 平民 (Villager) ---
    return {
      knows: [`我是平民`, `我没有任何特殊技能`, `我是一个闭眼玩家`],
      doesntKnow: [`谁是好人`, `谁是狼人`, `谁是神职`],
      mindset: "我目前信息闭塞。我要仔细听每个人的发言，观察票型。如果有人逻辑不通，他可能就是狼。",
      goals: ["不被抗推", "找出真预言家", "跟随神职投票"]
    };
  }
}