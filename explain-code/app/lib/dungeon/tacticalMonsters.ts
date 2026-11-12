import {
  BattleSnapshot,
  CodeRune,
  MonsterEntity,
  MonsterReactionResult,
  NPCQuestEvent,
  PlayerCombatState,
  SpellOutputAction,
  TacticalDungeonRoom,
} from "./tacticalTypes";

/**
 * Monster 1: Adaptive Slime (สไลม์ปรับสภาพ)
 */
export const MONSTER_ADAPTIVE_SLIME: MonsterEntity = {
  id: "mob-slime",
  name: "สไลม์ปรับสภาพ (Adaptive Slime)",
  tier: "minion",
  currentPhase: 1,
  element: "Water",
  currentHp: 120,
  maxHp: 120,
  currentMana: 50,
  maxMana: 50,
  baseArmor: 5,
  currentStance: "ร่างของเหลว (Liquid Form)",
  activeStatusEffects: [],
  elementalAffinity: {
    Physical: 1.0,
    Fire: 0.5,
    Water: 0.5,
    Ice: 1.2,
    Lightning: 2.0,
    Wind: 1.0,
    Earth: 1.0,
  },
  description: "สไลม์ที่สามารถเปลี่ยนสถานะเป็นไอเพื่อดูดซับไฟ แต่แพ้ทางสายฟ้าอย่างรุนแรง",
  lore: "สร้างขึ้นจากการทดลองตัวแปรเหลว มันคอยดักจับสคริปต์ที่ใช้ธาตุไฟตรงๆ",
  inspectableCode: `// สคริปต์พฤติกรรมของสไลม์
function onIncomingSpell(incoming) {
  if (incoming.element === "Fire") {
    // ถ้าเจอไฟ จะระเหยเป็นไอน้ำกำบัง ดาเมจลดลง 75%
    return {
      absorbed: true,
      damageMultiplier: 0.25,
      stance: "Steam Shield (ไอน้ำกำบัง)",
      note: "สไลม์ระเหยเป็นไอ ดูดซับไฟเกือบหมด!"
    };
  }
  if (incoming.element === "Lightning") {
    // แพ้สายฟ้าช็อตผ่านน้ำ ดาเมจ 200% ทะลุเกราะ
    return {
      absorbed: false,
      damageMultiplier: 2.0,
      note: "สายฟ้าช็อตผ่านน้ำเต็มๆ!"
    };
  }
  return { absorbed: false, damageMultiplier: 1.0 };
}`,
  behaviorScript: (incoming: SpellOutputAction): MonsterReactionResult => {
    if (incoming.element === "Fire") {
      const reduced = Math.max(1, Math.round(incoming.baseDamage * 0.25 * incoming.hitCount));
      return {
        damageTaken: reduced,
        absorbedOrReflected: true,
        reactionDescription: "สไลม์ระเหยเป็นไอน้ำกำบัง ดูดซับดาเมจไฟเหลือเพียง 25%!",
        stateChangedTo: "Steam Shield (ไอน้ำกำบัง)",
        elementalMultiplier: 0.25,
      };
    }
    if (incoming.element === "Lightning") {
      const amplified = Math.round(incoming.baseDamage * 2.0 * incoming.hitCount);
      return {
        damageTaken: amplified,
        absorbedOrReflected: false,
        reactionDescription: "สายฟ้าช็อตผ่านโมเลกุลน้ำ ทะลวงร่างสไลม์ ดาเมจ 200%!",
        elementalMultiplier: 2.0,
      };
    }
    const standard = incoming.baseDamage * incoming.hitCount;
    return {
      damageTaken: standard,
      absorbedOrReflected: false,
      reactionDescription: "สไลม์โดนโจมตีปกติ",
      elementalMultiplier: 1.0,
    };
  },
  turnActionScript: (): { intentType: "Attack"; targetId: string; damage: number; element: "Water"; description: string } => {
    return {
      intentType: "Attack",
      targetId: "player",
      damage: 18,
      element: "Water",
      description: "พ่นกระสุนกรดน้ำ (Acid Bubble Splash)",
    };
  },
};

/**
 * Monster 2: Stone Golem (โกเลมเกราะศิลา)
 */
export const MONSTER_STONE_GOLEM: MonsterEntity = {
  id: "mob-golem",
  name: "โกเลมเกราะศิลา (Stone Golem)",
  tier: "elite",
  currentPhase: 1,
  element: "Earth",
  currentHp: 200,
  maxHp: 200,
  currentMana: 40,
  maxMana: 40,
  baseArmor: 25,
  currentStance: "เกราะหินแกรนิต (Granite Stance)",
  activeStatusEffects: [],
  elementalAffinity: {
    Physical: 0.6,
    Fire: 1.0,
    Water: 1.2,
    Ice: 0.8,
    Lightning: 0.3,
    Wind: 1.5,
    Earth: 0.5,
  },
  description: "ยักษ์หินที่มีเกราะหนา 25 หน่วย การโจมตีธรรมดาจะเข้ายากมาก ต้องใช้เวทเจาะเกราะหรือลมกร่อนหิน",
  lore: "ผู้พิทักษ์หอสมุดโค้ดโบราณ ร่างกายแข็งแกร่งดั่งบล็อกข้อมูลที่ไม่มีวันแคลช",
  inspectableCode: `// สคริปต์พฤติกรรมของโกเลม
function onIncomingSpell(incoming) {
  if (incoming.armorPiercingPercent >= 30) {
    // ถ้ามีเจาะเกราะ จะทำลายจุดเปราะของหิน ดาเมจแรงขึ้น 150%
    return {
      damageMultiplier: 1.5,
      note: "กระเทาะรอยแยกหินสำเร็จ!"
    };
  }
  // ถ้าไม่มีเจาะเกราะ เกราะ 25 หน่วยจะบล็อกดาเมจเกือบหมด
  return {
    damageMultiplier: 1.0,
    note: "เกราะหินลดทอนความเสียหายมหาศาล"
  };
}`,
  behaviorScript: (incoming: SpellOutputAction): MonsterReactionResult => {
    if (incoming.armorPiercingPercent >= 30) {
      const dmg = Math.round(incoming.baseDamage * 1.5 * incoming.hitCount);
      return {
        damageTaken: dmg,
        absorbedOrReflected: false,
        reactionDescription: "เวทมนตร์เจาะเกราะกระเทาะผิวหินแตกกระจาย ดาเมจเพิ่มเป็น 150%!",
        elementalMultiplier: 1.5,
      };
    }
    const mitigated = Math.max(1, (incoming.baseDamage - 25) * incoming.hitCount);
    return {
      damageTaken: mitigated,
      absorbedOrReflected: true,
      reactionDescription: "เกราะศิลาหนา 25 หน่วย บล็อกพลังโจมตีไว้ได้ส่วนใหญ่!",
      elementalMultiplier: 1.0,
    };
  },
  turnActionScript: () => {
    return {
      intentType: "Attack" as const,
      targetId: "player",
      damage: 26,
      element: "Earth" as const,
      description: "ทุบกำปั้นหินยักษ์ลงพื้น (Seismic Crush)",
    };
  },
};

/**
 * Monster 3: Loop Hunter Bat (ค้างคาวตรวจจับลูป)
 */
export const MONSTER_LOOP_BAT: MonsterEntity = {
  id: "mob-bat",
  name: "ค้างคาวตรวจจับลูป (Loop Hunter Bat)",
  tier: "elite",
  currentPhase: 1,
  element: "Wind",
  currentHp: 160,
  maxHp: 160,
  currentMana: 80,
  maxMana: 80,
  baseArmor: 10,
  currentStance: "เรดาร์ตรวจจับลูป (Echo Stance)",
  activeStatusEffects: [],
  elementalAffinity: {
    Physical: 1.0,
    Fire: 1.3,
    Water: 1.0,
    Ice: 1.5,
    Lightning: 1.2,
    Wind: 0.5,
    Earth: 0.8,
  },
  description: "ค้างคาวที่จับคลื่นการวนลูป หากผู้เล่นยิงลูปเกิน 2 ฮิต มันจะหลบได้หมดและโต้กลับทันที",
  lore: "มอนสเตอร์ที่เกิดจาก Call Stack ล้น มันเกลียดการวนซ้ำพร่ำเพรื่อ",
  inspectableCode: `// สคริปต์พฤติกรรมของค้างคาว
function onIncomingSpell(incoming) {
  if (incoming.hitCount > 2) {
    // ตรวจพบลูปหลายฮิต -> บินหลบและเคาน์เตอร์ดาเมจ 20 สะท้อนกลับ
    return {
      absorbed: true,
      damageTaken: 0,
      counterDamage: 20,
      note: "จับคลื่นลูปได้ หลบพ้นและพุ่งสวนกลับทันที!"
    };
  }
  // ถ้าโจมตีแบบฮิตเดียวหมัดหนัก (hitCount <= 2) จะหลบไม่ทัน
  return {
    damageMultiplier: 1.4,
    note: "โดนหมัดหนักจังหวะเดียวเต็มๆ!"
  };
}`,
  behaviorScript: (incoming: SpellOutputAction): MonsterReactionResult => {
    if (incoming.hitCount > 2) {
      return {
        damageTaken: 0,
        absorbedOrReflected: true,
        reactionDescription: "ค้างคาวจับคลื่นลูปได้ บินหลบพริ้วไหว ดาเมจเป็น 0 และโต้กลับ 20 ดาเมจ!",
        counterAttackDamage: 20,
        elementalMultiplier: 0,
      };
    }
    const singleHitDmg = Math.round(incoming.baseDamage * 1.4 * incoming.hitCount);
    return {
      damageTaken: singleHitDmg,
      absorbedOrReflected: false,
      reactionDescription: "การโจมตีจังหวะเดียวกระแทกค้างคาวร่วงลงพื้น ดาเมจ 140%!",
      elementalMultiplier: 1.4,
    };
  },
  turnActionScript: () => {
    return {
      intentType: "Attack" as const,
      targetId: "player",
      damage: 22,
      element: "Wind" as const,
      description: "กระพือคลื่นเสียงสะท้อน (Supersonic Screech)",
    };
  },
};

/**
 * Boss: The Core (โกเลมแกนกลางโบราณ)
 */
export const MONSTER_THE_CORE: MonsterEntity = {
  id: "boss-the-core",
  name: "เดอะ คอร์: โกเลมแกนกลางโบราณ (The Core)",
  tier: "boss",
  currentPhase: 1,
  element: "Fire",
  currentHp: 320,
  maxHp: 320,
  currentMana: 120,
  maxMana: 120,
  baseArmor: 18,
  currentStance: "แกนกลางคอมไพเลอร์ (Interpreter Core)",
  activeStatusEffects: [],
  elementalAffinity: {
    Physical: 1.0,
    Fire: 0.5,
    Water: 1.75,
    Ice: 0.7,
    Lightning: 1.2,
    Wind: 1.0,
    Earth: 1.0,
  },
  description: "บอสใหญ่แกนกลางดันเจี้ยน ปรับเปลี่ยนตรรกะการดูดซับธาตุและการโจมตีตามพลังที่ถูกส่งเข้ามา",
  lore: "แกนประมวลผลโบราณที่รวบรวมตรรกะทั้งหมดไว้ หากผู้เล่นไม่ดักทาง มันจะปรับโค้ดเพื่อบดขยี้ผู้เล่น",
  inspectableCode: `// สคริปต์ของ The Core
function onIncomingSpell(incoming, coreState) {
  // เฟส 1: สลับธาตุตามสิ่งที่โดน
  if (incoming.element === "Water") {
    return { damageMultiplier: 1.75, note: "โดนน้ำดับแกนไฟอย่างรุนแรง!" };
  }
  if (incoming.isCritical) {
    return { damageMultiplier: 1.4, note: "คริติคอลทะลุแกนพลังงาน!" };
  }
  return { damageMultiplier: 1.0 };
}`,
  behaviorScript: (incoming: SpellOutputAction): MonsterReactionResult => {
    if (incoming.element === "Water") {
      const dmg = Math.round(incoming.baseDamage * 1.75 * incoming.hitCount);
      return {
        damageTaken: dmg,
        absorbedOrReflected: false,
        reactionDescription: "เวทมนตร์ธาตุน้ำดับแกนไฟของ The Core ดาเมจมหาศาล 175%!",
        elementalMultiplier: 1.75,
      };
    }
    if (incoming.isCritical) {
      const critDmg = Math.round(incoming.baseDamage * 1.4 * incoming.hitCount);
      return {
        damageTaken: critDmg,
        absorbedOrReflected: false,
        reactionDescription: "การโจมตีคริติคอลทะลวงแกนประมวลผลกลางสำเร็จ!",
        elementalMultiplier: 1.4,
      };
    }
    const standard = incoming.baseDamage * incoming.hitCount;
    return {
      damageTaken: standard,
      absorbedOrReflected: false,
      reactionDescription: "The Core รับดาเมจตามปกติ",
      elementalMultiplier: 1.0,
    };
  },
  turnActionScript: (snapshot: BattleSnapshot) => {
    const isEnraged = snapshot.targetEnemy.currentHp < 100;
    return {
      intentType: "Attack" as const,
      targetId: "player",
      damage: isEnraged ? 35 : 24,
      element: "Fire" as const,
      description: isEnraged ? "ระเบิดแกนความร้อนคลั่ง (Overclock Meltdown)" : "ยิงลำแสงตรวจจับไวยากรณ์ (Compiler Beam)",
    };
  },
};

/**
 * NPC Quest Events
 */
export const NPC_REFACTOR_FORGE: NPCQuestEvent = {
  id: "npc-forge",
  npcName: "ช่างตีเหล็กรีแฟกเตอร์ (Kael Ironweaver)",
  npcTitle: "ผู้สรรค์สร้างอักขระโค้ด",
  dialog: "มนตร์ของเจ้าขาดความแหลมคม หากเจ้าแก้โค้ดให้มีเงื่อนไขตรวจสอบเกราะ หรือมีคำสั่งเจาะเกราะ ข้าจะมอบรูนไฟบรรลัยกัลป์ให้เจ้า!",
  codeRequirementDescription: "ในโค้ดต้องมีการใช้ตัวแปร armor หรือมีการระบุ armorPiercing มากกว่า 0",
  checkCodePasses: (code: string) => /armor|armorPiercing/i.test(code),
  rewardRune: {
    id: "rune-scorching-pierce",
    name: "รูนอัคคีเจาะเกราะ (Scorching Pierce)",
    category: "Trigger",
    rarity: "Rare",
    description: "เปลี่ยนธาตุของเวทเป็น Fire และมอบพลังเจาะเกราะ 40% อัตโนมัติ",
    placementSlot: "accumulator",
    injectedSnippet: `spell.element = "Fire";\nspell.armorPiercing = 40;`,
    manaCostDelta: 5,
    riskDescription: "กินมานาเพิ่มขึ้น 5 หน่วย",
    rewardDescription: "ดาเมจไฟแรงขึ้นและทะลวงเกราะหิน 40%",
  },
  rewardDescription: "ได้รับรูนอัคคีเจาะเกราะ (Scorching Pierce Rune)!",
};

export const NPC_ALCHEMIST: NPCQuestEvent = {
  id: "npc-alchemist",
  npcName: "นักเล่นแร่แปรธาตุ (Vespera the Alchemist)",
  npcTitle: "ผู้เชี่ยวชาญการดักจับค่าว่าง",
  dialog: "เจ้าประมาทเกินไป! หากศัตรูไม่ส่งข้อมูลมา โค้ดเจ้าจะพังทันที จงใส่ Guard Clause ตรวจสอบค่าก่อนเริ่มร่าย แล้วข้าจะมอบรูนดูดเลือดฉุกเฉินให้!",
  codeRequirementDescription: "ต้องมี Guard Clause เช่น `if (!enemy) return 0;` หรือตรวจเลือด",
  checkCodePasses: (code: string) => /if\s*\(!|player\.hp|enemy/i.test(code),
  rewardRune: {
    id: "rune-desperation-leech",
    name: "รูนดูดเลือดฉุกเฉิน (Desperation Leech)",
    category: "Conditional",
    rarity: "Epic",
    description: "เมื่อเลือดผู้เล่นต่ำกว่า 35% ดาเมจทั้งหมดจะเปลี่ยนเป็นการฟื้นฟูเลือดให้ตนเอง",
    placementSlot: "guard",
    injectedSnippet: `if (player && player.currentHp < 35) {\n  spell.isCritical = true;\n  spell.sideEffects.push("เปิดใช้งานดูดเลือดฉุกเฉิน");\n}`,
    manaCostDelta: 0,
    riskDescription: "ทำงานเฉพาะเมื่ออยู่ในภาวะวิกฤตเท่านั้น",
    rewardDescription: "ช่วยให้รอดชีวิตในจังหวะฉุกเฉินได้",
  },
  rewardDescription: "ได้รับรูนดูดเลือดฉุกเฉิน (Desperation Leech Rune)!",
};

/**
 * Initial Player Combat State
 */
export function getInitialPlayerCombatState(): PlayerCombatState {
  return {
    id: "player",
    name: "จอมเวทผู้ฝึกหัด (Code Mage)",
    currentHp: 100,
    maxHp: 100,
    currentMana: 100,
    maxMana: 100,
    baseArmor: 5,
    programIntegrity: 100,
    focusMana: 100,
    activeStatusEffects: [],
    overheatCooldown: 0,
    activeRunes: [],
  };
}

/**
 * Procedural Tactical Dungeon Generator (v2.0)
 */
export function generateTacticalDungeon(): Record<string, TacticalDungeonRoom> {
  const room0: TacticalDungeonRoom = {
    id: "room-0",
    floor: 0,
    name: "ห้องโถงที่ 1: สระของเหลวปรับตัว",
    roomType: "combat",
    monster: { ...MONSTER_ADAPTIVE_SLIME },
    status: "available",
    nextRoomIds: ["room-1-forge", "room-1-golem"],
  };

  const room1Forge: TacticalDungeonRoom = {
    id: "room-1-forge",
    floor: 1,
    name: "ห้องโถงที่ 2A: เตาหลอมช่างตีเหล็ก",
    roomType: "npc",
    npcEvent: NPC_REFACTOR_FORGE,
    status: "locked",
    nextRoomIds: ["room-2-bat"],
  };

  const room1Golem: TacticalDungeonRoom = {
    id: "room-1-golem",
    floor: 1,
    name: "ห้องโถงที่ 2B: ลานประลองศิลา",
    roomType: "combat",
    monster: { ...MONSTER_STONE_GOLEM },
    status: "locked",
    nextRoomIds: ["room-2-bat"],
  };

  const room2Bat: TacticalDungeonRoom = {
    id: "room-2-bat",
    floor: 2,
    name: "ห้องโถงที่ 3: หุบเหวค้างคาวจับลูป",
    roomType: "combat",
    monster: { ...MONSTER_LOOP_BAT },
    status: "locked",
    nextRoomIds: ["room-3-alchemist"],
  };

  const room3Alchemist: TacticalDungeonRoom = {
    id: "room-3-alchemist",
    floor: 3,
    name: "ห้องโถงที่ 4: ห้องทดลองปรุงยาของเวสเปร่า",
    roomType: "npc",
    npcEvent: NPC_ALCHEMIST,
    status: "locked",
    nextRoomIds: ["room-4-boss"],
  };

  const room4Boss: TacticalDungeonRoom = {
    id: "room-4-boss",
    floor: 4,
    name: "ห้องโถงสุดท้าย: แกนกลางแห่งการประมวลผล (The Core)",
    roomType: "boss",
    monster: { ...MONSTER_THE_CORE },
    status: "locked",
    nextRoomIds: [],
  };

  return {
    [room0.id]: room0,
    [room1Forge.id]: room1Forge,
    [room1Golem.id]: room1Golem,
    [room2Bat.id]: room2Bat,
    [room3Alchemist.id]: room3Alchemist,
    [room4Boss.id]: room4Boss,
  };
}
