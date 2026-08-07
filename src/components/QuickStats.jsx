// The row of numbers people screenshot.
//
// Every value is counted locally and exactly — no model involved — which is
// why this can sit at the top of the report as plain fact while everything
// below it is hedged interpretation. Numbers you can verify buy the credit
// that the softer sections spend.
export default function QuickStats({ stats = [] }) {
  if (!stats.length) return null;

  return (
    <section aria-label="Conversation at a glance">
      <p className="tech-label">At a glance</p>
      {/* Two up on a phone. Four of these across a 375px screen would put
          "Longest silence" on three lines and its date hint on two more.
          Separate bordered cells rather than a one-pixel-gap grid: the grid
          trick leaves a phantom filled cell whenever the count does not divide
          evenly by the column count, which it does at three of four widths. */}
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.key} className="rounded-lg border border-line bg-paper p-4">
            <dt className="text-xs font-medium text-ash">{stat.label}</dt>
            <dd className="mt-1 text-xl font-semibold tracking-tight text-ink">{stat.value}</dd>
            {stat.hint && <p className="mt-0.5 text-xs leading-5 text-ash">{stat.hint}</p>}
          </div>
        ))}
      </dl>
    </section>
  );
}
