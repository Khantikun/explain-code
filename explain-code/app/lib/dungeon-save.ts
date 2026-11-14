import { StudentRecord } from "./curriculum";
import { LearningLanguage } from "./language-tracks";

export const STORAGE_DUNGEON_SAVES_KEY = "explain_code_dungeon_saves_v1";

export interface DungeonSaveRecord {
  userId: string;
  language: LearningLanguage;
  currentTopicId: number;
  currentTopicTitle: string;
  currentFloorNumber: number;
  totalFloors: number;
  completedTopicIds: number[];
  xp: number;
  savedAt: string;
  history: StudentRecord["history"];
}

function readAllDungeonSaves(): Record<string, DungeonSaveRecord[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_DUNGEON_SAVES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadUserDungeonSaves(userId: string): DungeonSaveRecord[] {
  if (!userId || typeof window === "undefined") return [];
  const all = readAllDungeonSaves();
  const list = all[userId];
  return Array.isArray(list) ? list : [];
}

export function saveUserDungeonProgress(
  userId: string,
  record: DungeonSaveRecord
): DungeonSaveRecord[] {
  if (!userId || typeof window === "undefined") return [];
  const all = readAllDungeonSaves();
  const existing = Array.isArray(all[userId]) ? all[userId] : [];
  const filtered = existing.filter((item) => item.language !== record.language);
  const nextList = [record, ...filtered];
  all[userId] = nextList;
  try {
    localStorage.setItem(STORAGE_DUNGEON_SAVES_KEY, JSON.stringify(all));
  } catch {
    // ignore storage errors
  }
  return nextList;
}
