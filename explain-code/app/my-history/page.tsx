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
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="clock" className="h-3.5 w-3.5" />
              บันทึกส่วนตัวของคุณ
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1e1e1c]">
              ประวัติการอธิบายโค้ดของฉัน
            </h1>
            <p className="mt-1 text-sm text-[#524f49]">
              ดูย้อนหลังและจัดการโค้ดทั้งหมดที่คุณเคยให้อธิบายไว้
            </p>
          </div>

          <Link
            href="/explain"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f3b2f] transition-colors"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            <span>+ อธิบายโค้ดใหม่</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5dfd3] bg-white p-10 text-center text-sm text-[#6e6a63]">
            กำลังโหลดประวัติการอธิบายโค้ด...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8d1c5] bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0ec] text-[#2a4d3e]">
              <Icon name="code" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#1e1e1c]">
              ยังไม่มีประวัติการอธิบายโค้ด
            </h2>
            <p className="mt-1 text-xs text-[#6e6a63]">
              เมื่อคุณล็อกอินและใช้งานหน้า &ldquo;อธิบายโค้ด&rdquo; ระบบจะบันทึกโค้ดและคำอธิบายไว้ที่นี่อัตโนมัติ
            </p>
            <Link
              href="/explain"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1f3b2f]"
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
                        ? "border-[#2a4d3e] bg-white shadow-xs"
                        : "border-[#e5dfd3] bg-white/80 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-[#e8f0ec] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2a4d3e]">
                        {item.language}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#6e6a63]">
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
                          className="rounded-lg p-1 text-[#991b1b] hover:bg-[#fef2f2] cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className="mt-2 line-clamp-2 overflow-hidden rounded-lg bg-[#1e1e1c] p-2.5 font-mono text-[11px] text-[#f8f8f2]">
                      {item.code_snippet}
                    </pre>
                    <p className="mt-2 line-clamp-2 text-xs text-[#524f49]">
                      {item.summary}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected Item Detail */}
            <div className="lg:col-span-7">
              {selectedItem && (
                <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-[#ece7dc] pb-4">
                    <div>
                      <span className="rounded-md bg-[#e8f0ec] px-2.5 py-1 text-xs font-bold uppercase text-[#2a4d3e]">
                        {selectedItem.language}
                      </span>
                      <p className="mt-1 text-xs text-[#6e6a63]">
                        บันทึกเมื่อ{" "}
                        {new Date(selectedItem.created_at).toLocaleString(
                          "th-TH"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedItem.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-xs font-bold text-[#991b1b] hover:bg-[#fee2e2] cursor-pointer"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      <span>ลบรายการนี้</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#524f49] mb-2">
                      โค้ดต้นฉบับ
                    </h3>
                    <pre className="overflow-x-auto rounded-xl bg-[#1e1e1c] p-4 font-mono text-xs leading-relaxed text-[#f8f8f2]">
                      {selectedItem.code_snippet}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#524f49] mb-1.5">
                      สรุปภาพรวม
                    </h3>
                    <p className="text-sm leading-relaxed text-[#1e1e1c]">
                      {selectedItem.summary}
                    </p>
                  </div>

                  {Array.isArray(selectedItem.line_by_line) &&
                    selectedItem.line_by_line.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#524f49] mb-2">
                          คำอธิบายทีละบรรทัด
                        </h3>
                        <div className="space-y-2">
                          {selectedItem.line_by_line.map((line, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-[#ece7dc] bg-[#faf8f4] p-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-[#2a4d3e] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                  L{line.lineNumber}
                                </span>
                                <code className="font-mono text-xs font-semibold text-[#1e1e1c]">
                                  {line.code}
                                </code>
                              </div>
                              <p className="mt-1 pl-8 text-xs text-[#524f49]">
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
