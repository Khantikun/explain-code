"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { DUNGEON_PALETTE } from "../../lib/dungeon/palette";
import {
  PixelSpriteDef,
  AvatarDef,
  HEART_SPRITE,
  COIN_SPRITE,
  DOOR_SPRITE,
  TORCH_SPRITE,
  CHEST_CLOSED_SPRITE,
  CHEST_OPEN_SPRITE,
} from "../../lib/dungeon/sprites";
import { getMonsterDef } from "../../lib/dungeon/monsters";
import { DungeonRoom, TileType, MAP_WIDTH, MAP_HEIGHT } from "../../lib/dungeon/mapgen";
import { dungeonSound } from "../../lib/dungeon/sound";

interface GameCanvasProps {
  room: DungeonRoom;
  avatar: AvatarDef;
  isPaused: boolean;
  isInBattle: boolean;
  onEncounterEntity: () => void;
  onEnterNextFloor: () => void;
  onAutoPause: () => void;
  screenShake: number; // 0 to 1 intensity
}

const TILE_SIZE = 16;
const NATIVE_WIDTH = MAP_WIDTH * TILE_SIZE; // 256
const NATIVE_HEIGHT = MAP_HEIGHT * TILE_SIZE; // 192

export function GameCanvas({
  room,
  avatar,
  isPaused,
  isInBattle,
  onEncounterEntity,
  onEnterNextFloor,
  onAutoPause,
  screenShake,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Player position state in grid coordinates
  const playerPosRef = useRef<{ x: number; y: number }>({
    x: room.playerStart.x,
    y: room.playerStart.y,
  });

  // Display interpolated pixel position for smooth retro walking
  const displayPosRef = useRef<{ x: number; y: number }>({
    x: room.playerStart.x * TILE_SIZE,
    y: room.playerStart.y * TILE_SIZE,
  });

  const isMovingRef = useRef<boolean>(false);
  const facingRef = useRef<"left" | "right">("right");
  const stepTimerRef = useRef<number>(0);

  // Sync player position when room changes
  useEffect(() => {
    playerPosRef.current = { x: room.playerStart.x, y: room.playerStart.y };
    displayPosRef.current = {
      x: room.playerStart.x * TILE_SIZE,
      y: room.playerStart.y * TILE_SIZE,
    };
  }, [room.floorIndex, room.playerStart.x, room.playerStart.y]);

  // Handle player grid movement
  const tryMove = useCallback(
    (dx: number, dy: number) => {
      if (isPaused || isInBattle) return;

      if (dx < 0) facingRef.current = "left";
      if (dx > 0) facingRef.current = "right";

      const current = playerPosRef.current;
      const targetX = current.x + dx;
      const targetY = current.y + dy;

      // Bounds check
      if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) {
        return;
      }

      const tile = room.tiles[targetY][targetX];

      // Wall collision
      if (tile === TileType.WALL || tile === TileType.TORCH) {
        return;
      }

      // Door collision
      if (targetX === room.doorPos.x && targetY === room.doorPos.y) {
        if (room.isDoorUnlocked) {
          dungeonSound.playDoorOpen();
          onEnterNextFloor();
        }
        return;
      }

      // Entity (Monster / Chest / Puzzle / Boss) collision
      if (
        room.entity &&
        !room.entity.isCompleted &&
        targetX === room.entity.x &&
        targetY === room.entity.y
      ) {
        onEncounterEntity();
        return;
      }

      // Valid move
      playerPosRef.current = { x: targetX, y: targetY };
      dungeonSound.playStep();
    },
    [isPaused, isInBattle, room, onEncounterEntity, onEnterNextFloor]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isInBattle) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          tryMove(0, -1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          tryMove(0, 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          tryMove(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          tryMove(1, 0);
          break;
        case " ":
        case "Enter":
          // Interact with entity if directly facing or standing adjacent
          e.preventDefault();
          if (room.entity && !room.entity.isCompleted) {
            const dist =
              Math.abs(playerPosRef.current.x - room.entity.x) +
              Math.abs(playerPosRef.current.y - room.entity.y);
            if (dist <= 1) {
              onEncounterEntity();
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tryMove, isPaused, isInBattle, room.entity, onEncounterEntity]);

  // Tab blur auto-pause
  useEffect(() => {
    const handleBlur = () => {
      onAutoPause();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onAutoPause();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onAutoPause]);

  // Helper function to draw pixel sprite
  const drawSprite = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      sprite: PixelSpriteDef,
      dx: number,
      dy: number,
      flipH: boolean = false
    ) => {
      const h = sprite.rows.length;
      const w = sprite.rows[0]?.length || 16;

      ctx.save();
      if (flipH) {
        ctx.translate(dx + w, dy);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(dx, dy);
      }

      for (let y = 0; y < h; y++) {
        const row = sprite.rows[y];
        for (let x = 0; x < w; x++) {
          const char = row[x];
          if (char && char !== ".") {
            const paletteKey = sprite.colors[char];
            const hex = paletteKey ? DUNGEON_PALETTE[paletteKey] : "#ffffff";
            ctx.fillStyle = hex;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      ctx.restore();
    },
    []
  );

  // Main 60FPS Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let startTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const render = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      stepTimerRef.current = elapsed;

      // Smooth lerp movement towards target grid position
      const targetPixelX = playerPosRef.current.x * TILE_SIZE;
      const targetPixelY = playerPosRef.current.y * TILE_SIZE;
      const currentPixelX = displayPosRef.current.x;
      const currentPixelY = displayPosRef.current.y;

      const dx = targetPixelX - currentPixelX;
      const dy = targetPixelY - currentPixelY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.5) {
        displayPosRef.current.x += dx * 0.35;
        displayPosRef.current.y += dy * 0.35;
        isMovingRef.current = true;
      } else {
        displayPosRef.current.x = targetPixelX;
        displayPosRef.current.y = targetPixelY;
        isMovingRef.current = false;
      }

      // Check screen shake
      ctx.save();
      if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake * 6;
        const shakeY = (Math.random() - 0.5) * screenShake * 6;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Draw Void / Base
      ctx.fillStyle = DUNGEON_PALETTE.void;
      ctx.fillRect(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);

      // 2. Draw Floor & Walls
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = room.tiles[y][x];
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          if (tile === TileType.WALL) {
            // Wall top
            ctx.fillStyle = DUNGEON_PALETTE.wall;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE - 3);
            // Wall shadow/base
            ctx.fillStyle = DUNGEON_PALETTE.stoneDark;
            ctx.fillRect(px, py + TILE_SIZE - 3, TILE_SIZE, 3);
            // Brick border lines
            ctx.fillStyle = DUNGEON_PALETTE.outline;
            ctx.fillRect(px, py, TILE_SIZE, 1);
            ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
          } else {
            // Floor
            ctx.fillStyle = DUNGEON_PALETTE.floor;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            // Retro stone grid texture
            ctx.fillStyle = DUNGEON_PALETTE.stoneDark;
            ctx.fillRect(px, py, TILE_SIZE, 1);
            ctx.fillRect(px, py, 1, TILE_SIZE);
            if ((x + y) % 3 === 0) {
              ctx.fillStyle = DUNGEON_PALETTE.floorLight;
              ctx.fillRect(px + 4, py + 4, 2, 2);
            }
          }
        }
      }

      // 3. Draw Exit Door
      const doorPx = room.doorPos.x * TILE_SIZE;
      const doorPy = room.doorPos.y * TILE_SIZE;
      drawSprite(ctx, DOOR_SPRITE, doorPx, doorPy);
      if (room.isDoorUnlocked) {
        // Glowing portal inside door
        const glowPulse = Math.sin(elapsed * 6) * 0.3 + 0.7;
        ctx.fillStyle = DUNGEON_PALETTE.purple;
        ctx.globalAlpha = glowPulse;
        ctx.fillRect(doorPx + 4, doorPy + 4, 8, 8);
        ctx.globalAlpha = 1.0;
      }

      // 4. Draw Torches
      room.torches.forEach((t) => {
        const tx = t.x * TILE_SIZE;
        const ty = t.y * TILE_SIZE;
        drawSprite(ctx, TORCH_SPRITE, tx, ty);
      });

      // 5. Draw Entity (Monster / Chest / Boss)
      if (room.entity && !room.entity.isCompleted) {
        const ex = room.entity.x * TILE_SIZE;
        const ey = room.entity.y * TILE_SIZE;
        const floatBob = Math.sin(elapsed * 5) * 1.5;

        if (room.entity.type === "monster" && room.entity.monsterType) {
          const mDef = getMonsterDef(room.entity.monsterType);
          drawSprite(ctx, mDef.sprite, ex, ey + floatBob);
        } else if (room.entity.type === "boss") {
          const mDef = getMonsterDef("boss");
          drawSprite(ctx, mDef.sprite, ex, ey + floatBob);
        } else if (room.entity.type === "chest") {
          drawSprite(ctx, CHEST_CLOSED_SPRITE, ex, ey);
        } else if (room.entity.type === "puzzle") {
          drawSprite(ctx, CHEST_CLOSED_SPRITE, ex, ey);
        }
      } else if (room.entity && room.entity.isCompleted) {
        // Show opened chest if chest room
        if (room.entity.type === "chest" || room.entity.type === "puzzle") {
          const ex = room.entity.x * TILE_SIZE;
          const ey = room.entity.y * TILE_SIZE;
          drawSprite(ctx, CHEST_OPEN_SPRITE, ex, ey);
        }
      }

      // 6. Draw Player Avatar
      const playerX = displayPosRef.current.x;
      const walkBob = isMovingRef.current ? Math.sin(elapsed * 18) * 1.5 : 0;
      const playerY = displayPosRef.current.y + walkBob;
      drawSprite(ctx, avatar.sprite, playerX, playerY, facingRef.current === "left");

      // 7. Dynamic Lighting & Atmospheric Fog of War
      // We create a lighting mask over the canvas with circular punch-outs
      ctx.save();
      const lightCanvas = document.createElement("canvas");
      lightCanvas.width = NATIVE_WIDTH;
      lightCanvas.height = NATIVE_HEIGHT;
      const lightCtx = lightCanvas.getContext("2d");

      if (lightCtx) {
        // Ambient darkness
        lightCtx.fillStyle = "rgba(11, 11, 20, 0.72)";
        lightCtx.fillRect(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);

        lightCtx.globalCompositeOperation = "destination-out";

        // Torch flickering lights
        room.torches.forEach((t) => {
          const flicker = Math.sin(elapsed * 8 + t.x) * 3;
          const torchRadius = 40 + flicker;
          const tg = lightCtx.createRadialGradient(
            t.x * TILE_SIZE + 8,
            t.y * TILE_SIZE + 8,
            2,
            t.x * TILE_SIZE + 8,
            t.y * TILE_SIZE + 8,
            torchRadius
          );
          tg.addColorStop(0, "rgba(0, 0, 0, 1.0)");
          tg.addColorStop(0.7, "rgba(0, 0, 0, 0.5)");
          tg.addColorStop(1, "rgba(0, 0, 0, 0.0)");
          lightCtx.fillStyle = tg;
          lightCtx.beginPath();
          lightCtx.arc(t.x * TILE_SIZE + 8, t.y * TILE_SIZE + 8, torchRadius, 0, Math.PI * 2);
          lightCtx.fill();
        });

        // Player lantern light
        const playerRadius = 48 + Math.sin(elapsed * 4) * 2;
        const pg = lightCtx.createRadialGradient(
          playerX + 8,
          playerY + 8,
          4,
          playerX + 8,
          playerY + 8,
          playerRadius
        );
        pg.addColorStop(0, "rgba(0, 0, 0, 1.0)");
        pg.addColorStop(0.8, "rgba(0, 0, 0, 0.45)");
        pg.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        lightCtx.fillStyle = pg;
        lightCtx.beginPath();
        lightCtx.arc(playerX + 8, playerY + 8, playerRadius, 0, Math.PI * 2);
        lightCtx.fill();

        // Draw light mask onto main canvas
        ctx.drawImage(lightCanvas, 0, 0);
      }
      ctx.restore();

      ctx.restore(); // Restore screen shake

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [room, avatar, screenShake, drawSprite]);

  // Click on canvas to move player towards click tile (mobile friendly)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPaused || isInBattle) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = NATIVE_WIDTH / rect.width;
    const scaleY = NATIVE_HEIGHT / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const targetGridX = Math.floor(clickX / TILE_SIZE);
    const targetGridY = Math.floor(clickY / TILE_SIZE);

    const cur = playerPosRef.current;
    const dx = targetGridX - cur.x;
    const dy = targetGridY - cur.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      tryMove(dx > 0 ? 1 : -1, 0);
    } else if (dy !== 0) {
      tryMove(0, dy > 0 ? 1 : -1);
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] max-w-[640px] mx-auto bg-[#0b0b14] rounded-2xl overflow-hidden border-4 border-[#4a4766] shadow-[0_0_25px_rgba(0,0,0,0.8)] select-none">
      <canvas
        ref={canvasRef}
        width={NATIVE_WIDTH}
        height={NATIVE_HEIGHT}
        onClick={handleCanvasClick}
        className="pixelated w-full h-full block cursor-pointer"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
