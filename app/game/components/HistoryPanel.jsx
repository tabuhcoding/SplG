const ICONS = [
  [/lấy chip/, "🪙"],
  [/mua thẻ/, "💎"],
  [/giữ thẻ/, "🔖"],
  [/quý tộc/, "👑"],
  [/thắng/, "🏆"],
  [/hoàn tác/i, "↩︎"],
];

function iconFor(line) {
  return ICONS.find(([pattern]) => pattern.test(line))?.[1] ?? "•";
}

export function HistoryPanel({ history = [] }) {
  const [latest, ...rest] = history;

  return (
    <section className="history" aria-label="Diễn biến">
      <div className="history-head">Diễn biến</div>
      {latest ? (
        <p className="history-latest" key={latest}>
          <span aria-hidden="true">{iconFor(latest)}</span>
          {latest}
        </p>
      ) : null}
      <div className="history-list">
        {rest.map((item, index) => (
          <p key={`${item}-${index}`}>
            <span aria-hidden="true">{iconFor(item)}</span>
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
