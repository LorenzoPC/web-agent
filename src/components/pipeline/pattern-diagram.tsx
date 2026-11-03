import { useId } from "react";
import type { PatternDiagram as Diagram, PatternNode } from "@/lib/mock-orchestration-data";

const NODE_RADIUS = 6;
const ARROW_GAP = 1.5;

/** Distance from a node's center to its outline along the unit vector (ux, uy). */
function outlineDistance(node: PatternNode, ux: number, uy: number) {
  if (node.kind !== "store") return NODE_RADIUS;
  const halfW = (node.w ?? 22) / 2;
  const halfH = (node.h ?? 14) / 2;
  return Math.min(
    ux === 0 ? Infinity : halfW / Math.abs(ux),
    uy === 0 ? Infinity : halfH / Math.abs(uy),
  );
}

/** Moves `node`'s center toward `toward` until it sits just outside the node's outline. */
function edgeEnd(node: PatternNode, toward: { x: number; y: number }, hasArrow: boolean) {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const d = outlineDistance(node, ux, uy) + (hasArrow ? ARROW_GAP : 0.5);
  return { x: node.x + ux * d, y: node.y + uy * d };
}

/** A small topology drawing of an orchestration pattern, on a 120 × 60 viewBox. */
export function PatternDiagram({ diagram, className }: { diagram: Diagram; className?: string }) {
  const markerId = useId();
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));

  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden="true">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 6 6"
          refX="6"
          refY="3"
          markerWidth="5"
          markerHeight="5"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L6,3 L0,6 z" className="fill-zinc-400 dark:fill-zinc-500" />
        </marker>
      </defs>

      {diagram.edges.map((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) return null;
        const arrow = edge.arrow ?? "end";

        // Bend sideways from the midpoint; reversing the edge flips the side, so a pair forms a loop.
        let control: { x: number; y: number } | null = null;
        if (edge.curve) {
          const len = Math.hypot(to.x - from.x, to.y - from.y);
          control = {
            x: (from.x + to.x) / 2 + (-(to.y - from.y) / len) * edge.curve,
            y: (from.y + to.y) / 2 + ((to.x - from.x) / len) * edge.curve,
          };
        }
        const start = edgeEnd(from, control ?? to, arrow === "both");
        const end = edgeEnd(to, control ?? from, arrow !== "none");
        const d = control
          ? `M${start.x},${start.y} Q${control.x},${control.y} ${end.x},${end.y}`
          : `M${start.x},${start.y} L${end.x},${end.y}`;

        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={d}
            fill="none"
            strokeWidth={1.25}
            className="stroke-zinc-400 dark:stroke-zinc-500"
            markerStart={arrow === "both" ? `url(#${markerId})` : undefined}
            markerEnd={arrow !== "none" ? `url(#${markerId})` : undefined}
          />
        );
      })}

      {diagram.nodes.map((node) =>
        node.kind === "store" ? (
          <rect
            key={node.id}
            x={node.x - (node.w ?? 22) / 2}
            y={node.y - (node.h ?? 14) / 2}
            width={node.w ?? 22}
            height={node.h ?? 14}
            rx={2}
            strokeWidth={1.25}
            className="fill-zinc-100 stroke-zinc-400 dark:fill-zinc-800 dark:stroke-zinc-500"
          />
        ) : (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            strokeWidth={1.25}
            className={
              node.kind === "lead"
                ? "fill-black stroke-black dark:fill-white dark:stroke-white"
                : "fill-white stroke-black dark:fill-zinc-950 dark:stroke-white"
            }
          />
        ),
      )}
    </svg>
  );
}
