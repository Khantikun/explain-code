import { createRng } from "./seed";
import { MonsterType } from "./monsters";

export enum TileType {
  VOID = 0,
  WALL = 1,
  FLOOR = 2,
  DOOR = 3,
  TORCH = 4,
  CHEST = 5,
  MONSTER = 6,
  PUZZLE = 7,
  BOSS = 8,
}

export type RoomType = "monster" | "chest" | "puzzle" | "boss";

export interface DungeonEntity {
  id: string;
  type: RoomType;
  monsterType?: MonsterType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isCompleted: boolean;
}

export interface DungeonRoom {
  width: number;
  height: number;
  tiles: TileType[][];
  playerStart: { x: number; y: number };
  doorPos: { x: number; y: number };
  torches: { x: number; y: number }[];
  entity: DungeonEntity | null;
  chest?: { x: number; y: number; isOpened: boolean } | null;
  roomType: RoomType;
  floorIndex: number;
  totalFloors: number;
  isDoorUnlocked: boolean;
}

export const MAP_WIDTH = 16;
export const MAP_HEIGHT = 12;

/**
 * Procedurally generates a deterministic dungeon floor from a seed.
 */
export function generateDungeonRoom(
  courseSeed: number,
  floorIndex: number,
  totalFloors: number,
  roomTypeOverride?: RoomType
): DungeonRoom {
  const floorSeed = (courseSeed + (floorIndex + 1) * 31337) >>> 0;
  const rng = createRng(floorSeed);

  // Determine room type
  let roomType: RoomType;
  if (roomTypeOverride) {
    roomType = roomTypeOverride;
  } else if (floorIndex >= totalFloors - 1) {
    roomType = "boss";
  } else if ((floorIndex + 1) % 4 === 0) {
    roomType = "chest";
  } else if ((floorIndex + 1) % 3 === 0) {
    roomType = "puzzle";
  } else {
    roomType = "monster";
  }

  // Pick monster type
  let monsterType: MonsterType = "slime";
  if (roomType === "boss") {
    monsterType = "boss";
  } else if (roomType === "monster") {
    const roll = rng();
    if (floorIndex === 0) {
      monsterType = "slime";
    } else if (roll < 0.45) {
      monsterType = "slime";
    } else if (roll < 0.75) {
      monsterType = "skeleton";
    } else {
      monsterType = "goblin";
    }
  }

  // Initialize tile grid
  const tiles: TileType[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1) {
        row.push(TileType.WALL);
      } else {
        row.push(TileType.FLOOR);
      }
    }
    tiles.push(row);
  }

  // Torches on top wall
  const torches = [
    { x: 3, y: 1 },
    { x: 12, y: 1 },
  ];
  torches.forEach((t) => {
    tiles[t.y][t.x] = TileType.TORCH;
  });

  // Pillars for visual variety on some seeds
  if (rng() > 0.4 && roomType !== "boss") {
    tiles[4][4] = TileType.WALL;
    tiles[4][11] = TileType.WALL;
    tiles[7][4] = TileType.WALL;
    tiles[7][11] = TileType.WALL;
  }

  // Exit Door at top wall center
  const doorPos = { x: 8, y: 0 };
  tiles[doorPos.y][doorPos.x] = TileType.DOOR;

  // Player start at bottom center
  const playerStart = { x: 8, y: MAP_HEIGHT - 2 };

  // Place entity at center
  const entityX = 8;
  const entityY = 5;

  let maxHp = 1;
  if (roomType === "boss") maxHp = 3;
  else if (monsterType === "skeleton" || monsterType === "goblin") maxHp = 2;

  const entity: DungeonEntity = {
    id: `entity-${floorIndex}-${roomType}`,
    type: roomType,
    monsterType: roomType === "monster" || roomType === "boss" ? monsterType : undefined,
    x: entityX,
    y: entityY,
    hp: maxHp,
    maxHp,
    isCompleted: false,
  };

  // Place tile marker
  if (roomType === "monster") {
    tiles[entityY][entityX] = TileType.MONSTER;
  } else if (roomType === "boss") {
    tiles[entityY][entityX] = TileType.BOSS;
  } else if (roomType === "chest") {
    tiles[entityY][entityX] = TileType.CHEST;
  } else if (roomType === "puzzle") {
    tiles[entityY][entityX] = TileType.PUZZLE;
  }

  // Place an optional Code Chest in non-chest rooms
  let chest: { x: number; y: number; isOpened: boolean } | null = null;
  if (roomType !== "chest") {
    const chestX = rng() > 0.5 ? 2 : 13;
    const chestY = 5;
    tiles[chestY][chestX] = TileType.CHEST;
    chest = { x: chestX, y: chestY, isOpened: false };
  }

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    playerStart,
    doorPos,
    torches,
    entity,
    chest,
    roomType,
    floorIndex,
    totalFloors,
    isDoorUnlocked: false,
  };
}
