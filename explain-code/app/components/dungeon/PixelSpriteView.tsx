import React from "react";
import { DUNGEON_PALETTE } from "../../lib/dungeon/palette";
import { PixelSpriteDef } from "../../lib/dungeon/sprites";

interface PixelSpriteViewProps {
  sprite: PixelSpriteDef;
  size?: number; // Size in CSS pixels, e.g. 64
  className?: string;
  animateBounce?: boolean;
}

/**
 * Renders a 16x16 or 8x8 code-defined pixel sprite as a pure SVG grid.
 * Guaranteed zero blur, crisp integer scaling, SSR safe.
 */
export function PixelSpriteView({
  sprite,
  size = 64,
  className = "",
  animateBounce = false,
}: PixelSpriteViewProps) {
  const height = sprite.rows.length;
  const width = sprite.rows[0]?.length || 16;

  const rects: React.ReactNode[] = [];

  for (let y = 0; y < height; y++) {
    const row = sprite.rows[y];
    for (let x = 0; x < width; x++) {
      const char = row[x];
      if (char && char !== ".") {
        const paletteKey = sprite.colors[char];
        const hex = paletteKey ? DUNGEON_PALETTE[paletteKey] : "#ffffff";
        rects.push(
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={hex}
            shapeRendering="crispEdges"
          />
        );
      }
    }
  }

  return (
    <div
      className={`inline-block select-none pixelated ${animateBounce ? "animate-bounce" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        className="pixelated block"
        style={{ shapeRendering: "crispEdges" }}
        aria-hidden="true"
      >
        {rects}
      </svg>
    </div>
  );
}
