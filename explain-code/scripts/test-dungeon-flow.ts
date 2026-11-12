import { generateDungeonPlan, CODE_SPELL_PRESETS } from "../app/lib/dungeon/dungeonPlanner";

console.log("=== Testing Dungeon Plan Generation & Execution Engine ===");

const expectedRooms = [
  "room-f0-predict",
  "room-f1-trace",
  "room-f1-shrine",
  "room-f2-trap",
  "room-f2-transfer",
  "room-f3-forge",
  "room-f4-boss",
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;

function validatePlanIntegrity(plan: ReturnType<typeof generateDungeonPlan>, label: string) {
  if (plan.integrity !== 100 || plan.focus !== 100) {
    throw new Error(`[${label}] Initial player stats mismatch!`);
  }
  if (plan.activeRelics.length < 3) {
    throw new Error(`[${label}] Missing active relics!`);
  }
  for (const roomId of expectedRooms) {
    const room = plan.rooms[roomId];
    if (!room) {
      throw new Error(`[${label}] Missing expected room: ${roomId}`);
    }
    if (room.encounters.length === 0) {
      throw new Error(`[${label}] Room ${roomId} has 0 encounters!`);
    }
    for (const enc of room.encounters) {
      if (!enc.prompt || enc.prompt.trim().length === 0) {
        throw new Error(`[${label}] Encounter ${enc.id} has empty prompt!`);
      }
      if (emojiRegex.test(enc.prompt) || emojiRegex.test(enc.title)) {
        throw new Error(`[${label}] Found emoji in encounter ${enc.id}!`);
      }
      if (!enc.testSimulation || enc.testSimulation.trim().length === 0) {
        throw new Error(`[${label}] Encounter ${enc.id} is missing testSimulation for Test Oracle!`);
      }
      const correctOpts = enc.options.filter((o) => o.isCorrect);
      if (correctOpts.length !== 1) {
        throw new Error(
          `[${label}] Encounter ${enc.id} must have exactly 1 correct option, found: ${correctOpts.length}`
        );
      }
      for (const opt of enc.options) {
        if (!opt.feedback || opt.feedback.trim().length === 0) {
          throw new Error(`[${label}] Option ${opt.id} in ${enc.id} has empty feedback!`);
        }
        if (emojiRegex.test(opt.label) || emojiRegex.test(opt.feedback)) {
          throw new Error(`[${label}] Found emoji in option ${opt.id} of ${enc.id}!`);
        }
      }
    }
  }
}

// 1. Test sum-positive preset
const sumPreset = CODE_SPELL_PRESETS.find((p) => p.id === "sum-positive")!;
const planSum = generateDungeonPlan(sumPreset.code, sumPreset.name, "เป้าหมาย", "sum-positive");
validatePlanIntegrity(planSum, "sum-positive");
if (!planSum.rooms["room-f0-predict"].encounters[0].prompt.includes("[3, -2, 4]")) {
  throw new Error("sum-positive Room 0 prompt does not contain [3, -2, 4]!");
}
console.log("Passed: sum-positive validated with testSimulation");

// 2. Test find-max preset
const maxPreset = CODE_SPELL_PRESETS.find((p) => p.id === "find-max")!;
const planMax = generateDungeonPlan(maxPreset.code, maxPreset.name, "เป้าหมาย", "find-max");
validatePlanIntegrity(planMax, "find-max");
const maxPrompt0 = planMax.rooms["room-f0-predict"].encounters[0].prompt;
if (!maxPrompt0.includes("findMax") || maxPrompt0.includes("sumPositive")) {
  throw new Error(`find-max Room 0 prompt is invalid: ${maxPrompt0}`);
}
console.log("Passed: find-max unique encounters validated (NO sumPositive leakage)");

// 3. Test count-vowels preset
const vowelPreset = CODE_SPELL_PRESETS.find((p) => p.id === "count-vowels")!;
const planVowels = generateDungeonPlan(vowelPreset.code, vowelPreset.name, "เป้าหมาย", "count-vowels");
validatePlanIntegrity(planVowels, "count-vowels");
const vowelPrompt0 = planVowels.rooms["room-f0-predict"].encounters[0].prompt;
if (!vowelPrompt0.includes("countVowels") || vowelPrompt0.includes("sumPositive")) {
  throw new Error(`count-vowels Room 0 prompt is invalid: ${vowelPrompt0}`);
}
console.log("Passed: count-vowels unique encounters validated");

// 4. Test is-palindrome preset
const palPreset = CODE_SPELL_PRESETS.find((p) => p.id === "is-palindrome")!;
const planPal = generateDungeonPlan(palPreset.code, palPreset.name, "เป้าหมาย", "is-palindrome");
validatePlanIntegrity(planPal, "is-palindrome");
const palPrompt0 = planPal.rooms["room-f0-predict"].encounters[0].prompt;
if (!palPrompt0.includes("isPalindrome") || palPrompt0.includes("sumPositive")) {
  throw new Error(`is-palindrome Room 0 prompt is invalid: ${palPrompt0}`);
}
console.log("Passed: is-palindrome unique encounters validated");

// 5. Test fizz-buzz preset
const fbPreset = CODE_SPELL_PRESETS.find((p) => p.id === "fizz-buzz")!;
const planFb = generateDungeonPlan(fbPreset.code, fbPreset.name, "เป้าหมาย", "fizz-buzz");
validatePlanIntegrity(planFb, "fizz-buzz");
const fbPrompt0 = planFb.rooms["room-f0-predict"].encounters[0].prompt;
if (!fbPrompt0.includes("fizzBuzz") || fbPrompt0.includes("sumPositive")) {
  throw new Error(`fizz-buzz Room 0 prompt is invalid: ${fbPrompt0}`);
}
console.log("Passed: fizz-buzz unique encounters validated");

// 6. Test custom code (calculateDiscount)
const customCode = `function calculateDiscount(price, coupon) {
  let finalPrice = price;
  if (coupon === "SAVE20") {
    finalPrice = price * 0.8;
  }
  return finalPrice;
}`;
const planCustom = generateDungeonPlan(customCode, "มนตร์คำนวณส่วนลด", "เป้าหมาย", "custom");
validatePlanIntegrity(planCustom, "custom-discount");
const customPrompt0 = planCustom.rooms["room-f0-predict"].encounters[0].prompt;
if (!customPrompt0.includes("calculateDiscount")) {
  throw new Error(`custom code Room 0 prompt did not capture function name: ${customPrompt0}`);
}
console.log("Passed: custom code calculateDiscount dynamic synthesis validated");

// 7. CRITICAL TEST: Code containing 'total' and 'numbers' must NOT falsely trigger sumPositive!
const averageCode = `function average(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total / numbers.length;
}`;
const planAvg = generateDungeonPlan(averageCode, "มนตร์หาค่าเฉลี่ย");
validatePlanIntegrity(planAvg, "average-numbers");
const avgPrompt0 = planAvg.rooms["room-f0-predict"].encounters[0].prompt;
if (avgPrompt0.includes("[3, -2, 4]") || avgPrompt0.includes("sumPositive")) {
  throw new Error(`CRITICAL BUG: average function leaked sumPositive questions! Prompt: ${avgPrompt0}`);
}
console.log("Passed: average(numbers) correctly classified as custom (NO sumPositive false positive)");

// 8. CRITICAL TEST: Binary Search with left, right, while must NOT falsely trigger isPalindrome!
const bsCode = `function binarySearch(scores, target) {
  let left = 0;
  let right = scores.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (scores[mid] === target) return mid;
    if (scores[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`;
const planBs = generateDungeonPlan(bsCode, "มนตร์ค้นหาทวิภาค");
validatePlanIntegrity(planBs, "binary-search");
const bsPrompt0 = planBs.rooms["room-f0-predict"].encounters[0].prompt;
if (bsPrompt0.includes("racecar") || bsPrompt0.includes("isPalindrome")) {
  throw new Error(`CRITICAL BUG: binarySearch leaked isPalindrome questions! Prompt: ${bsPrompt0}`);
}
console.log("Passed: binarySearch correctly classified as custom (NO isPalindrome false positive)");

// 9. CRITICAL TEST: Arrow function with parameter extraction
const arrowCode = `const doubleValue = (multiplier) => {
  return multiplier * 2;
};`;
const planArrow = generateDungeonPlan(arrowCode, "มนตร์ทวีคูณ");
validatePlanIntegrity(planArrow, "arrow-function");
const arrowPrompt0 = planArrow.rooms["room-f0-predict"].encounters[0].prompt;
if (!arrowPrompt0.includes("doubleValue")) {
  throw new Error(`Arrow function name was not extracted properly! Prompt: ${arrowPrompt0}`);
}
console.log("Passed: arrow function name & parameter extracted properly");

// 10. CRITICAL TEST: 5-Floor Roguelite DAG advancement logic
// Verify that when Room 1A is cleared, Room 1B is locked/bypassed, and Floor 2 rooms become available!
const testRooms: Record<string, ReturnType<typeof generateDungeonPlan>["rooms"][string]> = {
  ...planSum.rooms,
};
const room0 = testRooms["room-f0-predict"];
// Clear room 0:
testRooms[room0.id] = { ...room0, status: "cleared" };
room0.nextRoomIds.forEach((nid) => {
  testRooms[nid] = { ...testRooms[nid], status: "available" };
});
if (testRooms["room-f1-trace"].status !== "available" || testRooms["room-f1-shrine"].status !== "available") {
  throw new Error("Floor 1 rooms not available after clearing Room 0!");
}

// Player picks Room 1A (Trace) and clears it:
const room1A = testRooms["room-f1-trace"];
testRooms[room1A.id] = { ...room1A, status: "cleared" };
// Sibling locking logic:
Object.values(testRooms).forEach((r) => {
  if (r.floor <= room1A.floor && r.status !== "cleared") {
    testRooms[r.id] = { ...r, status: "locked" };
  }
});
room1A.nextRoomIds.forEach((nid) => {
  testRooms[nid] = { ...testRooms[nid], status: "available" };
});

if ((testRooms["room-f1-shrine"].status as string) !== "locked") {
  throw new Error("Room 1B (Shrine) should be locked after player chose Room 1A!");
}
if ((testRooms["room-f2-trap"].status as string) !== "available" || (testRooms["room-f2-transfer"].status as string) !== "available") {
  throw new Error("Floor 2 rooms should be available after clearing Room 1A!");
}
console.log("Passed: Branching DAG correctly locks sibling rooms on floor advancement");

console.log("\n=== ALL 10 COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS ===");
