import { useState } from "react";
import {
  BookOpen, BookMarked, BookX, Plus, Pencil, Trash2,
  RotateCcw, AlertTriangle, CheckCircle, Clock,
  BookCopy, User
} from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, StatusPill, Empty, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate } from "../lib/utils.js";

const BOOK_COLOR = {
  textbook:  { bg:"#eff6ff", color:"#1d4ed8"  },
  fiction:   { bg:"#fef2f2", color:"#dc2626"  },
  reference: { bg:"#ecfdf5", color:"#059669"  },
  magazine:  { bg:"#fff7ed", color:"#c2410c"  },
  other:     { bg:"#f5f3ff", color:"#6d28d9"  },
};

export default function Library({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [view,      setView]      = useState("books");
  const [catFilter, setCatFilter] = useState("all");

  const books = data.library_books || [];
  const loans = data.library_loans || [];
  const filtered = catFilter === "all" ? books : books.filter(b => b.category === catFilter);
  const cats     = [...new Set(books.map(b => b.category).filter(Boolean))];

  const returnBook = async (loanId) => {
    if (!await confirm("Kitobni qaytarildi deb belgilaysizmi?")) return;
    const { error } = await db.from("library_loans").update({
      status: "returned", return_date: new Date().toISOString().slice(0, 10)
    }).eq("id", loanId);
    if (error) return toast(error.message, "error");
    toast("Kitob qaytarildi"); loadAll();
  };

  const removeBook = async id => {
    if (!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("library_books").delete().eq("id", id);
    if (error) return toast(error.message, "error");
    toast("Kitob o'chirildi"); loadAll();
  };

  const totalAvail  = books.reduce((a, b) => a + Number(b.available || 0), 0);
  const activeLoans = loans.filter(l => l.status === "active").length;
  const overdueCount= loans.filter(l => l.status === "overdue").length;

  const STATS = [
    { label: "Jami kitoblar",   value: books.length,   color: "var(--brand)",  bg: "#eff6ff",  Icon: BookCopy     },
    { label: "Mavjud",          value: totalAvail,      color: "var(--green)",  bg: "#ecfdf5",  Icon: CheckCircle  },
    { label: "Berilgan",        value: activeLoans,     color: "var(--orange)", bg: "#fff7ed",  Icon: BookOpen     },
    { label: "Muddati o'tgan",  value: overdueCount,    color: "var(--red)",    bg: "#fef2f2",  Icon: AlertTriangle},
  ];

  return (
    <div className="page-enter">

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="g4" style={{ marginBottom: 18 }}>
        {STATS.map(({ label, value, color, bg, Icon: I }) => (
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
          <button className={`filter-tab ${view === "books" ? "on" : ""}`} onClick={() => setView("books")}>
            <BookOpen size={12} /> Kitoblar <span className="filter-count">{books.length}</span>
          </button>
          <button className={`filter-tab ${view === "loans" ? "on" : ""}`} onClick={() => setView("loans")}>
            <BookMarked size={12} /> Berilganlar <span className="filter-count">{activeLoans}</span>
          </button>
          <button className={`filter-tab ${view === "overdue" ? "on" : ""}`} onClick={() => setView("overdue")}>
            <BookX size={12} /> Muddati o'tgan {overdueCount > 0 && <span className="filter-count" style={{ background: "var(--red)", color: "#fff" }}>{overdueCount}</span>}
          </button>
        </div>
        <div className="toolbar-right">
          {view === "books" && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "book" })}>
              <Plus size={13} /> {t.addBook}
            </button>
          )}
          {(view === "loans" || view === "overdue") && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: "loan" })}>
              <Plus size={13} /> Kitob berish
            </button>
          )}
        </div>
      </div>

      {/* ── Books grid ──────────────────────────────────────────── */}
      {view === "books" && (
        <>
          {cats.length > 0 && (
            <div className="filter-tabs" style={{ marginBottom: 14 }}>
              <button className={`filter-tab ${catFilter === "all" ? "on" : ""}`} onClick={() => setCatFilter("all")}>
                Barchasi <span className="filter-count">{books.length}</span>
              </button>
              {cats.map(c => (
                <button key={c} className={`filter-tab ${catFilter === c ? "on" : ""}`} onClick={() => setCatFilter(c)}>
                  {c} <span className="filter-count">{books.filter(b => b.category === c).length}</span>
                </button>
              ))}
            </div>
          )}
          <div className="g3">
            {filtered.map(book => {
              const bc    = BOOK_COLOR[book.category] || { bg: "#f5f3ff", color: "#6d28d9" };
              const avail = Number(book.available || 0);
              return (
                <div key={book.id} className="book-card">
                  <div className="book-cover" style={{ background: bc.bg }}>
                    <BookOpen size={44} strokeWidth={1} style={{ color: bc.color }} />
                  </div>
                  <div className="book-body">
                    <div className="book-title">{book.title}</div>
                    <div className="book-author">{book.author || "Muallif ko'rsatilmagan"}</div>
                    {book.subject && (
                      <div style={{ marginTop: 5 }}>
                        <Pill type="indigo">{book.subject}</Pill>
                      </div>
                    )}
                    {book.isbn && (
                      <div style={{ fontSize: 10.5, color: "var(--t4)", marginTop: 4 }}>ISBN: {book.isbn}</div>
                    )}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 12, fontWeight: 700,
                        color: avail > 0 ? "var(--green)" : "var(--red)"
                      }}>
                        {avail > 0
                          ? <><CheckCircle size={12} /> {avail} mavjud</>
                          : <><BookX size={12} /> Mavjud emas</>}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--t4)" }}>Jami: {book.total_copies || 1}</span>
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                        onClick={() => setModal({ type: "loan", row: { book_title: book.title } })}>
                        Berish
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Tahrirlash"
                        onClick={() => setModal({ type: "book", row: book })}><Pencil size={12} /></button>
                      <button className="btn btn-ghost btn-sm danger" title="O'chirish"
                        onClick={() => removeBook(book.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="book-card add-card" onClick={() => setModal({ type: "book" })} role="button" tabIndex={0}>
              <BookOpen size={32} strokeWidth={1} style={{ color: "var(--t4)" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Kitob qo'shish</span>
            </div>
          </div>
        </>
      )}

      {/* ── Loans table ─────────────────────────────────────────── */}
      {(view === "loans" || view === "overdue") && (
        <Card>
          <table className="tbl">
            <thead>
              <tr>
                <th>Kitob</th>
                <th>Oluvchi</th>
                <th>Tur</th>
                <th>Berilgan</th>
                <th>Qaytarish muddati</th>
                <th>Holat</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(view === "overdue"
                ? loans.filter(l => l.status === "overdue")
                : loans.filter(l => l.status === "active" || l.status === "overdue")
              ).map(loan => {
                const isOverdue = new Date(loan.due_date) < new Date() && loan.status === "active";
                return (
                  <tr key={loan.id} className="tbl-row">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <BookOpen size={14} strokeWidth={1.75} style={{ color: "#1d4ed8" }} />
                        </div>
                        <b style={{ fontSize: 12.5, color: "var(--t1)" }}>{loan.book_title || "—"}</b>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User size={12} strokeWidth={1.75} style={{ color: "#6d28d9" }} />
                        </div>
                        <b style={{ fontSize: 12 }}>{loan.borrower_name || "—"}</b>
                      </div>
                    </td>
                    <td><Pill type={loan.borrower_type === "student" ? "blue" : "purple"}>{loan.borrower_type === "student" ? "Talaba" : "O'qituvchi"}</Pill></td>
                    <td style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(loan.issue_date)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {isOverdue && <AlertTriangle size={12} style={{ color: "var(--red)" }} />}
                        <span style={{
                          fontSize: 12, fontWeight: isOverdue ? 700 : 400,
                          color: isOverdue ? "var(--red)" : "var(--t2)"
                        }}>
                          {fmtDate(loan.due_date)}
                        </span>
                      </div>
                    </td>
                    <td><StatusPill status={loan.status} t={t} /></td>
                    <td>
                      {loan.status === "active" && (
                        <button className="btn btn-success btn-xs"
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => returnBook(loan.id)}>
                          <RotateCcw size={11} /> Qaytarildi
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loans.filter(l => view === "overdue" ? l.status === "overdue" : l.status === "active").length && (
                <tr><td colSpan={7}>
                  <Empty text="Yozuvlar yo'q"
                    sub={view === "overdue" ? "Muddati o'tgan kitoblar yo'q" : "Berilgan kitoblar yo'q"} />
                </td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
