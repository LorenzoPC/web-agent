// Mock data for the Builder's orchestration patterns: six ways the agents in a
// flow can coordinate. Draft copy only. The pipeline runner still executes
// steps in order, whichever pattern is in use.
//
// These differ from MOCK_FLOW_PATTERNS (/patterns), which are linear chains of
// task slots. An orchestration pattern is a topology: who leads, who talks to
// whom, and where the loops are.

export interface PatternNode {
  id: string;
  x: number;
  y: number;
  /** "lead" is the agent in charge (drawn filled); "store" is shared state, not an agent. */
  kind: "lead" | "agent" | "store";
  /** Store size in viewBox units. Defaults to 22 × 14. */
  w?: number;
  h?: number;
}

export interface PatternEdge {
  from: string;
  to: string;
  /** Defaults to "end". */
  arrow?: "end" | "both" | "none";
  /** Bends the edge sideways by this many units. Two opposite edges with the same curve form a loop. */
  curve?: number;
}

/** Laid out on a 120 × 60 viewBox. */
export interface PatternDiagram {
  nodes: PatternNode[];
  edges: PatternEdge[];
}

export interface MockOrchestrationPattern {
  id: string;
  name: string;
  summary: string;
  description: string;
  agents: string;
  flow: string[];
  bestFor: string;
  watchOut: string;
  cost: string;
  speed: string;
  diagram: PatternDiagram;
}

export const MOCK_ORCHESTRATION_PATTERNS: MockOrchestrationPattern[] = [
  {
    id: "manager-worker",
    name: "Manager-worker",
    summary: "A manager splits the job, workers handle the parts in parallel, the manager merges.",
    description:
      "One manager agent breaks the task into subtasks and hands each to a worker. Workers run in parallel and report back, and the manager checks and merges their results.",
    agents: "1 manager + N workers",
    flow: [
      "Manager splits the task into subtasks",
      "Workers run their subtasks in parallel",
      "Manager reviews and merges the results",
    ],
    bestFor: "Big tasks that split into independent parts, like profiling 10 competitors.",
    watchOut:
      "The manager is a bottleneck and a single point of failure. A bad split wastes every worker's run.",
    cost: "Medium",
    speed: "Fast (parallel)",
    diagram: {
      nodes: [
        { id: "manager", x: 60, y: 10, kind: "lead" },
        { id: "w1", x: 20, y: 48, kind: "agent" },
        { id: "w2", x: 60, y: 48, kind: "agent" },
        { id: "w3", x: 100, y: 48, kind: "agent" },
      ],
      edges: [
        { from: "manager", to: "w1", arrow: "both" },
        { from: "manager", to: "w2", arrow: "both" },
        { from: "manager", to: "w3", arrow: "both" },
      ],
    },
  },
  {
    id: "critic-loop",
    name: "Critic / red-team loop",
    summary: "A maker drafts, a critic attacks the draft, and they loop until it passes.",
    description:
      "A generator produces a draft and a critic reviews it against the goals, hunting for errors, risks and weak spots. The generator revises until the critic approves or the loop hits its round limit.",
    agents: "1 generator + 1 critic",
    flow: [
      "Generator writes a draft",
      "Critic reviews it and lists the issues",
      "Generator revises, until approved or out of rounds",
    ],
    bestFor: "Quality-critical output: customer-facing copy, code, compliance checks.",
    watchOut:
      "Each round adds cost and time. Set a round limit, and give the critic clear pass criteria or it never approves.",
    cost: "Medium",
    speed: "Slower (rounds)",
    diagram: {
      nodes: [
        { id: "generator", x: 32, y: 30, kind: "lead" },
        { id: "critic", x: 88, y: 30, kind: "agent" },
      ],
      edges: [
        { from: "generator", to: "critic", curve: -16 },
        { from: "critic", to: "generator", curve: -16 },
      ],
    },
  },
  {
    id: "planner-executor",
    name: "Planner-executor",
    summary: "A planner writes a step-by-step plan, an executor carries it out and reports back.",
    description:
      "A planner, usually a strong reasoning model, turns the goal into an ordered plan. An executor works through it with tools, and the planner re-plans when a step fails or new facts appear.",
    agents: "1 planner + 1 executor",
    flow: [
      "Planner turns the goal into ordered steps",
      "Executor runs each step with its tools",
      "Planner re-plans on failure or new facts",
    ],
    bestFor: "Multi-step tasks with tools, like booking travel or migrating a dataset.",
    watchOut:
      "Plans go stale fast. Without re-planning, the executor follows a broken plan to the end.",
    cost: "Low to medium",
    speed: "Medium",
    diagram: {
      nodes: [
        { id: "planner", x: 18, y: 30, kind: "lead" },
        { id: "executor", x: 64, y: 30, kind: "agent" },
        { id: "tools", x: 104, y: 30, kind: "store" },
      ],
      edges: [
        { from: "planner", to: "executor", curve: -12 },
        { from: "executor", to: "planner", curve: -12 },
        { from: "executor", to: "tools", arrow: "both" },
      ],
    },
  },
  {
    id: "blackboard",
    name: "Blackboard architecture",
    summary: "Specialists read and write a shared board, adding what they know until it's solved.",
    description:
      "Agents share a workspace, the blackboard, holding the problem and partial results. Each specialist adds what it can, and a controller decides who acts next and when the solution is complete.",
    agents: "1 controller + N specialists",
    flow: [
      "The problem is posted to the blackboard",
      "Specialists add facts and partial answers",
      "Controller picks who acts next, until solved",
    ],
    bestFor: "Messy problems with no fixed order, like incident diagnosis or fraud investigation.",
    watchOut:
      "Hard to trace who changed what. Needs a solid shared store and clear stop conditions.",
    cost: "High",
    speed: "Variable",
    diagram: {
      nodes: [
        { id: "board", x: 60, y: 24, kind: "store", w: 34, h: 18 },
        { id: "s1", x: 14, y: 10, kind: "agent" },
        { id: "s2", x: 106, y: 10, kind: "agent" },
        { id: "s3", x: 14, y: 46, kind: "agent" },
        { id: "s4", x: 106, y: 46, kind: "agent" },
        { id: "controller", x: 60, y: 51, kind: "lead" },
      ],
      edges: [
        { from: "s1", to: "board", arrow: "both" },
        { from: "s2", to: "board", arrow: "both" },
        { from: "s3", to: "board", arrow: "both" },
        { from: "s4", to: "board", arrow: "both" },
        { from: "controller", to: "board", arrow: "both" },
      ],
    },
  },
  {
    id: "debate",
    name: "Debate & deliberation",
    summary: "Agents argue opposing positions over rounds, and a judge weighs them to decide.",
    description:
      "Two or more agents take different positions and argue over several rounds, rebutting each other. A judge agent weighs the arguments and gives its decision with the reasoning.",
    agents: "2 to 4 debaters + 1 judge",
    flow: [
      "Debaters state their opening positions",
      "They rebut each other over set rounds",
      "Judge weighs the arguments and decides",
    ],
    bestFor: "Judgment calls with real trade-offs: vendor choice, risk assessment, strategy.",
    watchOut:
      "Costly, since every round runs every debater. Debaters on the same model can agree too easily.",
    cost: "High",
    speed: "Slow",
    diagram: {
      nodes: [
        { id: "d1", x: 20, y: 16, kind: "agent" },
        { id: "d2", x: 100, y: 16, kind: "agent" },
        { id: "judge", x: 60, y: 48, kind: "lead" },
      ],
      edges: [
        { from: "d1", to: "d2", curve: -12 },
        { from: "d2", to: "d1", curve: -12 },
        { from: "d1", to: "judge" },
        { from: "d2", to: "judge" },
      ],
    },
  },
  {
    id: "swarm",
    name: "Swarm (peer to peer)",
    summary: "Peer agents with no boss hand work to each other and converge on a result.",
    description:
      "There is no central controller. Peers follow simple local rules, pass tasks and findings directly to one another, and hand off when another peer is better suited. The result emerges from many small exchanges.",
    agents: "N peers, no leader",
    flow: [
      "Any peer picks up the incoming task",
      "Peers hand off or share findings directly",
      "Work converges when the peers agree it's done",
    ],
    bestFor: "Broad exploration and routing at scale, like support triage across many skills.",
    watchOut:
      "Hardest to predict, debug and cap in cost. Needs hop limits so tasks don't bounce forever.",
    cost: "Unpredictable",
    speed: "Variable",
    diagram: {
      nodes: [
        { id: "a", x: 60, y: 8, kind: "agent" },
        { id: "b", x: 102, y: 24, kind: "agent" },
        { id: "c", x: 86, y: 52, kind: "agent" },
        { id: "d", x: 34, y: 52, kind: "agent" },
        { id: "e", x: 18, y: 24, kind: "agent" },
      ],
      edges: [
        { from: "a", to: "b", arrow: "none" },
        { from: "b", to: "c", arrow: "none" },
        { from: "c", to: "d", arrow: "none" },
        { from: "d", to: "e", arrow: "none" },
        { from: "e", to: "a", arrow: "none" },
        { from: "a", to: "d", arrow: "none" },
        { from: "b", to: "d", arrow: "none" },
        { from: "e", to: "c", arrow: "none" },
      ],
    },
  },
];
