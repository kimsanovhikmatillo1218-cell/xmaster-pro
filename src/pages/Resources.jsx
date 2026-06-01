import { useState } from "react";
import {
  Plus, Search, Pencil, Trash2, ExternalLink, Download,
  FileText, Video, Music, Link, Image, Package,
  FolderOpen, Globe, Lock
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, Empty, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate } from "../lib/utils.js";
import { RES_TYPES } from "../lib/constants.js";

const TYPE_ICONS = {
  document: { Icon: FileText, bg: "#eff6ff", color: "#1d4ed8"  },
  video:    { Icon: Video,    bg: "#fef2f2", color: "#dc2626"  },
  audio:    { Icon: Music,    bg: "#fdf4ff", color: "#7c3aed"  },
  link:     { Icon: Link,     bg: "#f0fdf4", color: "#059669"  },
  image:    { Icon: Image,    bg: "#fffbeb", color: "#b45309"  },
  other:    { Icon: Package,  bg: "#f1f5f9", color: "#475569"  },
};

export default function Resources({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search,     setSearch]     = useState("");

  const resources = data.resources || [];
  const filtered  = resources
    .filter(r => typeFilter === "all" || r.type === typeFilter)
    .filter(r => !search
      || r.title?.toLowerCase().includes(search.toLowerCase())
      || r.subject?.toLowerCase().includes(search.toLowerCase()));

  const remove = async id => {
    if (!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("resources").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Resurs o'chirildi"); loadAll();
  };

  return (
    <div className="page-enter">

      {/* ── Type stats ──────────────────────────────────────────── */}
      <div className="g4" style={{ marginBottom: 18 }}>
        {RES_TYPES.slice(0, 4).map(type => {
          const count  = resources.filter(r => r.type === type.v).length;
          const ti     = TYPE_ICONS[type.v] || TYPE_ICONS.other;
          const active = typeFilter === type.v;
          return (
            <div key={type.v}
              onClick={() => setTypeFilter(active ? "all" : type.v)}
              style={{
                background: "var(--card)", border: `1.5px solid ${active ? ti.color : "var(--line)"}`,
                borderRadius: "var(--r)", padding: "16px 18px",
                boxShadow: active ? `0 4px 14px ${ti.bg}` : "var(--sh1)",
                display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                transition: "all .15s"
              }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: ti.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ti.Icon size={18} strokeWidth={1.75} style={{ color: ti.color }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 900, color: "var(--t1)", letterSpacing: "-.5px", lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11.5, color: "var(--t4)", marginTop: 3 }}>{type.l.split(" ").slice(1).join(" ") || type.l}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="page-toolbar">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 8, height: 34,
            padding: "0 12px", border: "1.5px solid var(--line)", borderRadius: 10,
            background: "var(--card)", transition: "all .15s"
          }}>
            <Search size={13} style={{ color: "var(--t4)", flexShrink: 0 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Resurs qidirish..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 12.5, color: "var(--t1)", width: 180 }}
            />
          </label>
          <div className="filter-tabs">
            <button className={`filter-tab ${typeFilter === "all" ? "on" : ""}`} onClick={() => setTypeFilter("all")}>
              <FolderOpen size={11} /> Barchasi <span className="filter-count">{resources.length}</span>
            </button>
            {RES_TYPES.map(type => {
              const ti = TYPE_ICONS[type.v] || TYPE_ICONS.other;
              return (
                <button key={type.v} className={`filter-tab ${typeFilter === type.v ? "on" : ""}`}
                  onClick={() => setTypeFilter(type.v)}>
                  <ti.Icon size={11} /> {type.l.split(" ").slice(1).join(" ") || type.l}
                </button>
              );
            })}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "resource" })}>
          <Plus size={13} /> {t.addResource}
        </button>
      </div>

      {/* ── Resources list ──────────────────────────────────────── */}
      <Card>
        {filtered.length === 0 && (
          <Empty text="Resurslar topilmadi"
            sub="Yangi resurs qo'shing yoki filtrni o'zgartiring"
            action={t.addResource} onAction={() => setModal({ type: "resource" })} />
        )}
        {filtered.map(res => {
          const ti = TYPE_ICONS[res.type] || TYPE_ICONS.other;
          const TI = ti.Icon;
          return (
            <div key={res.id} className="res-row">
              <div style={{
                width: 44, height: 44, borderRadius: 13, background: ti.bg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <TI size={20} strokeWidth={1.75} style={{ color: ti.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--t1)", marginBottom: 3 }}>
                  {res.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {res.subject && (
                    <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600 }}>
                      {res.subject}
                    </span>
                  )}
                  {res.uploaded_by && (
                    <span style={{ fontSize: 11, color: "var(--t4)", display: "flex", alignItems: "center", gap: 3 }}>
                      <FileText size={10} /> {res.uploaded_by}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--t4)" }}>{fmtDate(res.created_at)}</span>
                </div>
                {res.description && (
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3, lineHeight: 1.5 }}>{res.description}</div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <Pill type={res.is_public ? "green" : "blue"}>
                  {res.is_public
                    ? <><Globe size={9} style={{ display: "inline", marginRight: 3 }} />Ommaviy</>
                    : <><Lock size={9} style={{ display: "inline", marginRight: 3 }} />Guruh</>}
                </Pill>
                {(res.file_url || res.external_url) && (
                  <a href={res.file_url || res.external_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-xs" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={11} /> Ochish
                  </a>
                )}
                <button className="btn btn-ghost btn-xs" title="Tahrirlash"
                  onClick={() => setModal({ type: "resource", row: res })}>
                  <Pencil size={11} />
                </button>
                <button className="btn btn-ghost btn-xs danger" title="O'chirish"
                  onClick={() => remove(res.id)}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
