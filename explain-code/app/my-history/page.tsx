"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import { CodeExplanation } from "../lib/supabase";
import {
  loadLocalExplanationsHistory,
  removeLocalExplanationHistory,
} from "../lib/lms-data";

export default function MyHistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [items, setItems] = useState<CodeExplanation[]>([]);
  const [selectedItem, setSelectedItem] = useState<CodeExplanation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const current = getClientSession();
    if (!current) {
      router.replace("/login?redirect=/my-history");
      return;
    }
    setSession(current);

    const fetchHistory = async () => {
      setIsLoading(true);
      const localItems = loadLocalExplanationsHistory(current.userId);
      try {
        const res = await fetch(
          `/api/history?userId=${encodeURIComponent(current.userId)}`
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.items) && data.items.length > 0) {
          const merged = [
            ...data.items,
            ...localItems.filter(
              (li) => !data.items.some((di: any) => di.id === li.id)
            ),
          ];
          setItems(merged);
          setSelectedItem(merged[0] || null);
        } else {
          setItems(localItems);
          setSelectedItem(localItems[0] || null);
        }
      } catch {
        setItems(localItems);
        setSelectedItem(localItems[0] || null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!session) return;
    removeLocalExplanationHistory(id);
    const remaining = items.filter((item) => item.id !== id);
    setItems(remaining);
    if (selectedItem?.id === id) {
      setSelectedItem(remaining[0] || null);
    }

    try {
      await fetch(
        `/api/history?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(
          session.userId
        )}`,
        { method: "DELETE" }
      );
    } catch {
      // ignore network error
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3d395a] bg-[#1c1b2b] px-3 py-1 text-xs font-bold text-[#f6c945]">
              <Icon name="clock" className="h-3.5 w-3.5" />
              บันทึกส่วนตัวของคุณ
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#f4efe6]">
              ประวัติการอธิบายโค้ดของฉัน
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
              ดูย้อนหลังและจัดการโค้ดทั้งหมดที่คุณเคยให้อธิบายไว้
            </p>
          </div>

          <Link
            href="/explain"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2fbf71] px-4 py-2.5 text-xs font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] transition-colors whitespace-nowrap"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            <span>+ อธิบายโค้ดใหม่</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-10 text-center text-sm text-[#9a93ad] shadow-lg">
            กำลังโหลดประวัติการอธิบายโค้ด...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3d395a] bg-[#141220] p-12 text-center shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3d395a] bg-[#1c1b2b] text-[#f6c945]">
              <Icon name="code" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#f4efe6]">
              ยังไม่มีประวัติการอธิบายโค้ด
            </h2>
            <p className="mt-1 text-xs text-[#9a93ad]">
              เมื่อคุณล็อกอินและใช้งานหน้า &ldquo;อธิบายโค้ด&rdquo; ระบบจะบันทึกโค้ดและคำอธิบายไว้ที่นี่อัตโนมัติ
            </p>
            <Link
              href="/explain"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2fbf71] px-4 py-2.5 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] whitespace-nowrap"
            >
              ไปที่หน้าอธิบายโค้ด →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* List of saved items */}
            <div className="lg:col-span-5 space-y-3">
              {items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-[#f6c945] bg-[#1c1b2b] shadow-lg"
                        : "border-[#2f2d45] bg-[#141220] hover:border-[#3d395a] hover:bg-[#1c1b2b]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md border border-[#9b5de5]/40 bg-[#5a2d91]/30 px-2 py-0.5 text-[10px] font-bold uppercase text-[#ffe27a]">
                        {item.language}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#9a93ad]">
                          {new Date(item.created_at).toLocaleString("th-TH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="rounded-lg p-1 text-[#fca5a5] hover:bg-[#2d141c] cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className="mt-2 line-clamp-2 overflow-hidden rounded-lg border border-[#2f2d45] bg-[#120f1c] p-2.5 font-mono text-[11px] text-[#f4efe6]">
                      {item.code_snippet}
                    </pre>
                    <p className="mt-2 line-clamp-2 text-xs text-[#c4bdd6]">
                      {item.summary}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected Item Detail */}
            <div className="lg:col-span-7">
              {selectedItem && (
                <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 shadow-lg space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f2d45] pb-4">
                    <div>
                      <span className="rounded-md border border-[#9b5de5]/40 bg-[#5a2d91]/30 px-2.5 py-1 text-xs font-bold uppercase text-[#ffe27a]">
                        {selectedItem.language}
                      </span>
                      <p className="mt-1.5 text-xs text-[#9a93ad]">
                        บันทึกเมื่อ{" "}
                        {new Date(selectedItem.created_at).toLocaleString(
                          "th-TH"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedItem.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#c0283a]/50 bg-[#2d141c] px-3 py-1.5 text-xs font-bold text-[#fca5a5] hover:bg-[#3d1a24] cursor-pointer whitespace-nowrap"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      <span>ลบรายการนี้</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#9a93ad] mb-2">
                      โค้ดต้นฉบับ
                    </h3>
                    <pre className="overflow-x-auto rounded-xl border border-[#2f2d45] bg-[#120f1c] p-4 font-mono text-xs leading-relaxed text-[#f4efe6]">
                      {selectedItem.code_snippet}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#9a93ad] mb-1.5">
                      สรุปภาพรวม
                    </h3>
                    <p className="text-sm leading-relaxed text-[#e8e1cf]">
                      {selectedItem.summary}
                    </p>
                  </div>

                  {Array.isArray(selectedItem.line_by_line) &&
                    selectedItem.line_by_line.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#9a93ad] mb-2">
                          คำอธิบายทีละบรรทัด
                        </h3>
                        <div className="space-y-2.5">
                          {selectedItem.line_by_line.map((line, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-3.5 transition-all hover:border-[#9b5de5]"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md border border-[#9b5de5]/50 bg-[#5a2d91] px-1.5 font-mono text-[11px] font-bold text-[#ffe27a]">
                                  L{line.lineNumber}
                                </span>
                                <div className="flex-1 overflow-x-auto rounded-lg border border-[#2f2d45] bg-[#120f1c] px-2.5 py-1">
                                  <code className="font-mono text-xs font-semibold text-[#f4efe6]">
                                    {line.code}
                                  </code>
                                </div>
                              </div>
                              <p className="mt-2 pl-9 text-xs leading-relaxed text-[#c4bdd6]">
                                → {line.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
