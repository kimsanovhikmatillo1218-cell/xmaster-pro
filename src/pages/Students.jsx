import { useMemo, useState } from "react";
import {
  UserPlus, Download, Eye, Pencil, Trash2,
  Users, TrendingUp, TrendingDown, ChevronDown
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import { Person, Pill, StatusPill, ProgressBar, Empty, Card, useToast, useConfirm } from "../components/ui/index.jsx";
import { money, fmtDate, attRate, exportCSV } from "../lib/utils.js";
import { PER_PAGE } from "../lib/constants.js";

export default function Students({ t, rows, data, setModal, setDetail, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [filter,  setFilter]  = useState("active");
  const [pageNum, setPageNum] = useState(1);

  const filtered = useMemo(() =>
    filter === "all" ? rows : rows.filter(s => (s.status || "active") === filter),
    [rows, filter]
  );
  const paged   = filtered.slice(0, pageNum * PER_PAGE);
  const hasMore = filtered.length > paged.length;

  const sAttRate = name => {
    const r = (data.attendance || []).filter(a => a.student_name === name);
    if (!r.length) return null;
    return Math.round(r.filter(a => a.status === "present").length / r.length * 100);
  };

  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("students").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Talaba o'chirildi"); loadAll();
  };

  const TABS = [
    { v: "active",   l: t.active,   color: "var(--green)"  },
    { v: "frozen",   l: t.frozen,   color: "var(--brand)"  },
    { v: "archived", l: t.archived, color: "var(--t4)"     },
    { v: "all",      l: t.all,      color: "var(--t2)"     },
  ];

  /* Stats bar */
  const activeCount   = rows.filter(s => (s.status || "active") === "active").length;
  const debtorCount   = rows.filter(s => Number(s.balance || 0) < 0).length;
  const frozenCount   = rows.filter(s => s.status === "frozen").length;

  return (
    <div className="page-enter">

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="g4" style={{ marginBottom: 18 }}>
        {[
          { label: "Jami talabalar", value: rows.length,    color: "var(--brand)",  bg: "#eff6ff", Icon: Users },
          { label: "Faol",           value: activeCount,    color: "var(--green)",  bg: "#ecfdf5", Icon: TrendingUp },
          { label: "Muzlatilgan",    value: frozenCount,    color: "var(--yellow)", bg: "#fffbeb", Icon: TrendingDown },
          { label: "Qarzdorlar",     value: debtorCount,    color: "var(--red)",    bg: "#fef2f2", Icon: TrendingDown },
        ].map(({ label, value, color, bg, Icon }) => (
          <div key={label} style={{
            background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: "var(--r)", padding: "16px 18px",
            boxShadow: "var(--sh1)", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: bg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Icon size={18} strokeWidth={1.75} style={{ color }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 900, color: "var(--t1)", letterSpacing: "-.5px", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 3, fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="page-toolbar">
        <div className="filter-tabs">
          {TABS.map(({ v, l }) => (
            <button key={v} className={`filter-tab ${filter === v ? "on" : ""}`}
              onClick={() => { setFilter(v); setPageNum(1); }}>
              {l}
              <span className="filter-count">
                {v === "all" ? rows.length : rows.filter(s => (s.status || "active") === v).length}
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered, "talabalar")}>
            <Download size={13} /> Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "student" })}>
            <UserPlus size={13} /> {t.addStudent}
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <Card>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>{t.name}</th>
              <th>{t.group}</th>
              <th>Telefon</th>
              <th>{t.balance}</th>
              <th>{t.attendance}</th>
              <th>{t.status}</th>
              <th style={{ width: 100 }}>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s, i) => {
              const att = sAttRate(s.full_name);
              return (
                <tr key={s.id} className="tbl-row">
                  <td style={{ fontSize: 11, color: "var(--t4)", fontWeight: 600 }}>{i + 1}</td>
                  <td><Person name={s.full_name} sub={fmtDate(s.birth_date)} /></td>
                  <td>
                    {s.group_name
                      ? <Pill type="blue">{s.group_name}</Pill>
                      : <span style={{ color: "var(--t4)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--t3)" }}>{s.phone || "—"}</td>
                  <td>
                    <span style={{
                      fontWeight: 900, fontSize: 13,
                      color: Number(s.balance || 0) < 0 ? "var(--red)" : "var(--green)",
                      fontVariantNumeric: "tabular-nums"
                    }}>
                      {money(s.balance)}
                    </span>
                  </td>
                  <td style={{ width: 110 }}>
                    {att !== null ? (
                      <>
                        <ProgressBar value={att} color={att >= 75 ? "green" : "red"} />
                        <div style={{
                          fontSize: 10.5, fontWeight: 700, marginTop: 3, textAlign: "right",
                          color: att >= 75 ? "var(--green)" : "var(--red)"
                        }}>{att}%</div>
                      </>
                    ) : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>}
                  </td>
                  <td><StatusPill status={s.status || "active"} t={t} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-xs" title="Ko'rish"
                        onClick={() => setDetail({ type: "student", row: s })}>
                        <Eye size={12} />
                      </button>
                      <button className="btn btn-ghost btn-xs" title="Tahrirlash"
                        onClick={() => setModal({ type: "student", row: s })}>
                        <Pencil size={12} />
                      </button>
                      <button className="btn btn-ghost btn-xs danger" title="O'chirish"
                        onClick={() => remove(s.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={8}>
                <Empty text="Talabalar topilmadi"
                  sub="Yangi talaba qo'shish uchun tugmani bosing"
                  action={t.addStudent} onAction={() => setModal({ type: "student" })} />
              </td></tr>
            )}
          </tbody>
        </table>
        {hasMore && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--line2)", textAlign: "center" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPageNum(p => p + 1)}>
              <ChevronDown size={13} /> Ko'proq ({filtered.length - paged.length} ta qoldi)
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
