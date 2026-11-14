# สถาปัตยกรรมระบบมอนสเตอร์และระบบดวลตรรกะ (MONSTER AI & SCRIPT DUELING SPECIFICATION)
# รหัสเอกสาร: MODULE-02-MONSTER-AI-SCRIPT-DUELING
# สถานะ: Production Ready Architecture Specification

---

## 1. ปรัชญา Monster Behavior Script (Monster AI Philosophy)

### 1.1 บทบาทของศัตรูในเกม Code Depths
ในเกม Tactical Code-Battler แบบดั้งเดิมหรือเกมแนวเขียนโค้ดทั่วไป ศัตรูมักถูกออกแบบให้เป็นเพียง "กระสอบทรายแสดงผลลัพธ์" (Passive Stat Dump) ที่รอรับความเสียหายเมื่อผู้เล่นเขียนโค้ดแก้ปริศนาได้ถูกต้อง แต่ใน **Code Depths** มอนสเตอร์และศัตรูทุกตัวคือ **Autonomous Script Entity** ที่มีระบบขับเคลื่อนพฤติกรรม (Decision Engine) เป็นของตัวเอง

เป้าหมายการออกแบบเชิงปรัชญา:
1. **ศัตรูคือคู่คิดและคู่ต่อสู้ทางอัลกอริทึม (Algorithmic Adversary):** มอนสเตอร์มีชุดกฎ โครงสร้างข้อมูล และฟังก์ชันตอบสนอง (Reactive Triggers) ที่ประเมินบริบทของสนามรบ ไม่ว่าจะเป็นค่าสถานะของผู้เล่น การจัดเตรียมสเปลล์ หรือประวัติการรันคำสั่งในเทิร์นก่อนหน้า
2. **ความโปร่งใสที่ตรวจสอบได้ (Deterministic Transparency):** มอนสเตอร์ไม่ใช้ระบบการสุ่มแบบมืดบอด (Hidden RNG) ที่ผู้เล่นไม่เข้าใจ ความยากของเกมไม่ได้มาจากการโกงสเตตัสแบบไม่ยุติธรรม แต่มาจากความฉลาดในการวางเงื่อนไข (Condition Branching) ซึ่งผู้เล่นสามารถอ่าน ทำความเข้าใจ และคิดค้นอัลกอริทึมที่เหนือกว่าเพื่อแก้ทาง
3. **การประเมินสองมิติ (Dual-Vector Evaluation):**
   - **Proactive Scripting:** การกระทำเชิงรุกที่มอนสเตอร์เตรียมใช้ตามลำดับเทิร์นหรือทรัพยากรของตนเอง
   - **Reactive Scripting:** การตอบสนองแบบขัดจังหวะ (Interrupt & Event Hooks) เช่น เมื่อตรวจพบว่าผู้เล่นกำลังร่ายเวทธาตุไฟ หรือเมื่อเกราะแตก

### 1.2 วงจรการทำงานของ Monster Execution Loop
ในแต่ละรอบการต่อสู้ วงจรการตัดสินใจของมอนสเตอร์จะดำเนินผ่านไปป์ไลน์ดังต่อไปนี้:

```
[Start of Round]
       |
       v
[Environment & State Assessment] ---> ตรวจสอบ HP, Mana, Buff/Debuff, Field Element
       |
       v
[Inspect Player Intent / Hook Pre-warm] ---> ประเมิน Action ที่คาดการณ์ของผู้เล่น
       |
       v
[Evaluate Behavior Rules / Decision Tree] ---> รัน Condition Tree ตามลำดับ Priority
       |
       v
[Lock Intent Buffer] ---> แสดงสัญลักษณ์/โค้ดพฤติกรรมที่เตรียมรันให้ผู้เล่นเห็น
       |
       v
[Player Phase: Script Compilation & Execution]
       |
       v
[Resolution & Interruption Hooks] ---> รัน Reactive Trigger เมื่อเกิด Event ที่กำหนด
       |
       v
[Post-Turn State Adjustment] ---> อัปเดต Cooldown, Resource Decay, Phase Transition Check
```

---

## 2. ระบบตรวจสอบสคริปต์ศัตรู (Inspect Enemy Script / Code X-Ray)

### 2.1 กลไกการทำงานของ Code X-Ray
Code X-Ray คือฟังก์ชันหลักในหน้าจอต่อสู้ (Combat HUD) ที่แปลงสคริปต์เบื้องหลังของมอนสเตอร์ให้กลายเป็นโครงสร้างโค้ดแบบกึ่ง Abstract Syntax Tree (AST Pseudo-code) ที่ผู้เล่นสามารถเปิดอ่านได้ตลอดเวลาในระหว่างเทิร์นวางแผน (Planning Phase)

ระบบไม่ได้แสดงโค้ดดิบแบบ Machine Code แต่จะแสดงในรูปแบบภาษาสคริปต์ระดับสูง (DepthScript / Structured Logic Blocks) พร้อมการเน้นสีไวยากรณ์ (Syntax Highlighting) และสถานะประเมินผลลัพธ์ล่วงหน้า (Live Expression Evaluation)

### 2.2 ระดับการสแกนโค้ด (Inspection Tiers)
ผู้เล่นสามารถพัฒนาทักษะหรือใช้อุปกรณ์ในการปลดล็อกระดับการสแกน:
1. **Tier 1 (Surface Scan):** มองเห็น Action Intent ถัดไป (เช่น โจมตี 20 ดาเมจธาตุไฟ, เตรียมกางเกราะ)
2. **Tier 2 (Logic Inspection):** มองเห็นบล็อกเงื่อนไข `if-else` และ `switch-case` ของสคริปต์ศัตรู ทำให้ทราบว่ามอนสเตอร์จะทำอะไรเมื่อเจอสถานการณ์ใด
3. **Tier 3 (Deep Profiler / Code X-Ray):** มองเห็นตัวแปรภายใน (Internal Variables, Counters, Resistance Tables) และเห็นการคำนวณแบบ Real-time ว่าถ้าผู้เล่นรันสคริปต์ปัจจุบัน เงื่อนไขกิ่งใดของศัตรูจะทำงาน (Active Branch Highlighting)

### 2.3 ภาพร่างจำลองหน้าจอ Interface (HUD Mockup)

```
========================================================================================
[CODE DEPTHS - TACTICAL INSPECTION HUD]                                 ROUND: 03 | MANA: 06/10
========================================================================================
[PLAYER: RUNESMITH]                           [TARGET: CRYPTIC WARDEN (LV.14)]
HP: 85/100 | BARRIER: 15 (PHYSICAL)           HP: 140/220 | BARRIER: 40 (ICE WARD)
STATUS: NEUTRAL                               STATUS: FROST_AURA (2 TURNS)
----------------------------------------------------------------------------------------
[ENEMY SCRIPT X-RAY: CrypticWarden.ai]
----------------------------------------------------------------------------------------
 01 | class CrypticWardenAI extends MonsterBehavior {
 02 |   onBeforeDamageTaken(incomingSpell: SpellPayload): Reaction {
 03 |     // [LIVE WATCH] incomingSpell.element == "Fire" (Evaluates to: TRUE)
 04 |     if (incomingSpell.element == Element.FIRE) {
 05 | >>>   return this.castReaction(Spell.WATER_VEIL, Priority.IMMEDIATE);
 06 |       // EFFECT: Converts incoming Fire damage into 50% Healing & Clears Frost
 07 |     }
 08 |     else if (incomingSpell.hitCount > 2) {
 09 |       return this.castReaction(Spell.THORNS_PARRY, Priority.HIGH);
 10 |     }
 11 |     return Reaction.PASS;
 12 |   }
 13 |
 14 |   executeMainPhase(): ActionIntent {
 15 |     if (this.barrier.isBroken()) {
 16 |       return this.planAction(Action.REBOOT_SHIELD, { element: Element.ICE });
 17 |     }
 18 |     return this.planAction(Action.FROST_LANCE, { target: Target.PLAYER, basePower: 25 });
 19 |   }
 20 | }
----------------------------------------------------------------------------------------
[TELEMETRY & ACTIVE BRANCH PREVIEW]
- Line 05 is HIGHLIGHTED IN AMBER: Warning! Your current player code casts Fireball.
- Target trigger [Spell.WATER_VEIL] will trigger before impact!
- Recommended Counter-measure: Shift element to LIGHTNING or bypass reactive hook.
========================================================================================
```

---

## 3. ตารางธาตุและกฎการเปลี่ยนสถานะ (Elemental & State Interaction Matrix)

### 3.1 ธาตุหลักทั้ง 6 (The Six Core Elements)
ใน Code Depths ธาตุไม่ได้เป็นเพียงค่าสัมประสิทธิ์ตัวคูณแพ้ทาง (Rock-Paper-Scissors) ทั่วไป แต่ธาตุทำหน้าที่เป็น **State Modifiers** ที่ส่งผลต่อกระบวนการคำนวณตรรกะในสนามรบ:

1. **Fire (ไฟ):** สร้างสถานะ `BURN` (DoT ที่สเกลตามเทิร์น) และลบล้างสถานะแช่แข็ง
2. **Water (น้ำ):** สร้างสถานะ `WET` เพิ่มการนำไฟฟ้า และเป็นตัวทำละลายทางเวทมนตร์
3. **Ice (น้ำแข็ง):** สร้างสถานะ `CHILL` เพิ่มค่า Delay ในการรันโค้ด หรือ `FREEZE` ระงับการทำแอ็กชัน
4. **Lightning (สายฟ้า):** สร้างสถานะ `CHARGED` ทะลวงเกราะป้องกัน และกระจายความเสียหายแบบ Chain
5. **Wind (ลม):** สร้างสถานะ `AERO_FLOW` กระจายสถานะผิดปกติในพื้นที่ และเพิ่มความเร็วลำดับเทิร์น (Turn Priority)
6. **Earth (ดิน):** สร้างสถานะ `FORTIFIED` เสริมการป้องกัน ต้านทานแรงกระแทก และดูดซับประจุ

### 3.2 เมทริกซ์ปฏิสัมพันธ์ข้ามธาตุ (Cross-Elemental Reaction Matrix)

ตารางปฏิสัมพันธ์ระหว่างธาตุที่อยู่บนเป้าหมาย (Existing State) และธาตุที่โจมตีเข้ามาใหม่ (Incoming Element):

| สถานะเดิม \ ธาตุใหม่ | Fire | Water | Ice | Lightning | Wind | Earth |
|---|---|---|---|---|---|---|
| **Fire (Burn)** | Extends Burn (Duration +1) | Vaporize (1.5x Dmg, Clears Burn, Creates Steam) | Thermal Shock (2.0x Dmg, Clears Both, Armor Crack) | Overload (Explosion AoE, Knocks back Turn Queue) | Firestorm (Spreads Burn to adjacent slots, +30% Dmg) | Magma Slag (Applies Armor Melt DoT) |
| **Water (Wet)** | Vaporize (1.5x Dmg, Removes Wet) | Deep Saturation (Mana Cost of Target +1) | Freeze Lockout (Turns Wet into Frozen, Stun 1 Turn) | Electro-Conduction (2.0x Dmg, Pierces 100% Armor, Shock) | Mist Blindness (Target Accuracy & Proc Chance -25%) | Mud Quagmire (Execution Speed -50%, Roots Target) |
| **Ice (Chilled/Frozen)** | Melt Reaction (Transforms to Wet, 1.75x Fire Dmg) | Ice Glaze (Extends Freeze Duration +1) | Absolute Zero (Increases Physical Fragility by 50%) | Superconductor (Critical Hit, Converts Ice to Shards) | Blizzard Flurry (Delayed Cast Penalty to Next 2 Actions) | Permafrost Crush (Consumes Ice for Massive Blunt Dmg) |
| **Lightning (Charged)** | Plasma Flare (High Single-target Burst, Removes Charge) | Discharge Arc (Creates Electric Pool, Shock over Time) | Magnetic Freeze (Locks Target Ability Cooldowns) | Static Overcharge (Self-Damage to Target if Casting) | Chain Gale (Chains Lightning to all active units) | Grounding Discharge (Earth absorbs Charge, +Barrier) |
| **Wind (Aero)** | Fire Whirl (Converts Wind to Flaming Vortex) | Monsoon Surge (Pushes target down turn order) | Cryo Gale (Slows target instruction cycle) | Storm Surge (Multi-hit Lightning Procs) | Cyclone Resonance (Refunds 1 Mana to Caster) | Dust Erosion (Removes Positive Buffs on Target) |
| **Earth (Fortified)** | Magma Forge (Increases Earth unit Physical Atk) | Mud Wall (Converts Fortify into Regenerating Barrier) | Frost Suture (Makes Earth brittle, Vulnerable to Impact) | Dispersal Conduit (Harmlessly disperses Lightning) | Sandblasting (Armor Shred: Lowers Target Armor by 40%) | Tectonic Resonance (Staggers target, Clears Stances) |

### 3.3 กฎการเปลี่ยนสถานะเชิงระบบ (State Reaction Mechanics & Invariants)

1. **กฎการคงอยู่ของตัวแปรสถานะ (State Persistence):** ยูนิตสามารถถือครองสถานะปฐมภูมิ (Primary Element) ได้สูงสุด 1 สถานะในเวลาเดียวกัน เมื่อมีธาตุใหม่ที่ทำปฏิกิริยาเข้ามา สถานะเดิมจะถูกบริโภค (Consumed) เพื่อสร้าง **Reaction Event**
2. **ปฏิกิริยา Vaporize (ไฟ + น้ำ):**
   - คำนวณความเสียหาย: `BaseDamage * 1.5`
   - ผลข้างเคียง: ล้างสถานะไฟและน้ำ เกิดไอน้ำบดบังการตรวจสอบค่า (Inspect Obfuscation) ชั่วคราว 1 เทิร์น
3. **ปฏิกิริยา Melt (ไฟ + น้ำแข็ง):**
   - คำนวณความเสียหาย: `BaseDamage * 1.75`
   - ผลข้างเคียง: สลายน้ำแข็งเป็นสถานะ `WET` ทันที เปิดโอกาสให้ใช้ธาตุสายฟ้าต่อคอมโบในเฟสถัดไป
4. **ปฏิกิริยา Electro-Conduction (สายฟ้า + น้ำ):**
   - คำนวณความเสียหาย: `BaseDamage * 2.0`
   - ผลข้างเคียง: ข้ามการคำนวณเกราะ (Bypasses 100% Barrier/Armor) และส่งต่อประจุไฟฟ้าไปยังยูนิตข้างเคียงหากมี
5. **ปฏิกิริยา Firestorm Swirl (ลม + ไฟ):**
   - คำนวณความเสียหาย: `BaseDamage * 1.3`
   - ผลข้างเคียง: แพร่กระจายสถานะ `BURN` ไปยัง Sub-processes หรือส่วนประกอบบอสทั้งหมดในสนาม

---

## 4. การดวลตรรกะและการแก้ทาง (Logic Dueling Scenarios)

### 4.1 สถาปัตยกรรม Hook & Event Resolution Pipeline
การดวลตรรกะระหว่างผู้เล่นกับมอนสเตอร์ใช้ระบบ Event Hook Callback ซึ่งมีการจัดลำดับความสำคัญ (Execution Priority) อย่างเคร่งครัด:

```
[Incoming Action Dispatched]
       |
       v
[Hook: onBeforeAction] (Priority: IMMEDIATE - Traps, Counter-Stances)
       |
       v
[Hook: onTargetEvaluation] (Priority: HIGH - Deflection, Decoy Redirect)
       |
       v
[Hook: onElementalCheck] (Priority: MEDIUM - Elemental Absorption Barriers)
       |
       v
[Payload Impact & Calculation] (Damage, Healing, Reaction Triggers)
       |
       v
[Hook: onAfterDamageTaken] (Priority: LOW - Thorns, Retaliation, Enrage Counters)
       |
       v
[Turn Queue Reconciliation]
```

---

### 4.2 สถานการณ์ดวลที่ 1: การแก้ทาง Dynamic Elemental Absorber (The Adaptive Slime)

#### พฤติกรรมของมอนสเตอร์ (Monster Script)
มอนสเตอร์ประเภท Slime มีสคริปต์สแกนตรวจสอบธาตุของเวทที่กำลังจะตกกระทบตัวมัน หากตรวจพบธาตุใด มันจะกางเกราะธาตุเดียวกันเพื่อเปลี่ยนดาเมจทั้งหมดเป็นการฟื้นฟูพลังชีวิต (Absorption Barrier)

```typescript
// Monster AI: AdaptiveSlime.ts
export class AdaptiveSlimeAI implements MonsterBehaviorHook {
  public onBeforeDamageTaken(incoming: SpellPayload, self: CombatEntity): ReactionResult {
    // ตรวจสอบธาตุของการโจมตีที่กำลังจะเข้ามา
    if (incoming.element !== Element.PHYSICAL) {
      // มอนสเตอร์กางเกราะธาตุเดียวกันทันทีแบบ Instant Interruption
      self.activeBarrier = {
        element: incoming.element,
        absorbRatio: 1.0, // เปลี่ยนความเสียหาย 100% เป็นการรักษาตัว
        duration: 1
      };
      
      return ReactionResult.interrupt({
        log: `Adaptive Slime morphed its outer membrane into [${incoming.element}] barrier!`
      });
    }
    
    return ReactionResult.pass();
  }
}
```

#### การแก้ทางของผู้เล่น (Player Counter-Script)
หากผู้เล่นยิงเวทเดี่ยวๆ ตรงไปตรงมา เช่น `castFireball()` มอนสเตอร์จะกลายร่างเป็นไฟและฮีลเลือดเต็มทันที ผู้เล่นที่ใช้ Code X-Ray จะเห็นโค้ดนี้ จึงเขียนสคริปต์แบบ **Dual-Stage Sequencing (หลอกล่อด้วย Decoy แล้วตามด้วยธาตุแก้ทาง)**:

```typescript
// Player Solution: ElementBaitAndStrike.ts
export function combatTurn(player: PlayerContext, enemy: EnemyProxy): void {
  // ขั้นที่ 1: ส่งโพรเจกไทล์ธาตุไฟเบาๆ เพื่อบังคับให้สคริปต์ศัตรูล็อคเกราะเป็นธาตุไฟ
  const bait = player.createSpell({
    element: Element.FIRE,
    manaCost: 1,
    basePower: 5
  });
  player.cast(bait, enemy);

  // ขั้นที่ 2: ตรวจสอบสถานะเกราะศัตรูที่เพิ่งเปลี่ยน และส่งธาตุน้ำเข้ากระแทก (Vaporize)
  // เนื่องจากสคริปต์มอนสเตอร์มีข้อจำกัด: สลับเกราะได้แค่ 1 ครั้งต่อรอบ (Cooldown ติด 1 เทิร์น)
  if (enemy.inspectBarrier().element === Element.FIRE) {
    const finisher = player.createSpell({
      element: Element.WATER,
      manaCost: 4,
      basePower: 45
    });
    // น้ำปะทะเกราะไฟ = Vaporize 1.5x ดาเมจทะลวงเกราะแตกทันที
    player.cast(finisher, enemy);
  }
}
```

---

### 4.3 สถานการณ์ดวลที่ 2: การดักทาง Loop Counter Punishment (The Clockwork Sentinel)

#### พฤติกรรมของมอนสเตอร์ (Monster Script)
Clockwork Sentinel เป็นมอนสเตอร์สายคำนวณรอบ มันจะดักจับผู้เล่นที่ชอบเขียนคำสั่งวนลูป Multi-hit (เช่น `for (let i = 0; i < 5; i++) { attack(); }`) หากจำนวนฮิตใน 1 เทิร์นเกิน 3 ครั้ง มันจะหยุดการโจมตีของผู้เล่นและสวนกลับด้วย Overload Beam ทันที

```typescript
// Monster AI: ClockworkSentinel.ts
export class ClockworkSentinelAI implements MonsterBehaviorHook {
  private hitCounter: number = 0;

  public onRoundStart(): void {
    this.hitCounter = 0; // รีเซ็ตตัวนับเมื่อเริ่มรอบใหม่
  }

  public onBeforeHitLanded(incomingHit: HitEvent, self: CombatEntity, player: PlayerEntity): HitResolution {
    this.hitCounter++;

    // ดักทางผู้เล่นที่ส่งคำสั่ง Loop ถี่เกินไป
    if (this.hitCounter > 3) {
      // ทำลาย Execution Frame ของผู้เล่นและสวนกลับทันที
      player.interruptExecution(InterruptReason.COUNTER_TRIGGERED);
      self.castInstantSkill(Skill.OVERLOAD_RETALIATION, { target: player, damage: 60 });
      
      return HitResolution.CANCEL; // การโจมตีครั้งที่ 4 เป็นต้นไปของผู้เล่นจะไร้ผล
    }

    return HitResolution.PROCEED;
  }
}
```

#### การแก้ทางของผู้เล่น (Player Counter-Script)
ผู้เล่นตรวจสอบโค้ดด้วย X-Ray แล้วพบเงื่อนไข `hitCounter > 3` จึงปรับตรรกะในฟังก์ชันของตนเอง โดยใช้การตรวจสอบ `hitIndex` และสลับเป็นเวททรงพลังฮิตเดียว หรือเขียนคำสั่ง `break` ก่อนที่ตัวนับจะเข้าเงื่อนไขกับดัก:

```typescript
// Player Solution: ControlledBurstLogic.ts
export function combatTurn(player: PlayerContext, enemy: EnemyProxy): void {
  const maxSafeHits = 3;
  let accumulatedCharge = 0;

  // วนลูปสร้างประจุเพียง 3 รอบพอดี ไม่ให้แตะเงื่อนไขรอบที่ 4
  for (let step = 1; step <= 5; step++) {
    if (step <= maxSafeHits) {
      player.castMinorBolt(enemy); // ฮิตที่ 1, 2, 3 ผ่านได้อย่างปลอดภัย
      accumulatedCharge += 10;
    } else {
      // ใช้เงื่อนไขเบี่ยงเบน: แปลงรอบที่เหลือไปชาร์จเกราะป้องกันให้ตัวเองแทนการตีศัตรู
      player.divertEnergyToShield(accumulatedCharge);
      break; // ปลอดภัยจากการสวนกลับ 100%
    }
  }

  // ปิดท้ายด้วย Heavy Strike นอกลูป (เป็นการโจมตี 1 ฮิตขนาดใหญ่โดยไม่นับรวมในลูปเดิม)
  if (player.currentMana >= 3) {
    player.castHeavyImpact(enemy);
  }
}
```

---

## 5. สถาปัตยกรรมบอสแบบหลายเฟส (Multi-Phase Boss Architecture: "The Core")

บอสประจำโซนสถาปัตยกรรมระดับลึกคือ **"The Core" (The Corrupted Kernel Processor)** ซึ่งทำหน้าที่เป็นบททดสอบการเขียนโค้ดและดวลตรรกะขั้นสูงสุด บอสตัวนี้ไม่มีการสุ่มท่า แต่จะเปลี่ยนสภาพแวดล้อมรันไทม์และตัวแปลภาษา (Compiler Engine) ตามเฟสพลังชีวิต

```
+-----------------------------------------------------------------------+
|                       BOSS: THE CORE (KERNEL)                         |
+-----------------------------------------------------------------------+
| PHASE 1: THE INTERPRETER (HP: 100% - 70%)                             |
| - Basic Reactive Hooks                                                |
| - Dual-Thread Evaluation (Opposite Element Counter)                  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| PHASE 2: THE OPTIMIZER (HP: 70% - 30%)                                |
| - Dynamic AST Inspection of Player Code                               |
| - Action History Profiling & Immutable Caching                        |
| - JIT Counter-Measure Injection                                       |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| PHASE 3: CORRUPT COMPILER (HP: 30% - 0%)                              |
| - Runtime Sandbox Tampering                                           |
| - Variable Memory Leak Creep & Scope Poisoning                        |
| - Stack Overflow Enforcer                                             |
+-----------------------------------------------------------------------+
```

---

### 5.1 Phase 1: The Interpreter (Basic Reactive Phase)

#### พฤติกรรมและกลไก (Mechanics)
- บอสทำหน้าที่ประมวลผลคำสั่งตรงไปตรงมา
- มีเธรดการประเมิน 2 เธรด:
  1. **Thread Alpha (Offense):** ยิงลำแสงธาตุหมุนเวียน Fire -> Lightning -> Earth
  2. **Thread Beta (Defense):** สแกนธาตุที่ผู้เล่นโจมตีเข้ามา แล้วตั้งรับด้วย **ธาตุตรงข้ามขั้ว** (Inverse Polar Shield) เช่น ถ้าโดน Fire จะตอบโต้ด้วย Water Shield

#### โครงสร้างสคริปต์ของบอส (Boss Logic Definition)
```typescript
// Boss Phase 1: InterpreterMode.ts
export class CorePhaseOneBehavior implements BossPhaseHandler {
  private rotationCycle: Element[] = [Element.FIRE, Element.LIGHTNING, Element.EARTH];
  private cycleIndex: number = 0;

  public evaluateAction(boss: BossEntity, player: PlayerEntity): BossActionPlan {
    const activeElement = this.rotationCycle[this.cycleIndex % this.rotationCycle.length];
    this.cycleIndex++;

    return {
      primaryAction: {
        type: ActionType.CAST_SPELL,
        spellName: "Thread_Pulse",
        element: activeElement,
        damage: 25
      },
      reactiveStance: {
        trigger: "ON_DAMAGE_TAKEN",
        action: "DEPLOY_POLAR_OPPOSITE_SHIELD"
      }
    };
  }
}
```

#### กลยุทธ์ในการพิชิต Phase 1
- ผู้เล่นตรวจดู `rotationCycle` และเตรียมเกราะป้องกันธาตุที่บอสจะยิงในเทิร์นถัดไป
- สลับธาตุการโจมตีแบบสลับฟันปลา (Alternating Elements) เพื่อทำให้ Polar Shield ของบอสทำงานช้ากว่า 1 จังหวะเสมอ

---

### 5.2 Phase 2: The Optimizer (Counter-Measure Script Phase)

#### พฤติกรรมและกลไก (Mechanics)
เมื่อพลังชีวิตลดลงต่ำกว่า 70% The Core จะเข้าสู่สภาวะ **Adaptive Profiler**:
1. **Action History Profiling (การบันทึกประวัติการเล่น):** บอสจะเก็บสถิติ AST Nodes ของผู้เล่น เช่น หากผู้เล่นใช้ฟังก์ชันเดิมซ้ำกัน 2 เทิร์นติดกัน หรือใช้ลูปมากกว่า 2 รอบ บอสจะถือว่าโค้ดนั้น "Predictable"
2. **Immutable Patching (การคอมไพล์เกราะต้านทานถาวร):** บอสจะประกาศเกราะป้องกัน `IMMUTABLE_RESISTANCE` สำหรับ Spell ID หรือ Pattern ที่ผู้เล่นใช้บ่อยที่สุด ทำให้การโจมตีนั้นกลายเป็น 0 ดาเมจทันที
3. **Memory Tampering Hook:** สั่งลดความจุตัวแปร (Local Variable Register) ของผู้เล่นลง 1 สล็อต

#### โครงสร้างสคริปต์ของบอส (Boss Logic Definition)
```typescript
// Boss Phase 2: OptimizerMode.ts
export class CorePhaseTwoBehavior implements BossPhaseHandler {
  private playerActionHistory: Map<string, number> = new Map();
  private bannedSignatures: Set<string> = new Set();

  public onPlayerCodeSubmitted(astPayload: PlayerCodeAST): CompilerIntervention {
    const signature = astPayload.extractStructuralHash();
    const frequency = (this.playerActionHistory.get(signature) || 0) + 1;
    this.playerActionHistory.set(signature, frequency);

    // หากผู้เล่นใช้สไตล์หรือสคริปต์เดิมซ้ำเกิน 1 ครั้ง บอสจะคอมไพล์แพตช์ป้องกันทันที
    if (frequency >= 2) {
      this.bannedSignatures.add(signature);
      return CompilerIntervention.injectRule({
        type: "INJECT_IMMUTABLE_NULLIFIER",
        targetHash: signature,
        message: "OPTIMIZER COMPILER: Signature identified as repetitive pattern. Damage nullified."
      });
    }

    return CompilerIntervention.ALLOW;
  }

  public interceptDamage(incoming: SpellPayload): number {
    if (this.bannedSignatures.has(incoming.sourceSignatureHash)) {
      return 0; // สะท้อนเป็นดาเมจ 0
    }
    return incoming.rawDamage;
  }
}
```

#### กลยุทธ์ในการพิชิต Phase 2
- ผู้เล่นห้ามเขียนสคริปต์แบบ Static Monolithic โค้ดเดิมซ้ำๆ
- ต้องเขียนสถาปัตยกรรมแบบ **Polymorphic Execution**:
  - ใช้ฟังก์ชันแบบ Dynamic Strategy Pattern ในแต่ละเทิร์น เช่น เทิร์นคี่รันอัลกอริทึม A (Burst Single Spell) เทิร์นคู่รันอัลกอริทึม B (Multi-element Synthesis) เพื่อทำให้ `StructuralHash` เปลี่ยนแปลงตลอดเวลา ทำให้ Optimizer ไม่สามารถคอมไพล์แพตช์ดักทางได้ทัน

---

### 5.3 Phase 3: Corrupt Compiler (The Kernel Panic Phase)

#### พฤติกรรมและกลไก (Mechanics)
เมื่อพลังชีวิตต่ำกว่า 30% The Core จะเข้าสู่สภาวะวิกฤต บอสจะทำลายความเสถียรของสภาพแวดล้อมจำลอง (Runtime Environment Corruption) บังคับให้ผู้เล่นต้องรับมือกับความผิดพลาดของระบบ:

1. **Injected Syntax Warnings (บทลงโทษ Mana):** ทุกบรรทัดคำสั่งที่มีการประกาศตัวแปรใหม่ (`let`, `const`) โดยไม่มีการเรียกใช้จริง หรือตัวแปรที่ไม่ได้ปลดปล่อย จะถูกบอสปรับเป็น Mana Penalty เพิ่มค่าร่ายคำสั่งถัดไป +1 Mana ต่อตัวแปรส่วนเกิน
2. **Memory Leak Creep:** เพดาน Mana สูงสุด (Max Mana) ของผู้เล่นจะลดลง 1 หน่วยในทุกๆ 2 เทิร์น เว้นแต่ผู้เล่นจะเขียนฟังก์ชันทำความสะอาดหน่วยความจำจำลอง (Garbage Collection Routine) เช่น `player.cleanupMemory()`
3. **Variable Swapping Glitch (Data Corruption):** ในตอนเริ่มเทิร์น บอสจะสุ่มสลับพารามิเตอร์ของฟังก์ชันโจมตีของผู้เล่น เช่น ค่าอาร์กิวเมนต์ตัวแรก (เป้าหมาย) สลับกับค่าอาร์กิวเมนต์ตัวที่สอง (พลังเวท) ทำให้ผู้เล่นต้องใส่ Type Guard และ Validation Wrapper ตรวจสอบตัวแปรก่อนส่งรัน
4. **Deadlock & Stack Overflow Enforcer:** หากผู้เล่นเขียนฟังก์ชันเรียกซ้ำ (Recursion) โดยลืมใส่ Base Case ที่ถูกต้อง หรือทำให้เกิด Infinite Loop บอสจะไม่ปล่อยให้เกมค้าง แต่จะแปลงเป็นดาเมจ True Damage มหาศาลระเบิดใส่ตัวผู้เล่นตามจำนวน Stack Depth

#### โครงสร้างสคริปต์ของบอส (Boss Logic Definition)
```typescript
// Boss Phase 3: CorruptCompilerMode.ts
export class CorePhaseThreeBehavior implements BossPhaseHandler {
  public transformEnvironment(runtimeSandbox: RuntimeContext): void {
    // 1. ลดเพดาน Max Mana หากไม่มีการเรียก GC ในเทิร์นก่อน
    if (!runtimeSandbox.lastTurnActions.includes("SYSTEM_GARBAGE_COLLECT")) {
      runtimeSandbox.playerMaxMana = Math.max(1, runtimeSandbox.playerMaxMana - 1);
    }

    // 2. ฉีดไวรัสกลายพันธุ์ตัวแปร (Variable Swapping Mutation)
    runtimeSandbox.registerHook("ON_FUNCTION_ARGUMENT_RESOLVE", (args: any[]) => {
      if (args.length >= 2 && Math.random() < 0.4) {
        // สลับอาร์กิวเมนต์แบบไม่แจ้งเตือน
        const temp = args[0];
        args[0] = args[1];
        args[1] = temp;
      }
      return args;
    });
  }

  public evaluateTerminalExecution(executionMetrics: ExecutionTelemetry, player: PlayerEntity): void {
    // ตรวจสอบ Stack Overflow
    if (executionMetrics.callStackDepth > 50) {
      const penaltyDamage = (executionMetrics.callStackDepth - 50) * 5;
      player.applyTrueDamage(penaltyDamage, "KERNEL_PANIC: CALL_STACK_OVERFLOW");
    }

    // ตรวจสอบ Unused Variables
    if (executionMetrics.unusedVariableCount > 0) {
      player.consumeMana(executionMetrics.unusedVariableCount * 1);
    }
  }
}
```

#### กลยุทธ์ในการพิชิต Phase 3 (The Ultimate Code Duel)
ผู้เล่นต้องเขียนโค้ดที่รัดกุมระดับ Mission-Critical Software Engineering:
1. **Memory Discipline:** ใส่คำสั่ง `player.releaseResources()` หรือ `System.gc()` ในตอนท้ายของสคริปต์ทุกเทิร์น เพื่อป้องกัน Max Mana หดหาย
2. **Defensive Parameter Validation (Type Guards):** ไม่ส่งตัวแปรตรงๆ เข้าฟังก์ชันโจมตี แต่สร้าง Guard Function เพื่อตรวจสอบความถูกต้อง หากพบว่าเป้าหมายไม่ใช่ `Enemy` ให้สลับกลับก่อนส่งคำสั่ง
3. **Bounded Recursion:** หากใช้ฟังก์ชันเวทมนตร์แบบ Recursive ต้องกำหนดตัวนับรอบ (Depth Guard) อย่างเข้มงวด เช่น `if (depth > 5) return baseResult;`
4. **Lean Scripting:** เขียนโค้ดสั้น กระชับ ใช้ตัวแปรเท่าที่จำเป็นที่สุดเพื่อไม่ให้โดน Mana Warning Penalty

---

## 6. สเปกข้อมูลและอินเทอร์เฟซระบบ (Interface Contracts & Specifications)

เพื่อให้ระบบ Monster AI และ Script Dueling สามารถเชื่อมโยงกับโมดูลอื่นๆ (Execution Engine ในโมดูล 01 และ Runes/Data Models ในโมดูล 03, 04) สเปกข้อมูลต่อไปนี้ถูกกำหนดเป็นมาตรฐานสากลของโปรเจกต์:

### 6.1 TypeScript Interface Definitions

```typescript
// Path: src/engine/contracts/MonsterAIContracts.ts

export enum Element {
  PHYSICAL = "PHYSICAL",
  FIRE = "FIRE",
  WATER = "WATER",
  ICE = "ICE",
  LIGHTNING = "LIGHTNING",
  WIND = "WIND",
  EARTH = "EARTH"
}

export enum Priority {
  MONITOR = 0,
  LOW = 10,
  MEDIUM = 20,
  HIGH = 30,
  IMMEDIATE = 100 // แทรกแซงทันทีก่อนการคำนวณดาเมจ
}

export interface SpellPayload {
  spellId: string;
  sourceSignatureHash: string;
  element: Element;
  rawDamage: number;
  hitCount: number;
  statusEffects: string[];
}

export interface ElementalBarrier {
  element: Element;
  durability: number;
  absorbRatio: number;
  counterReaction?: string;
}

export interface ReactionResult {
  intercepted: boolean;
  modifiedPayload?: SpellPayload;
  counterAction?: () => void;
  logMessage: string;
}

export interface MonsterBehaviorHook {
  onRoundStart?(self: any): void;
  onBeforeDamageTaken?(incoming: SpellPayload, self: any): ReactionResult;
  onBeforeHitLanded?(hitIndex: number, self: any, player: any): boolean;
  onAfterTurnEnded?(self: any): void;
}

export interface InspectionData {
  entityId: string;
  entityName: string;
  tier: number;
  pseudoCodeLines: string[];
  activeHighlightedLines: number[];
  internalVariables: Record<string, any>;
  predictedIntent: {
    description: string;
    target: string;
    expectedElement: Element;
    expectedPower: number;
  };
}

export interface BossPhaseState {
  currentPhase: number;
  phaseName: string;
  healthThresholdPercent: number;
  activeCompilerRules: string[];
  bannedPatterns: string[];
}
```

### 6.2 การปฏิบัติตามกฎเหล็กของระบบ (System Invariants Compliance)
1. **ไม่มีการตายแบบกะทันหัน (No Instant Kill on Script Errors):** หากมอนสเตอร์หรือบอสเกิด Runtime Exception ในสคริปต์ ระบบจะแปลงเป็นสถานะ **Staggered / System Malfunction** เปิดโอกาสให้ผู้เล่นทำคริติคอลดาเมจ 1 เทิร์น และหากโค้ดผู้เล่นมีบั๊ก จะแปลงเป็น **Mana Burn / Spell Fizzle** ตามกฎบัตรข้อ 3
2. **การเปลี่ยนแปลงโค้ดทุกบรรทัดต้องส่งผลต่อตัวเลขจริงในสนามรบ:** การเพิ่มเงื่อนไข `if` หรือการปรับลำดับของ `for` loop ต้องสะท้อนไปยัง Event Hooks และ Counter Triggers ของศัตรูอย่างโปร่งใส 100%
3. **การออกแบบเชิงโมดูล:** สามารถนำ MonsterBehaviorHook ไปต่อเชื่อมกับ Sandbox Execution Runner ได้โดยตรงโดยไม่ต้องแก้ไข Core Engine

---

## 7. สรุปภาพรวมสถาปัตยกรรม (Architecture Summary Table)

| หัวข้อหลัก | กลไกสำคัญ (Core Mechanism) | ผลลัพธ์ต่อการเล่นของผู้เล่น (Gameplay Impact) |
|---|---|---|
| **Monster AI Philosophy** | Script-driven Autonomous Entities พร้อม Dynamic Event Hooks | มอนสเตอร์ไม่ใช่เป้าซ้อม แต่เป็นโจทย์อัลกอริทึมที่ตอบโต้ทุกการกระทำ |
| **Code X-Ray System** | สแกน AST Logic และประเมินกิ่งเงื่อนไขแบบ Real-time | ผู้เล่นตัดสินใจบนข้อมูลที่โปร่งใส ไม่ต้องเดา RNG แบบไม่ยุติธรรม |
| **Elemental Matrix** | 6 ธาตุหลักพร้อมปฏิกิริยาสถานะสองทิศทาง (Melt, Vaporize, Conduction) | การเลือกธาตุเป็นเรื่องของการจัดลำดับขั้นตอน (Sequencing) ไม่ใช่แค่ตัวคูณคงที่ |
| **Logic Dueling** | Priority Hooks (IMMEDIATE -> HIGH -> MEDIUM) | เกิดมิติการวางแผนซ้อน เช่น ส่งเหยื่อล่อ (Decoy) หลอกให้สคริปต์ศัตรูติดคูลดาวน์ |
| **Multi-Phase Boss ("The Core")** | 3 เฟส: The Interpreter -> The Optimizer -> Corrupt Compiler | บททดสอบฝีมือวิศวกรรมขั้นสูง ตั้งแต่การอ่านแพทเทิร์น ไปจนถึงการเขียนโค้ดต้านบั๊กและ Memory Leak |
