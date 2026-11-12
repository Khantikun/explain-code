export type ElementType =
  | "Physical"
  | "Fire"
  | "Water"
  | "Ice"
  | "Lightning"
  | "Wind"
  | "Earth";

export type StatusEffectType =
  | "Burn"
  | "Freeze"
  | "Shock"
  | "SteamCover"
  | "Overheat"
  | "Empowered";

export interface StatusEffect {
  type: StatusEffectType;
  durationTurns: number;
  potency: number;
  source: "player" | "monster" | "environment";
}

export type ActionIntentType = "Attack" | "Shield" | "Debuff" | "Counter" | "Heal";

export interface CombatEntity {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  baseArmor: number;
  activeStatusEffects: StatusEffect[];
}

export interface PlayerCombatState extends CombatEntity {
  programIntegrity: number; // 0 - 100
  focusMana: number;        // 0 - 100
  activeRunes: CodeRune[];
  overheatCooldown: number; // > 0 means stunned
}

export interface MonsterReactionResult {
  damageTaken: number;
  absorbedOrReflected: boolean;
  reactionDescription: string;
  stateChangedTo?: string;
  counterAttackDamage?: number;
  statusApplied?: StatusEffectType;
  elementalMultiplier: number;
}

export interface MonsterActionResult {
  intentType: ActionIntentType;
  targetId: string;
  damage: number;
  element: ElementType;
  description: string;
  statusApplied?: StatusEffectType;
}

export interface MonsterEntity extends CombatEntity {
  tier: "minion" | "elite" | "boss";
  currentPhase: number;
  element: ElementType;
  currentStance: string;
  elementalAffinity: Record<ElementType, number>;
  inspectableCode: string;
  description: string;
  lore: string;
  behaviorScript: (
    incoming: SpellOutputAction,
    battleState: BattleSnapshot
  ) => MonsterReactionResult;
  turnActionScript: (battleState: BattleSnapshot) => MonsterActionResult;
}

export interface BattleSnapshot {
  turnNumber: number;
  player: Readonly<PlayerCombatState>;
  targetEnemy: Readonly<MonsterEntity>;
  allEnemies: Readonly<MonsterEntity[]>;
  environmentalModifier?: EnvironmentalHazard;
}

export interface SpellOutputAction {
  actionType: "Attack" | "Shield" | "Heal" | "Special";
  baseDamage: number;
  element: ElementType;
  hitCount: number;
  isCritical: boolean;
  armorPiercingPercent: number;
  targetMode: "Single" | "AllEnemies";
  appliedStatus?: StatusEffectType;
  manaConsumed: number;
  sideEffects: string[];
}

export interface SpellExecutionResult {
  success: boolean;
  action: SpellOutputAction | null;
  errorType?: "InfiniteLoop" | "SyntaxError" | "RuntimeNaN" | "OutOfMana";
  errorMessage?: string;
  executionTimeMs: number;
  iterationsCount: number;
  ramTraceLog: Record<string, unknown>[];
}

export type RuneSlot = "guard" | "loop_body" | "accumulator" | "return";

export interface CodeRune {
  id: string;
  name: string;
  category: "RiskReward" | "Trigger" | "Optimization" | "Conditional";
  rarity: "Common" | "Rare" | "Epic";
  description: string;
  placementSlot: RuneSlot;
  injectedSnippet: string;
  manaCostDelta: number;
  riskDescription: string;
  rewardDescription: string;
}

export interface EnvironmentalHazard {
  id: string;
  name: string;
  ruleDescription: string;
  checkOnLoop?: (iterationCount: number) => { isTriggered: boolean; effectDescription: string; damage: number };
}

export interface TacticalDungeonRoom {
  id: string;
  floor: number;
  name: string;
  roomType: "combat" | "npc" | "hazard" | "boss";
  monster?: MonsterEntity;
  npcEvent?: NPCQuestEvent;
  hazard?: EnvironmentalHazard;
  status: "locked" | "available" | "current" | "cleared";
  nextRoomIds: string[];
}

export interface NPCQuestEvent {
  id: string;
  npcName: string;
  npcTitle: string;
  dialog: string;
  codeRequirementDescription: string;
  checkCodePasses: (code: string) => boolean;
  rewardRune: CodeRune;
  rewardDescription: string;
}

export interface TacticalRunState {
  id: string;
  floor: number;
  currentRoomId: string | null;
  rooms: Record<string, TacticalDungeonRoom>;
  mapFloors: string[][];
  player: PlayerCombatState;
  equippedRunes: CodeRune[];
  activeSpellCode: string;
  spellName: string;
  turnNumber: number;
  battleLog: {
    turn: number;
    sender: "player" | "monster" | "system";
    message: string;
    details?: string;
    type: "info" | "damage" | "heal" | "reaction" | "error";
  }[];
  status: "map" | "battle" | "npc_event" | "victory" | "defeated";
}
