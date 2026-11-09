"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import cards from "../../json/card.json";
import { GEM_HEX, GEM_LABELS, GEM_ORDER } from "../game/config";
import { GEM_STONE, WHEEL, bonusProfile, costTotal, levelSummary, percent, previousOnWheel } from "./analyze";

const LEVELS = [
  { id: 0, label: "Cả bộ" },
  { id: 1, label: "Cấp 1" },
  { id: 2, label: "Cấp 2" },
  { id: 3, label: "Cấp 3" },
];

function GemName({ color, stone = false }) {
  return (
    <span className="deck-gem-name">
      <i className="deck-swatch" style={{ background: GEM_HEX[color] }} />
      <span>
        {GEM_LABELS[color]}
        {stone ? <small>{GEM_STONE[color]}</small> : null}
      </span>
    </span>
  );
}

function formatLeaders(profile) {
  return profile.leaders.map((color) => GEM_LABELS[color].toLowerCase()).join(" và ");
}

export function StatsBoard() {
  const [level, setLevel] = useState(0);
  const [bonus, setBonus] = useState("red");

  const byLevel = useMemo(() => [0, 1, 2, 3].map((id) => levelSummary(cards, id)), []);
  const current = byLevel[level];
  const selected = current.profiles.find((profile) => profile.bonus === bonus);
  const maxPip = Math.max(1, ...current.profiles.flatMap((profile) => GEM_ORDER.map((color) => profile.pips[color])));
  const selectedCards = useMemo(
    () =>
      cards
        .filter((card) => card.color === bonus && (level === 0 || card.level === level))
        .slice()
        .sort((a, b) => a.level - b.level || b.points - a.points || costTotal(a) - costTotal(b)),
    [bonus, level],
  );

  const ruby = {
    all: bonusProfile(cards, 0, "red"),
    one: bonusProfile(cards, 1, "red"),
    two: bonusProfile(cards, 2, "red"),
    three: bonusProfile(cards, 3, "red"),
  };

  return (
    <main className="deck-stats">
      <header className="deck-stats-top">
        <div>
          <p className="deck-kicker">Bộ 90 lá development</p>
          <h1>Thống kê bài Splendor</h1>
          <p className="deck-lead">
            Chi phí và điểm trong <code>json/card.json</code> là bộ 90 lá Splendor in sẵn. Phần được gán ngẫu
            nhiên chỉ là ảnh nền, mỗi lá lấy một trong 15 hình.
          </p>
        </div>
        <Link className="btn btn-ghost" href="/">
          Về bàn chơi
        </Link>
      </header>

      <section className="deck-panel">
        <h2>Quy luật của bộ bài</h2>
        <div className="deck-facts">
          <article>
            <strong>Chia đều màu thưởng</strong>
            <p>Cấp 1 có 8 lá mỗi màu, cấp 2 có 6, cấp 3 có 4. Cả bộ là 18 lá mỗi màu, đúng 20%.</p>
          </article>
          <article>
            <strong>Chia đều chip bị đòi</strong>
            <p>Cộng mọi chi phí, mỗi màu bị đòi 33 viên ở cấp 1, 41 viên ở cấp 2 và 43 viên ở cấp 3.</p>
          </article>
          <article>
            <strong>Vòng màu ở cấp 3</strong>
            <p>Trắng → lam → lục → đỏ → đen → trắng. Lá cấp 3 của một màu dựa vào màu đứng ngay trước nó.</p>
          </article>
        </div>
        <ul className="deck-counts">
          {WHEEL.map((color) => (
            <li key={color}>
              <GemName color={color} stone />
              <strong>18 lá</strong>
              <span>cấp 1: 8 · cấp 2: 6 · cấp 3: 4</span>
            </li>
          ))}
        </ul>
        <ol className="deck-wheel">
          {WHEEL.map((color) => (
            <li key={color}>
              <GemName color={color} stone />
              <span>
                cấp 3 cần nhiều <b>{GEM_LABELS[previousOnWheel(color)].toLowerCase()}</b>
              </span>
            </li>
          ))}
        </ol>
        <p className="deck-note">
          Cấp 3 xoay khít vòng này. Cấp 1 và cấp 2 giữ cùng kiểu lá, với một số chi phí đảo màu, nên màu chip nên
          gom đổi theo cấp. Bài được xáo: lá úp kế tiếp là 20% cho mỗi màu khi bộ còn đủ. Chip quyết định lá nào
          mua được.
        </p>
      </section>

      <section className="deck-panel">
        <h2>Ruby đổi màu chip theo từng cấp</h2>
        <p>
          18 lá thưởng đỏ có chi phí lớn nhất là lục, {ruby.all.pips.green}/{ruby.all.total} viên (
          {percent(ruby.all.pips.green, ruby.all.total)}%). Khoảng cách với đen và trắng rất mỏng, và từng cấp thì
          đổi hẳn:
        </p>
        <ul className="deck-ruby">
          <li>
            Cấp 1: <b>{GEM_LABELS[ruby.one.leaders[0]].toLowerCase()}</b> {ruby.one.pips[ruby.one.leaders[0]]}/
            {ruby.one.total} viên, có trên {ruby.one.freq[ruby.one.leaders[0]]}/{ruby.one.count} lá.
          </li>
          <li>
            Cấp 2: <b>{GEM_LABELS[ruby.two.leaders[0]].toLowerCase()}</b> {ruby.two.pips[ruby.two.leaders[0]]}/
            {ruby.two.total} viên, có trên {ruby.two.freq[ruby.two.leaders[0]]}/{ruby.two.count} lá.
          </li>
          <li>
            Cấp 3: <b>{GEM_LABELS[ruby.three.leaders[0]].toLowerCase()}</b> {ruby.three.pips[ruby.three.leaders[0]]}/
            {ruby.three.total} viên, có trên cả {ruby.three.count} lá.
          </li>
        </ul>
      </section>

      <section className="deck-panel">
        <div className="deck-panel-head">
          <h2>Màu chip nên gom cho từng màu thưởng</h2>
          <div className="deck-choices" role="group" aria-label="Chọn cấp bài">
            {LEVELS.map((item) => (
              <button
                aria-pressed={level === item.id}
                className="deck-choice"
                key={item.id}
                onClick={() => setLevel(item.id)}
                type="button"
              >
                {item.label}
                <small>{item.id === 0 ? 90 : cards.filter((card) => card.level === item.id).length} lá</small>
              </button>
            ))}
          </div>
        </div>

        <div className="deck-table-wrap">
          <table className="deck-table">
            <caption>Màu chi phí chiếm nhiều viên nhất. Bấm một hàng để xem chi tiết.</caption>
            <thead>
              <tr>
                <th>Thưởng</th>
                {LEVELS.filter((item) => item.id !== 0).map((item) => (
                  <th key={item.id}>{item.label}</th>
                ))}
                <th>Cả bộ</th>
              </tr>
            </thead>
            <tbody>
              {WHEEL.map((color) => (
                <tr
                  className={bonus === color ? "is-selected" : ""}
                  key={color}
                  onClick={() => setBonus(color)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setBonus(color);
                    }
                  }}
                  tabIndex={0}
                >
                  <th scope="row">
                    <GemName color={color} stone />
                    <small className="deck-split">8 · 6 · 4</small>
                  </th>
                  {[1, 2, 3, 0].map((id) => {
                    const profile = byLevel[id].profiles.find((item) => item.bonus === color);
                    const leader = profile.leaders[0];
                    return (
                      <td key={id}>
                        <span className="deck-leader">
                          <i className="deck-swatch" style={{ background: GEM_HEX[leader] }} />
                          {GEM_LABELS[leader]}
                          {profile.leaders.length > 1 ? ` +${profile.leaders.length - 1}` : ""}
                        </span>
                        <small>
                          {profile.pips[leader]}/{profile.total} viên · {percent(profile.pips[leader], profile.total)}%
                        </small>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="deck-note">
          Ô cấp 1 của lục ghi lam và có dấu +2: lam, đỏ và đen cùng 9 viên. Lam xuất hiện trên nhiều lá hơn (6 so với
          5 và 4).
        </p>
      </section>

      <section className="deck-panel">
        <div className="deck-panel-head">
          <h2>
            Chi tiết lá thưởng <GemName color={bonus} stone />
          </h2>
          <div className="deck-choices" role="group" aria-label="Chọn màu thưởng">
            {WHEEL.map((color) => (
              <button
                aria-pressed={bonus === color}
                className="deck-choice"
                key={color}
                onClick={() => setBonus(color)}
                style={{ "--gem": GEM_HEX[color] }}
                type="button"
              >
                <GemName color={color} />
              </button>
            ))}
          </div>
        </div>

        <p className="deck-lead">
          {selected.count} lá
          {level === 0 ? " trong cả bộ" : ` cấp ${level}`}. Muốn mua được nhiều lá này hơn thì gom{" "}
          <b>{formatLeaders(selected)}</b>: {selected.pips[selected.leaders[0]]}/{selected.total} viên chi phí (
          {percent(selected.pips[selected.leaders[0]], selected.total)}%), có mặt trên{" "}
          {selected.freq[selected.leaders[0]]}/{selected.count} lá. Lá úp kế tiếp vẫn chỉ có{" "}
          {selected.count}/{current.count} cơ hội là màu này.
        </p>

        <div className="deck-bars">
          {WHEEL.map((color) => {
            const share = percent(selected.pips[color], selected.total);
            return (
              <div className="deck-bar" key={color}>
                <GemName color={color} />
                <div className="deck-bar-track">
                  <span style={{ width: `${share}%`, background: GEM_HEX[color] }} />
                </div>
                <strong>
                  {selected.pips[color]} viên · {share}%
                </strong>
                <small>
                  {selected.freq[color]}/{selected.count} lá
                </small>
              </div>
            );
          })}
        </div>

        <div className="deck-table-wrap">
          <table className="deck-heat">
            <caption>
              Tổng số viên từng màu chi phí trên các lá thưởng, {level === 0 ? "cả bộ" : `cấp ${level}`}. Hàng là màu
              thưởng, cột là màu phải trả.
            </caption>
            <thead>
              <tr>
                <th>Thưởng \ trả</th>
                {WHEEL.map((color) => (
                  <th key={color}>{GEM_LABELS[color]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.profiles.map((profile) => (
                <tr key={profile.bonus}>
                  <th scope="row">
                    <button className="deck-row-btn" onClick={() => setBonus(profile.bonus)} type="button">
                      <GemName color={profile.bonus} />
                    </button>
                  </th>
                  {WHEEL.map((color) => {
                    const amount = profile.pips[color];
                    const ratio = amount / maxPip;
                    return (
                      <td
                        key={color}
                        style={{
                          background:
                            amount === 0
                              ? "#f4f7f8"
                              : `color-mix(in srgb, ${GEM_HEX[color]} ${Math.round(18 + ratio * 62)}%, white)`,
                        }}
                      >
                        {amount}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="deck-card-list">
          {selectedCards.map((card) => (
            <li key={card.id}>
              <span>Cấp {card.level}</span>
              <b>{card.points} điểm</b>
              <span>
                {GEM_ORDER.filter((color) => (card.cost[color] ?? 0) > 0)
                  .sort((a, b) => card.cost[b] - card.cost[a])
                  .map((color) => `${card.cost[color]} ${GEM_LABELS[color].toLowerCase()}`)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
