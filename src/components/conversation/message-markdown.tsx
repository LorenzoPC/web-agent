import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const MARKER = "marker:text-zinc-400 dark:marker:text-zinc-600";

// Sized for the panel's text-sm replies. Headings start at h4 because the panel
// already uses h2 (Conversation) and h3 (Key points, Flow).
const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-2">{children}</p>,
  h1: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold text-black dark:text-zinc-50">{children}</h4>,
  h2: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold text-black dark:text-zinc-50">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1.5 mt-3 font-semibold text-black dark:text-zinc-50">{children}</h5>,
  h4: ({ children }) => <h5 className="mb-1.5 mt-3 font-semibold text-black dark:text-zinc-50">{children}</h5>,
  h5: ({ children }) => <h6 className="mb-1 mt-3 font-medium text-black dark:text-zinc-50">{children}</h6>,
  h6: ({ children }) => <h6 className="mb-1 mt-3 font-medium text-black dark:text-zinc-50">{children}</h6>,
  ul: ({ children, className }) => (
    <ul className={`my-2 space-y-1 ${className?.includes("contains-task-list") ? "list-none pl-1" : `list-disc pl-5 ${MARKER}`}`}>
      {children}
    </ul>
  ),
  ol: ({ children, start }) => (
    <ol start={start} className={`my-2 list-decimal space-y-1 pl-5 ${MARKER}`}>
      {children}
    </ol>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-zinc-200 pl-3 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-800" />,
  // The [&_code] overrides undo the inline-code chip for code inside a block.
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs leading-relaxed dark:bg-zinc-900 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-xs">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code className={`rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.8125rem] dark:bg-zinc-800 ${className ?? ""}`}>
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th
      style={style}
      className="border-b border-zinc-200 px-2 py-1.5 text-left font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-b border-zinc-100 px-2 py-1.5 align-top dark:border-zinc-800">
      {children}
    </td>
  ),
  // Images aren't fetched: a reply shaped by a search result or document could
  // embed an image URL that carries the conversation off to a third party.
  img: ({ alt }) => <span className="text-zinc-400 dark:text-zinc-600">[{alt || "image"}]</span>,
};

/** An agent reply rendered as GitHub-flavored Markdown. Raw HTML in the reply is shown as text, not rendered. */
export function MessageMarkdown({ text }: { text: string }) {
  return (
    <div className="mt-1 break-words text-sm text-zinc-800 dark:text-zinc-200 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {text}
      </Markdown>
    </div>
  );
}
