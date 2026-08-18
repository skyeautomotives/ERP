type DayValue = { day_date: string; value: number };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHART_WIDTH = 700;
const CHART_HEIGHT = 200;
const BAR_AREA_HEIGHT = 160;

export function WeeklyBarChart({
  title,
  thisWeek,
  lastWeek,
}: {
  title: string;
  thisWeek: DayValue[];
  lastWeek: DayValue[];
}) {
  const max = Math.max(1, ...thisWeek.map((d) => d.value), ...lastWeek.map((d) => d.value));
  const dayWidth = CHART_WIDTH / 7;
  const barWidth = dayWidth * 0.32;
  const gap = dayWidth * 0.06;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-blue-600" /> This week
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-gray-300 dark:bg-gray-700" /> Last week
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="mt-2 w-full" role="img" aria-label={title}>
        {thisWeek.map((d, i) => {
          const prev = lastWeek[i]?.value ?? 0;
          const x = i * dayWidth + dayWidth / 2 - barWidth - gap / 2;
          const thisH = (d.value / max) * BAR_AREA_HEIGHT;
          const prevH = (prev / max) * BAR_AREA_HEIGHT;
          return (
            <g key={d.day_date}>
              <rect
                x={x}
                y={BAR_AREA_HEIGHT - thisH}
                width={barWidth}
                height={thisH}
                className="fill-blue-600"
              >
                <title>{`This week ${DAY_LABELS[i]}: ${d.value.toFixed(2)}`}</title>
              </rect>
              <rect
                x={x + barWidth + gap}
                y={BAR_AREA_HEIGHT - prevH}
                width={barWidth}
                height={prevH}
                className="fill-gray-300 dark:fill-gray-700"
              >
                <title>{`Last week ${DAY_LABELS[i]}: ${prev.toFixed(2)}`}</title>
              </rect>
              <text
                x={i * dayWidth + dayWidth / 2}
                y={BAR_AREA_HEIGHT + 20}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-[11px]"
              >
                {DAY_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
