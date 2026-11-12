"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DungeonRunScreen } from "../components/DungeonRunScreen";

export default function CodeDepthsPage() {
  const router = useRouter();

  return (
    <DungeonRunScreen
      onBackToPortal={() => {
        router.push("/");
      }}
      onRecordAttempt={(summary) => {
        console.log("Dungeon attempt recorded:", summary);
      }}
    />
  );
}
