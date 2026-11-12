import { generateDungeonPlan, CODE_SPELL_PRESETS } from "../app/lib/dungeon/dungeonPlanner";

console.log("=== Testing Dungeon Plan Generation (v1.0) ===");

// 1. sumPositive
const planSum = generateDungeonPlan(CODE_SPELL_PRESETS[0].code, CODE_SPELL_PRESETS[0].name);
console.log("Spell 1 (sumPositive) Room 0 prompt:", planSum.rooms["room-f0-predict"].encounters[0].prompt);
if (!planSum.rooms["room-f0-predict"] || planSum.rooms["room-f0-predict"].encounters.length === 0) {
  throw new Error("sumPositive room 0 missing encounters!");
}

// Check 5 floors and key rooms
const expectedRooms = [
  "room-f0-predict",
  "room-f1-trace",
  "room-f1-shrine",
  "room-f2-trap",
  "room-f2-transfer",
  "room-f3-forge",
  "room-f4-boss",
];

for (const roomId of expectedRooms) {
  if (!planSum.rooms[roomId]) {
    throw new Error(`Missing expected room in plan: ${roomId}`);
  }
}

console.log("Room count verified:", Object.keys(planSum.rooms).length);
console.log("Starting room:", planSum.currentRoomId);
console.log("Active relics count:", planSum.activeRelics.length);

if (planSum.integrity !== 100 || planSum.focus !== 100) {
  throw new Error("Initial player stats mismatch!");
}

console.log("\n=== ALL V1.0 DUNGEON FLOW ASSERTIONS PASSED ===");
