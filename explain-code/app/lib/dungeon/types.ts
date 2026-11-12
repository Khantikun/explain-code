import { BlockCellId } from "../curriculum";

export type RoomType =
  | "combat"
  | "trap"
  | "shrine"
  | "forge"
  | "transfer"
  | "boss";

export type EncounterType =
  | "predict"
  | "trace"
  | "bug"
  | "why"
  | "modify"
  | "transfer";

export interface EncounterOption {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface EncounterSpec {
  id: string;
  title: string;
  subtitle: string;
  monsterName: string;
  monsterType: string;
  roomType: RoomType;
  interactionType: EncounterType;
  prompt: string;
  codeSnippet: string;
  activeLine?: number;
  variableTrace?: Record<string, string>;
  testSimulation?: string;
  options: EncounterOption[];
  hint: string;
  blockCell: BlockCellId;
  conceptId: string;
  damageOnFail: number;
  xpReward: number;
  learningPillar: "predict" | "explain" | "debug" | "transfer";
}

export interface DungeonRoom {
  id: string;
  floor: number;
  name: string;
  type: RoomType;
  monsterName: string;
  description: string;
  encounters: EncounterSpec[];
  nextRoomIds: string[];
  status: "locked" | "available" | "current" | "cleared";
}

export interface RelicItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
  focusCost: number;
  usesLeft: number;
}

export interface AnswerLog {
  encounterId: string;
  roomName: string;
  blockCell: BlockCellId;
  conceptId: string;
  learningPillar: "predict" | "explain" | "debug" | "transfer";
  isCorrect: boolean;
  tries: number;
  usedHint: boolean;
  xpEarned: number;
  timestamp: string;
}

export interface DungeonRunState {
  id: string;
  seedCode: string;
  spellName: string;
  targetGoal: string;
  integrity: number; // HP (0 - 100)
  maxIntegrity: number;
  focus: number; // MP (0 - 100)
  maxFocus: number;
  gold: number;
  currentRoomId: string | null;
  currentEncounterIndex: number;
  rooms: Record<string, DungeonRoom>;
  mapFloors: string[][]; // Array of room IDs per floor
  activeRelics: RelicItem[];
  answersLog: AnswerLog[];
  status: "ingesting" | "navigating" | "encounter" | "victory" | "defeated";
  conceptMastery: Record<string, { total: number; correct: number }>;
  cellScoresDelta: Partial<Record<BlockCellId, number>>;
}

export interface CodeSpellPreset {
  id: string;
  name: string;
  category: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ท้าทาย";
  description: string;
  code: string;
  primaryConcepts: string[];
}
