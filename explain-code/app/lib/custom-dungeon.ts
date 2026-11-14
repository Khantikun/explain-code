import { TopicQuest } from "./curriculum";
import { DungeonQuestion } from "./dungeon/questions";
import { LearningLanguage } from "./language-tracks";

export interface CustomDungeonPayload {
  id: string;
  title: string;
  subtitle: string;
  language: LearningLanguage;
  code: string;
  summary: string;
  keyConcepts: string[];
  topic: TopicQuest;
  questions: DungeonQuestion[];
  provider: "ai-api" | "mock-generator";
  createdAt: string;
}

export const CUSTOM_DUNGEON_STORAGE_KEY = "explain_code_custom_dungeons_v1";
export const ACTIVE_CUSTOM_DUNGEON_KEY = "explain_code_active_custom_dungeon_v1";
const MAX_SAVED_CUSTOM_DUNGEONS = 20;

const SUPPORTED_LANGUAGES: ReadonlySet<LearningLanguage> = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "sql",
  "html",
]);

export function normalizeLearningLanguage(rawLang?: string | null): LearningLanguage {
  const lower = (rawLang || "").toLowerCase().trim();
  if (SUPPORTED_LANGUAGES.has(lower as LearningLanguage)) {
    return lower as LearningLanguage;
  }
  if (lower.includes("python") || lower === "py") return "python";
  if (lower.includes("typescript") || lower === "ts") return "typescript";
  if (lower.includes("java") && !lower.includes("javascript")) return "java";
  if (lower.includes("c++") || lower.includes("cpp") || lower === "c") return "cpp";
  if (lower.includes("sql")) return "sql";
  if (lower.includes("html") || lower.includes("css")) return "html";
  return "javascript";
}

export function loadCustomDungeons(): CustomDungeonPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_DUNGEON_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomDungeonPayload =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.code === "string" &&
            item.topic &&
            Array.isArray(item.questions)
        )
    );
  } catch {
    return [];
  }
}

export function saveCustomDungeon(dungeon: CustomDungeonPayload): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCustomDungeons().filter((d) => d.id !== dungeon.id);
    const next = [dungeon, ...existing].slice(0, MAX_SAVED_CUSTOM_DUNGEONS);
    window.localStorage.setItem(CUSTOM_DUNGEON_STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(ACTIVE_CUSTOM_DUNGEON_KEY, JSON.stringify(dungeon));
  } catch {
    // ignore storage quota errors
  }
}

export function getCustomDungeonById(id: string): CustomDungeonPayload | null {
  if (!id) return null;
  const list = loadCustomDungeons();
  const matched = list.find((d) => d.id === id);
  if (matched) return matched;

  const active = getActiveCustomDungeon();
  if (active && active.id === id) return active;
  return null;
}

export function getActiveCustomDungeon(): CustomDungeonPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_CUSTOM_DUNGEON_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.id === "string" &&
      parsed.topic &&
      Array.isArray(parsed.questions)
    ) {
      return parsed as CustomDungeonPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveCustomDungeon(dungeon: CustomDungeonPayload | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!dungeon) {
      window.localStorage.removeItem(ACTIVE_CUSTOM_DUNGEON_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_CUSTOM_DUNGEON_KEY, JSON.stringify(dungeon));
    }
  } catch {
    // ignore
  }
}

export function deleteCustomDungeon(id: string): CustomDungeonPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const next = loadCustomDungeons().filter((d) => d.id !== id);
    window.localStorage.setItem(CUSTOM_DUNGEON_STORAGE_KEY, JSON.stringify(next));
    const active = getActiveCustomDungeon();
    if (active && active.id === id) {
      window.localStorage.removeItem(ACTIVE_CUSTOM_DUNGEON_KEY);
    }
    return next;
  } catch {
    return [];
  }
}
