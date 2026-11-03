/** Landing section title in the display font, with an optional one-line description. `onDark` is for the navy band. */
export function LandingHeading({
  title,
  description,
  onDark = false,
}: {
  title: string;
  description?: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2
        className={`font-display text-3xl font-bold tracking-tight lg:text-4xl ${
          onDark ? "text-white" : "text-steel-950 dark:text-white"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={onDark ? "text-brand-200" : "text-steel-600 dark:text-steel-300"}>{description}</p>
      )}
    </div>
  );
}
