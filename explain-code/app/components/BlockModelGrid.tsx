import React, { useState } from "react";
import {
  BLOCK_MODEL_CELLS,
  BlockCellId,
  BlockCellMeta,
  getMasteryStatus,
  TOPICS,
} from "../lib/curriculum";
import { Icon } from "./Icons";

interface BlockModelGridProps {
  cellScores: Record<BlockCellId, number>;
  title?: string;
  subtitle?: string;
  onSelectTopic?: (topicId: number) => void;
  showLegend?: boolean;
}

const LEVELS: { level: 1 | 2 | 3 | 4; label: string; desc: string }[] = [
  { level: 1, label: "ระดับ 1 · คำสั่งเดี่ยว (Atom)", desc: "บรรทัดเดียว ตัวแปร เครื่องหมาย" },
  { level: 2, label: "ระดับ 2 · บล็อกคำสั่ง (Block)", desc: "กลุ่มคำสั่ง if/else, ลูป for/while" },
  { level: 3, label: "ระดับ 3 · ความสัมพันธ์ (Relation)", desc: "การเชื่อมตัวแปร พารามิเตอร์ return" },
  { level: 4, label: "ระดับ 4 · ภาพรวมโปรแกรม (Macro)", desc: "โครงสร้างรวมและเป้าหมายทั้งโปรแกรม" },
];

const DIMENSIONS: { dim: "T" | "E" | "F"; label: string; sub: string }[] = [
  { dim: "T", label: "โครงสร้างโค้ด (Text Surface)", sub: "เขียนอย่างไรตามไวยากรณ์" },
  { dim: "E", label: "การทำงานจริง (Execution)", sub: "ลำดับรันและค่าตัวแปร" },
  { dim: "F", label: "หน้าที่และเป้าหมาย (Function)", sub: "มีไว้ทำไม แก้ปัญหาอะไร" },
];

export function BlockModelGrid({
  cellScores,
  title = "แผนที่ความเข้าใจ 12 ช่อง (Block Model)",
  subtitle = "แสดงความเข้าใจแยกตามระดับของโค้ด 4 ระดับ × มิติความเข้าใจ 3 ด้าน (มีข้อความกำกับสถานะทุกช่อง)",
  onSelectTopic,
  showLegend = true,
}: BlockModelGridProps) {
  const [selectedCell, setSelectedCell] = useState<BlockCellMeta | null>(null);

  return (
    <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
            <Icon name="grid" size={20} className="text-[#0f766e]" />
            <span>{title}</span>
          </h3>
          <p className="text-[13px] font-semibold text-[#475b60] mt-0.5">{subtitle}</p>
        </div>

        {showLegend && (
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-[#d8efdc] text-[#14532d] border border-[#86efac] flex items-center gap-1">
              <Icon name="check" size={16} />
              <span>เก่ง 80% ขึ้นไป</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#fbeacb] text-[#5c3704] border border-[#fcd34d] flex items-center gap-1">
              <Icon name="star" size={16} />
              <span>กลาง 50–79%</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#f8d9d4] text-[#7d1d10] border border-[#fca5a5] flex items-center gap-1">
              <Icon name="bulb" size={16} />
              <span>ควรทบทวน ต่ำกว่า 50%</span>
            </span>
          </div>
        )}
      </div>

      {/* ตาราง 4 ระดับ x 3 มิติ = 12 ช่อง */}
      <div className="overflow-x-auto">
        <div className="min-w-[680px] flex flex-col gap-2.5">
          {/* Header มิติทั้ง 3 */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-3 bg-[#eef3f1] border border-[#cfe0dc] rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[13px] font-extrabold text-[#0b4f49]">
                ระดับโค้ด \ มิติความเข้าใจ
              </span>
              <span className="text-[12px] text-[#475b60]">คลิกที่ช่องเพื่อดูคำอธิบาย</span>
            </div>
            {DIMENSIONS.map((d) => (
              <div
                key={d.dim}
                className="col-span-3 bg-[#e3f1ee] border border-[#cfe0dc] rounded-xl p-2.5"
              >
                <div className="text-[13px] font-extrabold text-[#0b4f49]">{d.label}</div>
                <div className="text-[12px] text-[#475b60]">{d.sub}</div>
              </div>
            ))}
          </div>

          {/* แถวทั้ง 4 ระดับ */}
          {LEVELS.map((lv) => (
            <div key={lv.level} className="grid grid-cols-12 gap-2.5 items-stretch">
              <div className="col-span-3 bg-[#eef3f1] border border-[#cfe0dc] rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[13px] font-extrabold text-[#1b2a2f]">{lv.label}</span>
                <span className="text-[12px] text-[#475b60] mt-0.5">{lv.desc}</span>
              </div>

              {DIMENSIONS.map((d) => {
                const cellId = `${d.dim}${lv.level}` as BlockCellId;
                const meta = BLOCK_MODEL_CELLS.find((c) => c.id === cellId)!;
                const score = cellScores[cellId] ?? 50;
                const status = getMasteryStatus(score);
                const isSelected = selectedCell?.id === cellId;

                return (
                  <button
                    key={cellId}
                    type="button"
                    onClick={() => setSelectedCell(meta)}
                    style={{
                      backgroundColor: status.bgHex,
                      color: status.inkHex,
                    }}
                    className={`col-span-3 rounded-xl p-3 text-left border-2 transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#0b4f49] ring-2 ring-[#0f766e]/40"
                        : "border-black/10 hover:border-[#0b4f49]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-white/80 text-[#0b4f49] text-[12px] font-extrabold">
                        ช่อง {cellId}
                      </span>
                      <span className="text-[15px] font-extrabold">{score}%</span>
                    </div>

                    <div className="text-[14px] font-extrabold mt-1.5 leading-snug">
                      {meta.shortTitle}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-between text-[12px] font-bold">
                      <span className="flex items-center gap-1">
                        <Icon
                          name={
                            status.level === "good"
                              ? "check"
                              : status.level === "mid"
                              ? "star"
                              : "bulb"
                          }
                          size={14}
                        />
                        <span>{status.label}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* กล่องแสดงรายละเอียดเมื่อคลิกช่องใดช่องหนึ่ง */}
      {selectedCell && (
        <div className="bg-[#e3f1ee] border-2 border-[#0f766e] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0b4f49] text-white text-[13px] font-extrabold">
                ช่อง {selectedCell.id}
              </span>
              <span className="text-[15px] font-extrabold text-[#0b4f49]">
                {selectedCell.shortTitle} ({selectedCell.levelName} · {selectedCell.dimensionName})
              </span>
            </div>
            <p className="text-[14px] text-[#1b2a2f] mt-1">{selectedCell.description}</p>
            <p className="text-[13px] font-semibold text-[#475b60] mt-1">
              ตัวอย่างคำถาม: &ldquo;{selectedCell.exampleQuestion}&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSelectTopic && (
              <button
                type="button"
                onClick={() => onSelectTopic(selectedCell.relatedTopicId)}
                className="press-teal px-4 py-2 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Icon name="play" size={18} />
                <span>
                  ฝึกช่องนี้ใน{" "}
                  {TOPICS.find((t) => t.id === selectedCell.relatedTopicId)?.shortName}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              aria-label="ปิดรายละเอียดช่อง Block Model"
              className="press-secondary p-2 rounded-xl cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
