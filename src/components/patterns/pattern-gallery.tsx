"use client";

import { useState } from "react";
import { CreateNewCard } from "@/components/ui/create-new-card";
import type { MockFlowPattern } from "@/lib/mock-data";
import { CreatePatternModal } from "./create-pattern-modal";
import { PatternCard } from "./pattern-card";

export function PatternGallery({ patterns: initialPatterns }: { patterns: MockFlowPattern[] }) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCreate(pattern: MockFlowPattern) {
    setPatterns((prev) => [pattern, ...prev]);
    setCreating(false);
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CreateNewCard label="Create new pattern" onClick={() => setCreating(true)} />
        {patterns.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            expanded={expandedIds.has(pattern.id)}
            onToggle={() => toggle(pattern.id)}
          />
        ))}
      </div>
      {creating && <CreatePatternModal onCreate={handleCreate} onClose={() => setCreating(false)} />}
    </>
  );
}
