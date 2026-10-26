// "Ask a feature" (nav → right-hand panel): six prompts asked one at a time,
// then a review. Requests aren't persisted or sent anywhere yet; the panel
// keeps them in component state, and the Markdown brief is the way out.

export type FeatureRequestFieldId = "need" | "context" | "expected" | "available" | "missing" | "approach";

export interface FeatureRequestField {
  id: FeatureRequestFieldId;
  /** Short label for the progress bar, the review and the Markdown headings. */
  title: string;
  question: string;
  hint: string;
  placeholder: string;
  required?: boolean;
}

/** The prompts, in the order they're asked. Only the need is required. */
export const FEATURE_REQUEST_FIELDS: FeatureRequestField[] = [
  {
    id: "need",
    title: "Need",
    question: "What do you need?",
    hint: "Describe the feature in a sentence or two, and the problem it solves.",
    placeholder: "e.g. A weekly digest of failed agent runs, grouped by business unit.",
    required: true,
  },
  {
    id: "context",
    title: "Context",
    question: "What's the context?",
    hint: "Who would use it, when, and what are they trying to get done at that moment?",
    placeholder: "e.g. Monday ops review: I scan last week's failures before deciding what to fix first.",
  },
  {
    id: "expected",
    title: "Expected information",
    question: "What information do you expect to get?",
    hint: "What it should show or produce: a number, a list, a draft, an alert…",
    placeholder: "e.g. Failures per unit, the top three error types, and a link to each failed run.",
  },
  {
    id: "available",
    title: "Information we have",
    question: "What information do we already have?",
    hint: "Data, screens, agents or tools that already hold part of the answer.",
    placeholder: "e.g. Run history with status and cost, and the business-unit pools in the Marketplace.",
  },
  {
    id: "missing",
    title: "What's missing",
    question: "What's missing?",
    hint: "Data we don't collect yet, an integration we lack, a rule nobody has decided.",
    placeholder: "e.g. Runs aren't tagged with a business unit, and errors aren't categorized.",
  },
  {
    id: "approach",
    title: "How it could work",
    question: "How could it work?",
    hint: "A rough sketch is fine: the steps, a screen, or an agent doing it for you.",
    placeholder: "e.g. An agent runs every Monday at 8am, summarizes failures and posts them to the newsfeed.",
  },
];

export type FeatureRequestAnswers = Record<FeatureRequestFieldId, string>;

export const EMPTY_FEATURE_ANSWERS = Object.fromEntries(
  FEATURE_REQUEST_FIELDS.map((field) => [field.id, ""]),
) as FeatureRequestAnswers;

export interface FeatureRequest {
  id: string;
  title: string;
  answers: FeatureRequestAnswers;
  requestedBy: string;
  /** Nav label of the page the request was submitted from, e.g. "Dashboard". */
  page: string;
  createdAt: string;
}

export function answeredCount(answers: FeatureRequestAnswers): number {
  return FEATURE_REQUEST_FIELDS.filter((field) => answers[field.id].trim()).length;
}

/** First line of the need, trimmed to a headline. */
export function featureRequestTitle(need: string): string {
  const line = need.trim().split("\n")[0].trim();
  return line.length > 80 ? `${line.slice(0, 79).trimEnd()}…` : line;
}

/** Brief for pasting into an issue tracker, until requests are sent somewhere. */
export function featureRequestMarkdown(request: FeatureRequest): string {
  const sections = FEATURE_REQUEST_FIELDS.map(
    (field) => `### ${field.title}\n\n${request.answers[field.id].trim() || "_Not answered_"}`,
  );
  return [
    `## ${request.title}`,
    `Requested by ${request.requestedBy} from ${request.page} on ${request.createdAt.slice(0, 10)}`,
    ...sections,
  ].join("\n\n");
}
