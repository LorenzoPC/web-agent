export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "agent";
      /** Captured per turn — the picker can switch agents mid-conversation. */
      agentName: string;
      text: string;
      status: "done" | "error" | "stopped";
      cost?: number;
    };

/** Turns as "Speaker: text" blocks. Failed/stopped replies are left out — they aren't part of the exchange. */
export function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === "user" || m.status === "done")
    .map((m) => `${m.role === "user" ? "User" : m.agentName}: ${m.text}`)
    .join("\n\n");
}
