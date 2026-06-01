import { useState } from "react";
import {
  Plus, CheckSquare, Clock, CheckCircle2, XCircle,
  AlertCircle, ArrowUpCircle, Minus, User,
  Calendar, ArrowRight, Trash2, Check
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import { Pill, Empty, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate } from "../lib/utils.js";

const PRIORITY_MAP = {
  urgent: { color: "red",    label: "Shoshilinch", Icon: AlertCircle   },
  high:   { color: "orange", label: "Yuqori",      Icon: ArrowUpCircle },
  medium: { color: "blue",   label: "O'rta",       Icon: Minus         },
  low:    { color: "muted",  label: "Past",         Icon: Minus         },
};

const COLS = [
  { id: "todo",        label: "Rejalangan",  color: "blue",   Icon: Clock       },
  { id: "in_progress", label: "Jarayonda",   color: "orange", Icon: ArrowRight  },
  { id: "done",        label: "Tugallandi",  color: "green",  Icon: CheckCircle2},
  { id: "cancelled",   label: "Bekor",       color: "red",    Icon: XCircle     },
];

export default function Tasks({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState("all");

  const tasks    = data.tasks || [];
  const filtered =
    filter === "all"  ? tasks :
    filter === "done" ? tasks.filter(tk => tk.status === "done") :
    filter === "todo" ? tasks.filter(tk => tk.status === "todo" || tk.status === "in_progress") :
    tasks.filter(tk => tk.priority === filter);

  const toggle = async task => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const { error } = await db.from("tasks").update({ status: newStatus }).eq("id", task.id);
    if (error) return toast(error.message, "error");
    loadAll();
  };

  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("tasks").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Vazifa o'chirildi"); loadAll();
  };

  const setStatus = async (id, status) => {
    await db.from("tasks").update({ status }).eq("id", id);
    loadAll();
  };

  /* Stats */
  const todoCount   = tasks.filter(tk => tk.status === "todo" || tk.status === "in_progress").length;
  const doneCount   = tasks.filter(tk => tk.status === "done").length;
  const urgentCount = tasks.filter(tk => tk.priority === "urgent").length;

  return (
    <div className="page-enter">

      {/* ── Stats mini-row ──────────────────────────────────────── */}
      <div className="g4" style={{ marginBottom: 18 }}>
        {[
          { label: "Jami vazifalar", value: tasks.length,  color: "var(--brand)", bg: "#eff6ff", Icon: CheckSquare  },
          { label: "Faol",           value: todoCount,     color: "var(--yellow)",bg: "#fffbeb", Icon: Clock        },
          { label: "Tugallandi",     value: doneCount,     color: "var(--green)", bg: "#ecfdf5", Icon: CheckCircle2 },
          { label: "Shoshilinch",    value: urgentCount,   color: "var(--red)",   bg: "#fef2f2", Icon: AlertCircle  },
        ].map(({ label, value, color, bg, Icon: I }) => (
          <div key={label} style={{
            background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: "var(--r)", padding: "16px 18px",
            boxShadow: "var(--sh1)", display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I size={18} strokeWidth={1.75} style={{ color }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 900, color: "var(--t1)", letterSpacing: "-.5px", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="page-toolbar">
        <div className="filter-tabs">
          {[
            { v: "all",    l: "Barchasi",    n: tasks.length },
            { v: "todo",   l: "Faol",        n: todoCount    },
            { v: "done",   l: "Tugallandi",  n: doneCount    },
            { v: "urgent", l: "Shoshilinch", n: urgentCount  },
          ].map(({ v, l, n }) => (
            <button key={v} className={`filter-tab ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>
              {l}<span className="filter-count">{n}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "task" })}>
          <Plus size={13} /> {t.addTask}
        </button>
      </div>

      {/* ── Kanban board ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(tk => tk.status === col.id);
          const ColIcon  = col.Icon;
          return (
            <div key={col.id} className="kb-col">
              <div className={`kb-hd ${col.color}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <ColIcon size={14} strokeWidth={2} />
                  <span>{col.label}</span>
                </div>
                <span className={`pill pill-${col.color}`} style={{ fontSize: 10 }}>{colTasks.length}</span>
              </div>
              <div className="kb-body">
                {colTasks.map(task => {
                  const pm       = PRIORITY_MAP[task.priority] || { color: "muted", label: task.priority, Icon: Minus };
                  const PrIcon   = pm.Icon;
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                  return (
                    <div key={task.id} className={`kb-card pri-${task.priority}`}>
                      {/* Title row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                        <button
                          className={`task-chk ${task.status === "done" ? "done" : ""}`}
                          onClick={() => toggle(task)}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        >
                          {task.status === "done" && <Check size={10} />}
                        </button>
                        <div style={{
                          fontSize: 12.5, fontWeight: 700,
                          color: task.status === "done" ? "var(--t4)" : "var(--t1)",
                          textDecoration: task.status === "done" ? "line-through" : "none",
                          flex: 1, lineHeight: 1.4
                        }}>
                          {task.title}
                        </div>
                        <button className="tiny-x" onClick={() => remove(task.id)} title="O'chirish">
                          <Trash2 size={10} />
                        </button>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 8, lineHeight: 1.5 }}>
                          {task.description}
                        </div>
                      )}

                      {/* Meta */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span className={`pill pill-${pm.color}`} style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <PrIcon size={9} /> {pm.label}
                        </span>
                        {task.due_date && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: isOverdue ? "var(--red)" : "var(--t4)",
                            display: "flex", alignItems: "center", gap: 3
                          }}>
                            <Calendar size={9} /> {fmtDate(task.due_date)}
                          </span>
                        )}
                        {task.assigned_to && (
                          <span style={{ fontSize: 10, color: "var(--t4)", display: "flex", alignItems: "center", gap: 3 }}>
                            <User size={9} /> {task.assigned_to}
                          </span>
                        )}
                      </div>

                      {/* Move buttons */}
                      <div style={{ display: "flex", gap: 4, marginTop: 9, flexWrap: "wrap" }}>
                        {COLS.filter(c => c.id !== col.id).slice(0, 2).map(c => {
                          const CI = c.Icon;
                          return (
                            <button key={c.id} className="kb-move-btn"
                              style={{ display: "flex", alignItems: "center", gap: 3 }}
                              onClick={() => setStatus(task.id, c.id)}>
                              <CI size={9} /> {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!colTasks.length && (
                  <div className="kb-empty">
                    <ColIcon size={20} strokeWidth={1} style={{ color: "var(--t5)", display: "block", margin: "0 auto 6px" }} />
                    Bo'sh
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
