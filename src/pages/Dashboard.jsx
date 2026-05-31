import { useMemo, useState } from "react";
import {
  StatCard, Card, SectionHeader, Mini, FinanceLine,
  GroupLine, Notice, ProgressBar, Pill, Empty, FinanceHeroCard, Avatar
} from "../components/ui/index.jsx";
import { money, short, fmtDate, attRate } from "../lib/utils.js";
import { LEAD_STAGES } from "../lib/constants.js";

export default function Dashboard({ t, data, stats, sub, setSub, setModal, nav, markAllRead }) {
  if (sub === "analytics")     return <Analytics     t={t} data={data} stats={stats} nav={nav} />;
  if (sub === "notifications") return <Notifications t={t} data={data} markAllRead={markAllRead} />;

  const recentAtt = attRate(data.attendance || []);
  const newLeads  = (data.leads || []).filter(l => l.stage === "new").length;

  return (
    <div className="page-enter">
      {/* KPI Strip */}
      <div className="stat-strip">
        <StatCard label="Faol talabalar"   value={stats.active}          icon="👥" tone="blue"
          onClick={() => nav("students")} trend={`+${newLeads} yangi lid`} />
        <StatCard label="Jami daromad"     value={short(stats.income)}   icon="💰" tone="green"
          onClick={() => nav("finance")} trend="so'm" />
        <StatCard label="Qarzdorlar"       value={stats.debtors}         icon="⚠️" tone="red"
          sub={money(stats.debt)} trendDir="down" />
        <StatCard label="Yangi lidlar"     value={newLeads}              icon="📣" tone="purple"
          onClick={() => nav("leads")} trend={`${(data.leads||[]).length} jami`} />
      </div>

      {/* 2-column grid */}
      <div className="grid2" style={{ gap: 18 }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Recent payments */}
          <div>
            <SectionHeader title="💳 So'nggi to'lovlar" action="Hammasini ko'rish" onAction={() => nav("finance")} />
            <Card>
              {(data.payments || []).slice(0, 7).map(p => (
                <FinanceLine key={p.id} name={p.student_name} sub={p.group_name}
                  amount={money(p.amount)} date={fmtDate(p.created_at)} />
              ))}
              {!(data.payments || []).length && (
                <Empty text="To'lovlar mavjud emas" icon="💳" action="+ To'lov qo'shish" onAction={() => setModal({ type: "payment" })} />
              )}
            </Card>
          </div>

          {/* Group status */}
          <div>
            <SectionHeader title="🎓 Guruhlar holati" action="Hammasini ko'rish" onAction={() => nav("groups")} />
            <Card>
              {(data.study_groups || []).slice(0, 5).map(g => (
                <GroupLine key={g.id} g={g} count={(data.students || []).filter(s => s.group_name === g.name).length} />
              ))}
              {!(data.study_groups || []).length && (
                <Empty text="Guruhlar mavjud emas" icon="🎓" action="+ Guruh qo'shish" onAction={() => setModal({ type: "group" })} />
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Notifications */}
          <div>
            <SectionHeader title="🔔 Bildirishnomalar" action="Barchasini o'qildi" onAction={markAllRead} />
            <Card>
              {(data.notifications || []).slice(0, 6).map(n => <Notice key={n.id} n={n} />)}
              {!(data.notifications || []).length && <Empty text="Bildirishnomalar yo'q" icon="🔔" />}
            </Card>
          </div>

          {/* Mini stats */}
          <div className="grid2" style={{ gap: 10 }}>
            <Mini title="Davomat o'rtacha" value={`${recentAtt}%`}     tone="green" sub="So'nggi davr" />
            <Mini title="Sof foyda"        value={short(stats.profit)} tone={stats.profit >= 0 ? "blue" : "red"} sub="so'm" />
            <Mini title="Guruhlar"         value={stats.groups || 0}   tone="purple" sub="Faol guruh" />
            <Mini title="O'qituvchilar"    value={stats.teachers || 0} tone="cyan"   sub="Jami" />
          </div>

          {/* Quick actions */}
          <Card className="pad-sm">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>
              ⚡ Tezkor amallar
            </div>
            <div className="qa-grid">
              {[
                { icon: "💳", label: "To'lov qabul",   bg: "var(--green-bg)",  modal: { type: "payment" } },
                { icon: "👤", label: "Talaba qo'shish", bg: "var(--brand-50)",  modal: { type: "student" } },
                { icon: "📣", label: "Lid qo'shish",    bg: "var(--purple-bg)", modal: { type: "lead" } },
                { icon: "💸", label: "Xarajat kiritish",bg: "var(--red-bg)",    modal: { type: "expense" } },
                { icon: "📝", label: "Test yaratish",   bg: "var(--orange-bg)", modal: { type: "test" } },
                { icon: "📖", label: "Kitob qo'shish",  bg: "var(--cyan-bg)",   modal: { type: "book" } },
              ].map(a => (
                <button key={a.label} className="qa-btn" onClick={() => setModal(a.modal)}>
                  <span className="qa-icon" style={{ background: a.bg }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
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

  return (
    <div className="page-enter">
      <div className="stat-strip">
        <StatCard label="Jami talabalar"   value={(data.students || []).length}         icon="👥" tone="blue" />
        <StatCard label="Jami daromad"     value={short(stats.income)}                  icon="💰" tone="green" />
        <StatCard label="Sof foyda"        value={short(stats.profit)}                  icon="📈" tone={stats.profit >= 0 ? "blue" : "red"} />
        <StatCard label="Davomat o'rtacha" value={`${attRate(data.attendance || [])}%`} icon="✅" tone="purple" />
      </div>

      <div className="grid2">
        <Card className="pad">
          <SectionHeader title="📊 Oylik moliyaviy tahlil" />
          {byMonth.length ? byMonth.map(([m, v]) => (
            <div key={m} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: "var(--text-2)" }}>{m}</span>
                <span>
                  <span className="c-green">+{short(v.income)}</span>
                  <span className="c-muted"> / </span>
                  <span className="c-red">-{short(v.expense)}</span>
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <ProgressBar value={Math.round(v.income / maxVal * 100)} color="green" />
                <ProgressBar value={Math.round(v.expense / maxVal * 100)} color="red" />
              </div>
            </div>
          )) : <Empty text="Moliyaviy ma'lumotlar yo'q" icon="📊" />}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card className="pad">
            <SectionHeader title="📣 Lidlar bosqichlari" />
            {byStage.map(s => (
              <div key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                  <Pill type={s.color}>{s.label}</Pill>
                  <span style={{ fontWeight: 700 }}>{s.count} ({Math.round(s.count / totalLeads * 100)}%)</span>
                </div>
                <ProgressBar value={Math.round(s.count / totalLeads * 100)} />
              </div>
            ))}
          </Card>

          <Card className="pad">
            <SectionHeader title="🎓 Guruhlar bandligi" />
            {(data.study_groups || []).slice(0, 5).map(g => {
              const count = (data.students || []).filter(s => s.group_name === g.name).length;
              const cap = Number(g.capacity || 15);
              const pct = Math.min(100, Math.round(count / cap * 100));
              return (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <span style={{ fontWeight: 700 }}>{g.name}</span>
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
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {[["all", "Barchasi"], ["unread", "O'qilmagan"], ["read", "O'qilgan"]].map(([v, l]) => (
            <button key={v} className={`ftab ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>
              {l}
              {v === "unread" && unread > 0 && <span className="ftab-count">{unread}</span>}
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
