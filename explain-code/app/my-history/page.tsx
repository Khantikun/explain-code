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
    <div className="min-h-screen bg-[#faf8f4] dark:bg-[#091312] text-[#1e1e1c] dark:text-white">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] dark:bg-[#0c2420] dark:border dark:border-[#5eead4]/30 px-3 py-1 text-xs font-bold text-[#2a4d3e] dark:text-[#5eead4]">
              <Icon name="clock" className="h-3.5 w-3.5" />
              บันทึกส่วนตัวของคุณ
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1e1e1c] dark:text-white">
              ประวัติการอธิบายโค้ดของฉัน
            </h1>
            <p className="mt-1 text-sm text-[#524f49] dark:text-[#e2e8f0]">
              ดูย้อนหลังและจัดการโค้ดทั้งหมดที่คุณเคยให้อธิบายไว้
            </p>
          </div>

          <Link
            href="/explain"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] dark:bg-[#0f766e] dark:hover:bg-[#0d9488] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f3b2f] transition-colors"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            <span>+ อธิบายโค้ดใหม่</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5dfd3] dark:border-white/15 bg-white dark:bg-[#12221f] p-10 text-center text-sm text-[#6e6a63] dark:text-[#e2e8f0] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            กำลังโหลดประวัติการอธิบายโค้ด...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8d1c5] dark:border-white/20 bg-white dark:bg-[#12221f]/70 p-12 text-center dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0ec] dark:bg-[#0c2420] dark:border dark:border-[#5eead4]/30 text-[#2a4d3e] dark:text-[#5eead4]">
              <Icon name="code" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#1e1e1c] dark:text-white">
              ยังไม่มีประวัติการอธิบายโค้ด
            </h2>
            <p className="mt-1 text-xs text-[#6e6a63] dark:text-[#e2e8f0]">
              เมื่อคุณล็อกอินและใช้งานหน้า &ldquo;อธิบายโค้ด&rdquo; ระบบจะบันทึกโค้ดและคำอธิบายไว้ที่นี่อัตโนมัติ
            </p>
            <Link
              href="/explain"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] dark:bg-[#0f766e] dark:hover:bg-[#0d9488] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1f3b2f]"
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
                        ? "border-[#2a4d3e] dark:border-[#5eead4] bg-white dark:bg-[#12221f] shadow-xs dark:shadow-md"
                        : "border-[#e5dfd3] dark:border-white/15 bg-white/80 dark:bg-[#0b1614] hover:bg-white dark:hover:bg-[#12221f]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-[#e8f0ec] dark:bg-[#0c2420] dark:border dark:border-[#5eead4]/30 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2a4d3e] dark:text-[#5eead4]">
                        {item.language}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#6e6a63] dark:text-[#cbd5e1]">
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
                          className="rounded-lg p-1 text-[#991b1b] dark:text-[#f87171] hover:bg-[#fef2f2] dark:hover:bg-[#451212]/40 cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className="mt-2 line-clamp-2 overflow-hidden rounded-lg bg-[#1e1e1c] dark:bg-[#07110f] dark:border dark:border-white/10 p-2.5 font-mono text-[11px] text-[#f8f8f2] dark:text-white">
                      {item.code_snippet}
                    </pre>
                    <p className="mt-2 line-clamp-2 text-xs text-[#524f49] dark:text-[#e2e8f0]">
                      {item.summary}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected Item Detail */}
            <div className="lg:col-span-7">
              {selectedItem && (
                <div className="rounded-2xl border border-[#e5dfd3] dark:border-white/15 bg-white dark:bg-[#12221f] p-6 shadow-xs dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] space-y-5">
                  <div className="flex items-center justify-between border-b border-[#ece7dc] dark:border-white/15 pb-4">
                    <div>
                      <span className="rounded-md bg-[#e8f0ec] dark:bg-[#0c2420] dark:border dark:border-[#5eead4]/30 px-2.5 py-1 text-xs font-bold uppercase text-[#2a4d3e] dark:text-[#5eead4]">
                        {selectedItem.language}
                      </span>
                      <p className="mt-1 text-xs text-[#6e6a63] dark:text-[#cbd5e1]">
                        บันทึกเมื่อ{" "}
                        {new Date(selectedItem.created_at).toLocaleString(
                          "th-TH"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedItem.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#fecaca] dark:border-[#f87171]/40 bg-[#fef2f2] dark:bg-[#451212]/40 px-3 py-1.5 text-xs font-bold text-[#991b1b] dark:text-[#fca5a5] hover:bg-[#fee2e2] dark:hover:bg-[#451212]/60 cursor-pointer"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      <span>ลบรายการนี้</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#524f49] dark:text-[#e2e8f0] mb-2">
                      โค้ดต้นฉบับ
                    </h3>
                    <pre className="overflow-x-auto rounded-xl bg-[#1e1e1c] dark:bg-[#07110f] dark:border dark:border-white/15 p-4 font-mono text-xs leading-relaxed text-[#f8f8f2] dark:text-white">
                      {selectedItem.code_snippet}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#524f49] dark:text-[#e2e8f0] mb-1.5">
                      สรุปภาพรวม
                    </h3>
                    <p className="text-sm leading-relaxed text-[#1e1e1c] dark:text-[#f1f5f9]">
                      {selectedItem.summary}
                    </p>
                  </div>

                  {Array.isArray(selectedItem.line_by_line) &&
                    selectedItem.line_by_line.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#524f49] dark:text-[#e2e8f0] mb-2">
                          คำอธิบายทีละบรรทัด
                        </h3>
                        <div className="space-y-2.5">
                          {selectedItem.line_by_line.map((line, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-[#ece7dc] dark:border-white/20 bg-[#faf8f4] dark:bg-[#0a1513] p-3.5 transition-all dark:hover:border-[#5eead4]/60 dark:hover:bg-[#0e1d1a] dark:shadow-2xs"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md bg-[#2a4d3e] dark:bg-[#0f766e] dark:border dark:border-[#5eead4]/40 px-1.5 font-mono text-[11px] font-bold text-white shadow-2xs">
                                  L{line.lineNumber}
                                </span>
                                <div className="flex-1 overflow-x-auto rounded-lg bg-black/5 dark:bg-black/50 px-2.5 py-1 border border-black/5 dark:border-white/10">
                                  <code className="font-mono text-xs font-semibold text-[#1e1e1c] dark:text-white">
                                    {line.code}
                                  </code>
                                </div>
                              </div>
                              <p className="mt-2 pl-9 text-xs leading-relaxed text-[#524f49] dark:text-[#e2e8f0]">
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
