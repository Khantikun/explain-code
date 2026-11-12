import {
  executePlayerSpell,
  calculateElementalReaction,
  resolveCombatTurn,
} from "../app/lib/dungeon/tacticalEngine";
import {
  MONSTER_ADAPTIVE_SLIME,
  MONSTER_STONE_GOLEM,
  MONSTER_LOOP_BAT,
  getInitialPlayerCombatState,
} from "../app/lib/dungeon/tacticalMonsters";
import { BattleSnapshot } from "../app/lib/dungeon/tacticalTypes";

console.log("=== 1. Testing Elemental Reaction Table ===");
const meltReaction = calculateElementalReaction("Fire", "Ice");
console.log("Fire vs Ice:", meltReaction);
if (meltReaction.multiplier !== 1.75) throw new Error("Expected Melt multiplier 1.75");

const shockReaction = calculateElementalReaction("Lightning", "Water");
console.log("Lightning vs Water:", shockReaction);
if (shockReaction.multiplier !== 2.0) throw new Error("Expected Shock multiplier 2.0");

console.log("\n=== 2. Testing Adaptive Slime vs Fire (Steam Shield trigger) ===");
const player = getInitialPlayerCombatState();
const slime = { ...MONSTER_ADAPTIVE_SLIME };
const snapshotSlime: BattleSnapshot = {
  turnNumber: 1,
  player,
  targetEnemy: slime,
  allEnemies: [slime],
};

const fireSpell = `
function castSpell(battleState, enemy, player) {
  return {
    damage: 40,
    element: "Fire",
    hitCount: 1,
    armorPiercing: 0,
    isCritical: false
  };
}
`;
const fireResult = executePlayerSpell(fireSpell, snapshotSlime);
console.log("Fire Spell Sandbox Result:", fireResult);
const fireCombat = resolveCombatTurn(player, slime, fireResult, snapshotSlime);
console.log("Slime HP after Fire:", fireCombat.updatedMonster.currentHp);
console.log("Logs:", fireCombat.combatLogs.map((l) => l.message));
// Slime absorbs 75% of fire damage, so takes only 10 damage: 120 - 10 = 110
if (fireCombat.updatedMonster.currentHp !== 110) {
  throw new Error(`Expected Slime HP 110, got ${fireCombat.updatedMonster.currentHp}`);
}

console.log("\n=== 3. Testing Adaptive Slime vs Lightning (Counter-tactics) ===");
const lightningSpell = `
function castSpell(battleState, enemy, player) {
  return {
    damage: 40,
    element: "Lightning",
    hitCount: 1,
    armorPiercing: 0,
    isCritical: false
  };
}
`;
const lightningResult = executePlayerSpell(lightningSpell, snapshotSlime);
const lightningCombat = resolveCombatTurn(player, slime, lightningResult, snapshotSlime);
console.log("Slime HP after Lightning:", lightningCombat.updatedMonster.currentHp);
// Lightning deals 200% = 80 damage: 120 - 80 = 40
if (lightningCombat.updatedMonster.currentHp !== 40) {
  throw new Error(`Expected Slime HP 40, got ${lightningCombat.updatedMonster.currentHp}`);
}

console.log("\n=== 4. Testing Infinite Loop / System Overheat Protection ===");
const infiniteLoopSpell = `
function castSpell(battleState, enemy, player) {
  let count = 0;
  while (true) {
    count++;
  }
  return count;
}
`;
const loopResult = executePlayerSpell(infiniteLoopSpell, snapshotSlime);
console.log("Infinite Loop Result:", loopResult.errorType, loopResult.errorMessage);
const loopCombat = resolveCombatTurn(player, slime, loopResult, snapshotSlime);
console.log("Player HP after Overheat:", loopCombat.updatedPlayer.currentHp);
console.log("Player Overheat Cooldown:", loopCombat.updatedPlayer.overheatCooldown);
if (loopResult.errorType !== "InfiniteLoop" || loopCombat.updatedPlayer.overheatCooldown !== 1) {
  throw new Error("Infinite loop was not intercepted properly!");
}

console.log("\n=== 5. Testing Loop Hunter Bat vs Multi-hit vs Heavy Hit ===");
const bat = { ...MONSTER_LOOP_BAT };
const snapshotBat: BattleSnapshot = {
  turnNumber: 1,
  player,
  targetEnemy: bat,
  allEnemies: [bat],
};
const multiHitSpell = `
function castSpell(battleState, enemy, player) {
  return { damage: 20, element: "Physical", hitCount: 4 };
}
`;
const batMultiResult = executePlayerSpell(multiHitSpell, snapshotBat);
const batMultiCombat = resolveCombatTurn(player, bat, batMultiResult, snapshotBat);
console.log("Bat HP after Multi-hit (should be 160, evades and counters):", batMultiCombat.updatedMonster.currentHp);
console.log("Logs:", batMultiCombat.combatLogs.map((l) => l.message));
if (batMultiCombat.updatedMonster.currentHp !== 160) {
  throw new Error("Bat should evade multi-hit!");
}

console.log("\n=== ALL TACTICAL ENGINE VERIFICATION ASSERTIONS PASSED ===");
