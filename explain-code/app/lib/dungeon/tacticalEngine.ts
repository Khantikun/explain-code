import {
  BattleSnapshot,
  ElementType,
  MonsterActionResult,
  MonsterEntity,
  MonsterReactionResult,
  PlayerCombatState,
  SpellExecutionResult,
  SpellOutputAction,
} from "./tacticalTypes";

/**
 * Cross-Elemental Reactions Table
 */
export const ELEMENTAL_REACTIONS: Record<
  string,
  {
    multiplier: number;
    description: string;
    resultingElement?: ElementType;
    armorPiercingBonus?: number;
  }
> = {
  "Fire:Ice": {
    multiplier: 1.75,
    description: "ปฏิกิริยาหลอมละลาย (Melt): ไฟละลายน้ำแข็งอย่างรวดเร็ว ทำความเสียหาย 1.75 เท่า",
    resultingElement: "Water",
  },
  "Lightning:Water": {
    multiplier: 2.0,
    description: "ปฏิกิริยานำไฟฟ้า (Electro-Conduction): สายฟ้าช็อตผ่านน้ำ ทะลวงเกราะ 100% ดาเมจ 2 เท่า",
    armorPiercingBonus: 100,
  },
  "Wind:Fire": {
    multiplier: 1.3,
    description: "ปฏิกิริยาพายุเพลิง (Firestorm): ลมโหมกระพือไฟ เพิ่มความเสียหาย 1.3 เท่า",
  },
  "Fire:Water": {
    multiplier: 0.5,
    description: "ปฏิกิริยาดับมอด (Extinguish): น้ำดับไฟ ดาเมจลดลงเหลือครึ่งเดียว",
  },
  "Earth:Lightning": {
    multiplier: 0.25,
    description: "ปฏิกิริยาสายดิน (Grounding): ธาตุดินดูดซับประจุไฟฟ้าเกือบทั้งหมด",
  },
  "Ice:Water": {
    multiplier: 1.2,
    description: "ปฏิกิริยาเยือกแข็ง (Glacial Snap): น้ำแข็งประสานน้ำ ตรึงเป้าหมายให้อยู่กับที่",
  },
};

export function calculateElementalReaction(
  spellElement: ElementType,
  enemyElement: ElementType
): { multiplier: number; description?: string; armorPiercingBonus?: number } {
  if (spellElement === enemyElement && spellElement !== "Physical") {
    return { multiplier: 0.8, description: "ธาตุตรงกัน: พลังเวทถูกดูดซับบางส่วน (0.8x)" };
  }

  const key = `${spellElement}:${enemyElement}`;
  const reaction = ELEMENTAL_REACTIONS[key];
  if (reaction) {
    return {
      multiplier: reaction.multiplier,
      description: reaction.description,
      armorPiercingBonus: reaction.armorPiercingBonus,
    };
  }

  return { multiplier: 1.0 };
}

/**
 * Sandboxed Execution of Player's Spell Code
 * Evaluates function against current battle snapshot.
 */
export function executePlayerSpell(
  codeString: string,
  snapshot: BattleSnapshot
): SpellExecutionResult {
  const startTime = performance.now();
  const enemy = snapshot.targetEnemy;
  const player = snapshot.player;

  // Static AST/Safety pre-check
  if (/\b(window|document|fetch|XMLHttpRequest|localStorage|sessionStorage|eval)\b/.test(codeString)) {
    return {
      success: false,
      action: null,
      errorType: "SyntaxError",
      errorMessage: "ตรวจพบคำสั่งต้องห้ามด้านความปลอดภัย (Forbidden API Access)",
      executionTimeMs: 0,
      iterationsCount: 0,
      ramTraceLog: [],
    };
  }

  try {
    // Sandbox wrapper with loop count guard
    let loopIterationCount = 0;
    const maxIterations = 50;

    const wrappedCode = `
      "use strict";
      return (function(battleState, enemy, player) {
        let __iterationCount = 0;
        function __guardLoop() {
          __iterationCount++;
          if (__iterationCount > ${maxIterations}) {
            throw new Error("__INFINITE_LOOP_DETECTED__");
          }
        }

        ${codeString.replace(/\b(for|while)\s*\(([^)]*)\)\s*\{/g, "$1 ($2) { __guardLoop();")}
        
        if (typeof castSpell === "function") {
          return castSpell(battleState, enemy, player);
        }
        throw new Error("ไม่พบการประกาศฟังก์ชัน castSpell(battleState, enemy, player)");
      })(battleState, enemy, player);
    `;

    const evaluator = new Function("battleState", "enemy", "player", wrappedCode);
    const rawResult = evaluator(snapshot, enemy, player);
    const executionTime = performance.now() - startTime;

    // Parse returned action
    let action: SpellOutputAction;

    if (typeof rawResult === "number") {
      if (isNaN(rawResult)) {
        return {
          success: false,
          action: null,
          errorType: "RuntimeNaN",
          errorMessage: "ผลลัพธ์การคำนวณกลายเป็น NaN (Spell Fizzle)",
          executionTimeMs: executionTime,
          iterationsCount: loopIterationCount,
          ramTraceLog: [],
        };
      }
      action = {
        actionType: "Attack",
        baseDamage: Math.max(0, Math.round(rawResult)),
        element: "Physical",
        hitCount: 1,
        isCritical: false,
        armorPiercingPercent: 0,
        targetMode: "Single",
        manaConsumed: 15,
        sideEffects: ["การโจมตีกายภาพพื้นฐาน"],
      };
    } else if (typeof rawResult === "object" && rawResult !== null) {
      const damage = typeof rawResult.damage === "number" && !isNaN(rawResult.damage) ? rawResult.damage : 30;
      const hitCount = typeof rawResult.hitCount === "number" && rawResult.hitCount > 0 ? Math.min(10, Math.round(rawResult.hitCount)) : 1;
      const element = (rawResult.element as ElementType) || "Physical";
      const isCritical = Boolean(rawResult.isCritical);
      const armorPiercing = typeof rawResult.armorPiercing === "number" ? Math.min(100, Math.max(0, rawResult.armorPiercing)) : 0;
      const targetMode = rawResult.targetMode === "AllEnemies" ? "AllEnemies" : "Single";
      const sideEffects: string[] = Array.isArray(rawResult.sideEffects) ? rawResult.sideEffects : [];

      // Calculate Mana Consumption based on code complexity & hits
      const manaCost = 15 + (hitCount - 1) * 10 + (isCritical ? 15 : 0) + (rawResult.manaCostDelta || 0);

      action = {
        actionType: "Attack",
        baseDamage: Math.max(0, Math.round(damage)),
        element,
        hitCount,
        isCritical,
        armorPiercingPercent: armorPiercing,
        targetMode,
        appliedStatus: rawResult.appliedStatus,
        manaConsumed: Math.max(10, manaCost),
        sideEffects,
      };
    } else {
      return {
        success: false,
        action: null,
        errorType: "SyntaxError",
        errorMessage: "ฟังก์ชันต้องส่งคืนค่าเป็นตัวเลขดาเมจ หรือ Action Object",
        executionTimeMs: executionTime,
        iterationsCount: loopIterationCount,
        ramTraceLog: [],
      };
    }

    // Check Mana
    if (player.currentMana < action.manaConsumed) {
      return {
        success: false,
        action: {
          ...action,
          baseDamage: Math.round(action.baseDamage * 0.3), // Misfire with 30% damage
          sideEffects: ["มานาไม่พอสำหรับร่ายเต็มสูบ เวทมนตร์ติดขัด (Low Mana Fizzle)"],
        },
        errorType: "OutOfMana",
        errorMessage: `มานาไม่เพียงพอ (ต้องการ ${action.manaConsumed} แต่มีเพียง ${player.currentMana})`,
        executionTimeMs: executionTime,
        iterationsCount: loopIterationCount,
        ramTraceLog: [],
      };
    }

    return {
      success: true,
      action,
      executionTimeMs: executionTime,
      iterationsCount: loopIterationCount,
      ramTraceLog: [{ total: action.baseDamage, element: action.element, hitCount: action.hitCount }],
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const executionTime = performance.now() - startTime;

    if (errorMsg.includes("__INFINITE_LOOP_DETECTED__")) {
      return {
        success: false,
        action: null,
        errorType: "InfiniteLoop",
        errorMessage: "ตรวจพบลูปไม่รู้จบ (Infinite Loop): เกิน 50 รอบ เกิดความร้อนสะสมจนเครื่องค้าง (System Overheat)",
        executionTimeMs: executionTime,
        iterationsCount: 50,
        ramTraceLog: [],
      };
    }

    return {
      success: false,
      action: null,
      errorType: "SyntaxError",
      errorMessage: `ข้อผิดพลาดในโค้ด: ${errorMsg}`,
      executionTimeMs: executionTime,
      iterationsCount: 0,
      ramTraceLog: [],
    };
  }
}

/**
 * Resolve Single Combat Round
 */
export function resolveCombatTurn(
  player: PlayerCombatState,
  monster: MonsterEntity,
  spellResult: SpellExecutionResult,
  snapshot: BattleSnapshot
): {
  updatedPlayer: PlayerCombatState;
  updatedMonster: MonsterEntity;
  combatLogs: {
    turn: number;
    sender: "player" | "monster" | "system";
    message: string;
    details?: string;
    type: "info" | "damage" | "heal" | "reaction" | "error";
  }[];
} {
  const logs: {
    turn: number;
    sender: "player" | "monster" | "system";
    message: string;
    details?: string;
    type: "info" | "damage" | "heal" | "reaction" | "error";
  }[] = [];

  let nextPlayer = { ...player };
  let nextMonster = { ...monster };

  // Phase 1: Check Player Overheat
  if (spellResult.errorType === "InfiniteLoop") {
    const selfDamage = Math.round(player.maxHp * 0.1);
    nextPlayer.currentHp = Math.max(0, nextPlayer.currentHp - selfDamage);
    nextPlayer.overheatCooldown = 1; // Stunned next turn
    logs.push({
      turn: snapshot.turnNumber,
      sender: "system",
      message: "SYSTEM OVERHEAT! โค้ดวนลูปไม่รู้จบ พลังงานย้อนกลับทำร้ายผู้เล่น!",
      details: `เสียเลือด ${selfDamage} HP และติดสถานะชาร์จค้าง (Stun) 1 เทิร์น`,
      type: "error",
    });
  } else if (!spellResult.success || !spellResult.action) {
    logs.push({
      turn: snapshot.turnNumber,
      sender: "system",
      message: "SPELL FIZZLE! เวทมนตร์ล้มเหลว ดาเมจกลายเป็น 0",
      details: spellResult.errorMessage || "โค้ดคืนค่าไม่ถูกต้อง",
      type: "error",
    });
  } else {
    // Player action succeeded
    const action = spellResult.action;
    nextPlayer.currentMana = Math.max(0, nextPlayer.currentMana - action.manaConsumed);

    // Calculate Elemental Reaction
    const reaction = calculateElementalReaction(action.element, monster.element);
    const effectiveArmorPiercing = Math.min(100, action.armorPiercingPercent + (reaction.armorPiercingBonus || 0));

    // Ask Monster's Reactive Script
    const monsterResponse = monster.behaviorScript(action, snapshot);

    // Calculate Final Damage
    const rawDamagePerHit = action.baseDamage * reaction.multiplier;
    const mitigatedArmor = monster.baseArmor * (1 - effectiveArmorPiercing / 100);
    const finalDamagePerHit = Math.max(1, Math.round(rawDamagePerHit - mitigatedArmor));
    const totalPlayerDamage = finalDamagePerHit * action.hitCount;

    if (monsterResponse.absorbedOrReflected) {
      logs.push({
        turn: snapshot.turnNumber,
        sender: "monster",
        message: `สคริปต์ศัตรูทำงาน: ${monsterResponse.reactionDescription}`,
        type: "reaction",
      });
    }

    const actualDamageTaken = monsterResponse.damageTaken !== undefined ? monsterResponse.damageTaken : totalPlayerDamage;
    nextMonster.currentHp = Math.max(0, nextMonster.currentHp - actualDamageTaken);

    logs.push({
      turn: snapshot.turnNumber,
      sender: "player",
      message: `ผู้เล่นร่ายมนตร์ธาตุ ${action.element}: โจมตี ${action.hitCount} ฮิต รวม ${actualDamageTaken} ดาเมจ!`,
      details: reaction.description ? `${reaction.description} (ใช้มานา ${action.manaConsumed})` : `ใช้มานา ${action.manaConsumed}`,
      type: "damage",
    });

    if (monsterResponse.stateChangedTo) {
      nextMonster.currentStance = monsterResponse.stateChangedTo;
    }
  }

  // Phase 2: Monster Turn (if monster is still alive)
  if (nextMonster.currentHp > 0) {
    const monsterAction: MonsterActionResult = monster.turnActionScript(snapshot);
    const playerDamageTaken = Math.max(1, monsterAction.damage - nextPlayer.baseArmor);
    nextPlayer.currentHp = Math.max(0, nextPlayer.currentHp - playerDamageTaken);

    logs.push({
      turn: snapshot.turnNumber,
      sender: "monster",
      message: `${monster.name} ${monsterAction.description}: ทำความเสียหาย ${playerDamageTaken} ดาเมจ!`,
      type: "damage",
    });
  } else {
    logs.push({
      turn: snapshot.turnNumber,
      sender: "system",
      message: `มอนสเตอร์ ${monster.name} พ่ายแพ้แล้ว!`,
      type: "info",
    });
  }

  // Phase 3: Natural Mana Recovery
  nextPlayer.currentMana = Math.min(nextPlayer.maxMana, nextPlayer.currentMana + 10);

  return {
    updatedPlayer: nextPlayer,
    updatedMonster: nextMonster,
    combatLogs: logs,
  };
}
