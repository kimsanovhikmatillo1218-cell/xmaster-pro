import { useMemo, useState } from "react";
import {
  StatCard, Card, CardHd, SectionHeader, Mini, FinanceLine,
  GroupLine, Notice, ProgressBar, Pill, Empty, FinanceHeroCard,
  Avatar, BarChart, LineChart, DonutChart, Sparkline
} from "../components/ui/index.jsx";
import { money, short, fmtDate, attRate } from "../lib/utils.js";
import { LEAD_STAGES } from "../lib/constants.js";

/* ── Sparkline mock data helper ──────────────────────────────────── */
function mockSpark(seed, len = 7) {
  return Array.from({ length: len }, (_, i) => Math.max(0, seed + Math.sin((i + seed) * 1.3) * seed * 0.4));
}

export default function Dashboard({ t, data, stats, sub, setSub, setModal, nav, markAllRead }) {
  if (sub === "analytics")     return <Analytics     t={t} data={data} stats={stats} nav={nav} />;
  if (sub === "notifications") return <Notifications t={t} data={data} markAllRead={markAllRead} />;

  const recentAtt  = attRate(data.attendance || []);
  const newLeads   = (data.leads || []).filter(l => l.stage === "new").length;
  const profit     = stats.income - stats.expense;
  const profitUp   = profit >= 0;

  /* Sparkline data from real payments */
  const paySpark = useMemo(() => {
    const arr = (data.payments || []).slice(0, 7).map(p => Number(p.amount || 0)).reverse();
    return arr.length >= 2 ? arr : mockSpark(stats.income / 1000 || 8);
  }, [data.payments, stats.income]);

  const stdSpark = useMemo(() => {
    const byDay = {};
    (data.students || []).forEach(s => {
      if (!s.created_at) return;
      const d = s.created_at.slice(0, 10);
      byDay[d] = (byDay[d] || 0) + 1;
    });
    const vals = Object.values(byDay).slice(-7);
    return vals.length >= 2 ? vals : mockSpark(stats.active / 10 || 5);
  }, [data.students, stats.active]);

  return (
    <div className="page-fade">

      {/* ── KPI Strip ─────────────────────────────────────────────── */}
      <div className="kpi-strip">
        {/* Faol talabalar */}
        <div className="kpi kpi-blue click" onClick={() => nav("students")}>
          <div className="kpi-top">
            <div className="kpi-icon">👥</div>
            <div className="kpi-trend-chip up">↑ {newLeads} yangi</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div className="kpi-val">{stats.active}</div>
              <div className="kpi-label">Faol talabalar</div>
            </div>
            <Sparkline data={stdSpark} color="#3b82f6" />
          </div>
        </div>

        {/* Daromad */}
        <div className="kpi kpi-green click" onClick={() => nav("finance")}>
          <div className="kpi-top">
            <div className="kpi-icon">💰</div>
            <div className={`kpi-trend-chip ${profitUp ? "up" : "down"}`}>{profitUp ? "↑" : "↓"} {short(Math.abs(profit))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div className="kpi-val">{short(stats.income)}</div>
              <div className="kpi-label">Jami daromad</div>
            </div>
            <Sparkline data={paySpark} color="#10b981" />
          </div>
        </div>

        {/* Guruhlar */}
        <div className="kpi kpi-purple click" onClick={() => nav("groups")}>
          <div className="kpi-top">
            <div className="kpi-icon">🎓</div>
            <div className="kpi-trend-chip neutral">{stats.teachers} o'qituvchi</div>
          </div>
          <div className="kpi-val">{stats.groups}</div>
          <div className="kpi-label">Faol guruhlar</div>
          <div className="kpi-sub" style={{ marginTop: 8 }}>
            <ProgressBar value={Math.min(100, stats.groups * 8)} color="purple" />
          </div>
        </div>

        {/* Davomat */}
        <div className="kpi kpi-orange click" onClick={() => nav("attend")}>
          <div className="kpi-top">
            <div className="kpi-icon">✅</div>
            <div className={`kpi-trend-chip ${recentAtt >= 75 ? "up" : "down"}`}>
              {recentAtt >= 75 ? "↑" : "↓"} {recentAtt}%
            </div>
          </div>
          <div className="kpi-val">{recentAtt}%</div>
          <div className="kpi-label">Davomat o'rtacha</div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={recentAtt} color={recentAtt >= 75 ? "green" : "red"} />
          </div>
        </div>
      </div>

      {/* ── 3-column grid ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

        {/* LEFT — charts + payments */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Finance overview */}
          <Card>
            <div style={{ padding: "18px 20px 0" }}>
              <CardHd title="💰 Moliyaviy ko'rinish" sub="So'nggi oylar"
                right={
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--t4)" }}>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#3b82f6", marginRight: 4 }} />Daromad</span>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#ef4444", marginRight: 4 }} />Xarajat</span>
                  </div>
                }
              />
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <FinanceChart data={data} />
            </div>
          </Card>

          {/* Recent payments */}
          <Card>
            <div style={{ padding: "18px 20px 0" }}>
              <CardHd title="💳 So'nggi to'lovlar"
                right={<button className="btn btn-ghost btn-sm" onClick={() => nav("finance")}>Barchasi →</button>}
              />
            </div>
            {(data.payments || []).slice(0, 6).map(p => (
              <FinanceLine key={p.id} name={p.student_name} sub={p.group_name}
                amount={<span className="green">{money(p.amount)}</span>} date={fmtDate(p.created_at)} />
            ))}
            {!(data.payments || []).length && (
              <Empty text="To'lovlar mavjud emas" icon="💳" action="+ To'lov qo'shish" onAction={() => setModal({ type: "payment" })} />
            )}
          </Card>
        </div>

        {/* RIGHT — stats + actions + notifications */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Attendance donut + group status */}
          <Card className="card-p">
            <CardHd title="📊 Statistika" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <DonutChart value={recentAtt} max={100} color="#10b981" size={80} label="Davomat" />
                <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 6 }}>Davomat</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <DonutChart value={stats.active} max={Math.max(stats.active + stats.debtors + 5, 1)} color="#3b82f6" size={80} label="Faol" />
                <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 6 }}>Talabalar</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <DonutChart value={stats.groups} max={Math.max(stats.groups + 3, 1)} color="#8b5cf6" size={80} label="Guruhlar" />
                <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 6 }}>Guruhlar</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { lbl: "Daromad",   val: money(stats.income),  cl: "green" },
                { lbl: "Xarajat",  val: money(stats.expense), cl: "red" },
                { lbl: "Foyda",    val: money(profit),        cl: profitUp ? "green" : "red" },
                { lbl: "Qarzdorlar",val: `${stats.debtors} ta`, cl: "red" },
              ].map(({ lbl, val, cl }) => (
                <div key={lbl} style={{
                  background: "var(--surface-2)", borderRadius: 10,
                  padding: "10px 14px", border: "1px solid var(--border-2)"
                }}>
                  <div style={{ fontSize: 11, color: "var(--t4)", fontWeight: 600 }}>{lbl}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }} className={cl}>{val}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Groups status */}
          <Card>
            <div style={{ padding: "18px 20px 0" }}>
              <CardHd title="🎓 Guruhlar holati"
                right={<button className="btn btn-ghost btn-sm" onClick={() => nav("groups")}>Barchasi →</button>}
              />
            </div>
            {(data.study_groups || []).slice(0, 4).map(g => (
              <GroupLine key={g.id} g={g} count={(data.students || []).filter(s => s.group_name === g.name).length} />
            ))}
            {!(data.study_groups || []).length && (
              <Empty text="Guruhlar mavjud emas" icon="🎓" action="+ Guruh qo'shish" onAction={() => setModal({ type: "group" })} />
            )}
          </Card>

          {/* Quick actions */}
          <Card className="card-ps">
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              ⚡ Tezkor amallar
            </div>
            <div className="qa-grid">
              {[
                { icon: "💳", label: "To'lov qabul",    bg: "#ecfdf5", modal: { type: "payment" } },
                { icon: "👤", label: "Talaba qo'shish",  bg: "#eff6ff", modal: { type: "student" } },
                { icon: "📣", label: "Lid qo'shish",     bg: "#f5f3ff", modal: { type: "lead" } },
                { icon: "💸", label: "Xarajat kiritish", bg: "#fef2f2", modal: { type: "expense" } },
                { icon: "📝", label: "Test yaratish",    bg: "#fff7ed", modal: { type: "test" } },
                { icon: "📖", label: "Kitob qo'shish",   bg: "#ecfeff", modal: { type: "book" } },
              ].map(a => (
                <button key={a.label} className="qa-btn" onClick={() => setModal(a.modal)}>
                  <span className="qa-ico" style={{ background: a.bg }}>{a.icon}</span>
                  <span style={{ fontSize: 12.5 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Bottom: Notifications ─────────────────────────────────── */}
      <div style={{ marginTop: 18 }}>
        <Card>
          <div style={{ padding: "16px 20px 0" }}>
            <CardHd title="🔔 Bildirishnomalar"
              right={
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>✓ O'qildi</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { nav("dash"); setSub("notifications"); }}>Barchasi →</button>
                </div>
              }
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {(data.notifications || []).slice(0, 6).map(n => <Notice key={n.id} n={n} />)}
          </div>
          {!(data.notifications || []).length && <Empty text="Bildirishnomalar yo'q" icon="🔔" />}
        </Card>
      </div>
    </div>
  );
}

/* ── Finance Bar Chart ───────────────────────────────────────────── */
function FinanceChart({ data }) {
  const chartData = useMemo(() => {
    const map = {};
    (data.payments || []).forEach(r => {
      if (!r.created_at) return;
      const m = r.created_at.slice(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      map[m].income += Number(r.amount || 0);
    });
    (data.expenses || []).forEach(r => {
      if (!r.created_at) return;
      const m = r.created_at.slice(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      map[m].expense += Number(r.amount || 0);
    });
    const sorted = Object.entries(map).sort().slice(-6);
    if (!sorted.length) {
      return Array.from({ length: 4 }, (_, i) => ({
        label: `Oy ${i + 1}`,
        value: Math.round(Math.random() * 10000 + 5000),
        value2: Math.round(Math.random() * 6000 + 2000),
      }));
    }
    return sorted.map(([m, v]) => ({
      label: m.slice(5),
      value: v.income,
      value2: v.expense,
    }));
  }, [data]);

  const max = Math.max(...chartData.map(d => Math.max(d.value, d.value2)), 1);

  return (
    <div>
      {/* Chart */}
      <div style={{ position: "relative", height: 140 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: 140, overflow: "visible" }}>
          {/* Grid */}
          {[25, 50, 75, 100].map(p => (
            <line key={p} x1="0" y1={100 - p} x2="100" y2={100 - p}
              stroke="var(--border)" strokeWidth=".5" strokeDasharray="2,3" />
          ))}
          {/* Bars */}
          {chartData.map((d, i) => {
            const w = 100 / chartData.length;
            const bw = w * 0.32;
            const x = i * w + w * 0.12;
            const h1 = Math.max(2, d.value / max * 85);
            const h2 = Math.max(2, d.value2 / max * 85);
            return (
              <g key={i}>
                {/* Income bar */}
                <rect x={x} y={90 - h1} width={bw} height={h1} rx="2"
                  fill="url(#grad-blue)" opacity=".9" />
                {/* Expense bar */}
                <rect x={x + bw + w * 0.04} y={90 - h2} width={bw} height={h2} rx="2"
                  fill="url(#grad-red)" opacity=".75" />
                {/* Label */}
                <text x={x + bw} y="97" textAnchor="middle"
                  style={{ fontSize: "6px", fill: "var(--t4)", fontFamily: "Inter,sans-serif", fontWeight: 600 }}>
                  {d.label}
                </text>
              </g>
            );
          })}
          <defs>
            <linearGradient id="grad-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="grad-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Y-axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 700 }}>{short(d.value)}</div>
            <div style={{ fontSize: 9, color: "var(--t4)" }}>{short(d.value2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analytics ───────────────────────────────────────────────────── */
function Analytics({ t, data, stats, nav }) {
  const byMonth = useMemo(() => {
    const map = {};
    (data.payments || []).forEach(r => {
      if (!r.created_at) return;
      const m = r.created_at.slice(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      map[m].income += Number(r.amount || 0);
    });
    (data.expenses || []).forEach(r => {
      if (!r.created_at) return;
      const m = r.created_at.slice(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      map[m].expense += Number(r.amount || 0);
    });
    return Object.entries(map).sort().slice(-6);
  }, [data]);

  const maxVal = byMonth.length ? Math.max(...byMonth.map(([, v]) => Math.max(v.income, v.expense)), 1) : 1;
  const byStage = LEAD_STAGES.map(s => ({ ...s, count: (data.leads || []).filter(l => l.stage === s.id).length }));
  const totalLeads = (data.leads || []).length || 1;
  const recentAtt = attRate(data.attendance || []);

  return (
    <div className="page-fade">
      <div className="kpi-strip">
        <StatCard label="Jami talabalar" value={(data.students || []).length} icon="👥" tone="blue" />
        <StatCard label="Jami daromad"   value={short(stats.income)}          icon="💰" tone="green" />
        <StatCard label="Sof foyda"      value={short(stats.profit)}          icon="📈" tone={stats.profit >= 0 ? "blue" : "red"} />
        <StatCard label="Davomat o'rtacha" value={`${recentAtt}%`}           icon="✅" tone="orange" />
      </div>

      <div className="g2">
        <Card className="card-p">
          <CardHd title="📊 Oylik moliyaviy tahlil" />
          {byMonth.length ? byMonth.map(([m, v]) => (
            <div key={m} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: "var(--t2)" }}>{m}</span>
                <span>
                  <span className="green">+{short(v.income)}</span>
                  <span style={{ color: "var(--t4)" }}> / </span>
                  <span className="red">-{short(v.expense)}</span>
                </span>
              </div>
              <ProgressBar value={Math.round(v.income / maxVal * 100)} color="green" />
              <div style={{ marginTop: 4 }}>
                <ProgressBar value={Math.round(v.expense / maxVal * 100)} color="red" />
              </div>
            </div>
          )) : <Empty text="Moliyaviy ma'lumotlar yo'q" icon="📊" />}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card className="card-p">
            <CardHd title="📣 Lidlar bosqichlari" />
            {byStage.map(s => (
              <div key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                  <Pill type={s.color}>{s.label}</Pill>
                  <span style={{ fontWeight: 800, color: "var(--t1)" }}>{s.count} ({Math.round(s.count / totalLeads * 100)}%)</span>
                </div>
                <ProgressBar value={Math.round(s.count / totalLeads * 100)} />
              </div>
            ))}
          </Card>

          <Card className="card-p">
            <CardHd title="🎓 Guruhlar bandligi" />
            {(data.study_groups || []).slice(0, 5).map(g => {
              const count = (data.students || []).filter(s => s.group_name === g.name).length;
              const cap = Number(g.capacity || 15);
              const pct = Math.min(100, Math.round(count / cap * 100));
              return (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "var(--t2)" }}>{g.name}</span>
                    <span style={{ color: pct >= 80 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{count}/{cap}</span>
                  </div>
                  <ProgressBar value={pct} color={pct >= 80 ? "red" : "green"} />
                </div>
              );
            })}
            {!(data.study_groups || []).length && <Empty text="Guruhlar yo'q" />}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Notifications ───────────────────────────────────────────────── */
function Notifications({ t, data, markAllRead }) {
  const [filter, setFilter] = useState("all");
  const all    = data.notifications || [];
  const unread = all.filter(n => !n.is_read).length;
  const items  = filter === "unread" ? all.filter(n => !n.is_read) :
                 filter === "read"   ? all.filter(n => n.is_read)  : all;

  return (
    <div className="page-fade">
      <div className="pg-toolbar">
        <div className="tabs">
          {[["all", "Barchasi"], ["unread", "O'qilmagan"], ["read", "O'qilgan"]].map(([v, l]) => (
            <button key={v} className={`tab ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>
              {l}
              {v === "unread" && unread > 0 && <span className="tab-count">{unread}</span>}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>✓ Barchasini o'qildi</button>
        )}
      </div>
      <Card>
        {items.map(n => <Notice key={n.id} n={n} />)}
        {!items.length && <Empty text="Bildirishnomalar yo'q" icon="🔔" />}
      </Card>
    </div>
  );
}
