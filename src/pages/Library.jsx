import { useState } from "react";
import { supabase as db } from "../lib/supabase.js";
import { Card, Pill, StatusPill, Empty, SectionHeader, useToast, useConfirm } from "../components/ui/index.jsx";
import { fmtDate, fmtFull } from "../lib/utils.js";

const BOOK_EMOJI = { textbook:"📘", fiction:"📕", reference:"📗", magazine:"📰", other:"📦" };

export default function Library({ t, data, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState("books");
  const [catFilter, setCatFilter] = useState("all");

  const books = data.library_books||[];
  const loans = data.library_loans||[];

  const filtered = catFilter==="all" ? books : books.filter(b=>b.category===catFilter);

  const returnBook = async (loanId, bookId) => {
    if(!await confirm("Kitobni qaytarildi deb belgilaysizmi?")) return;
    const { error:e1 } = await db.from("library_loans").update({
      status:"returned", return_date: new Date().toISOString().slice(0,10)
    }).eq("id",loanId);
    if(e1) return toast(e1.message,"error");
    await db.from("library_books").update({available: db.rpc}).eq("id",bookId);
    toast("Kitob qaytarildi deb belgilandi"); loadAll();
  };

  const removeBook = async id => {
    if(!await confirm(t.confirmDelete)) return;
    const { error } = await db.from("library_books").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Kitob o'chirildi"); loadAll();
  };

  const cats = [...new Set(books.map(b=>b.category).filter(Boolean))];

  return (
    <div className="page-enter">
      {/* Stats */}
      <div className="grid4" style={{marginBottom:16}}>
        {[
          {icon:"📚",label:"Jami kitoblar",  value:books.length,                                            tone:"blue"},
          {icon:"✅",label:"Mavjud",          value:books.reduce((a,b)=>a+Number(b.available||0),0),         tone:"green"},
          {icon:"📤",label:"Berilgan",        value:loans.filter(l=>l.status==="active").length,             tone:"orange"},
          {icon:"⚠️",label:"Muddati o'tgan",  value:loans.filter(l=>l.status==="overdue").length,            tone:"red"},
        ].map(s=>(
          <div key={s.label} className={`stat-card stat-${s.tone}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-body">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="page-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${view==="books"?"on":""}`}  onClick={()=>setView("books")}>📚 Kitoblar</button>
          <button className={`filter-tab ${view==="loans"?"on":""}`}  onClick={()=>setView("loans")}>📤 Berilganlar</button>
          <button className={`filter-tab ${view==="overdue"?"on":""}`} onClick={()=>setView("overdue")}>⚠️ Muddati o'tgan</button>
        </div>
        <div className="toolbar-right">
          {view==="books"&&(
            <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"book"})}>
              {t.addBook}
            </button>
          )}
          {(view==="loans"||view==="overdue")&&(
            <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"loan"})}>
              + Kitob berish
            </button>
          )}
        </div>
      </div>

      {view==="books"&&(
        <>
          {cats.length>0&&(
            <div className="filter-tabs" style={{marginBottom:12}}>
              <button className={`filter-tab ${catFilter==="all"?"on":""}`} onClick={()=>setCatFilter("all")}>
                Barchasi <span className="filter-count">{books.length}</span>
              </button>
              {cats.map(c=>(
                <button key={c} className={`filter-tab ${catFilter===c?"on":""}`} onClick={()=>setCatFilter(c)}>
                  {BOOK_EMOJI[c]||"📦"} {c} <span className="filter-count">{books.filter(b=>b.category===c).length}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid3">
            {filtered.map(book=>(
              <div key={book.id} className="book-card">
                <div className="book-cover">
                  {BOOK_EMOJI[book.category]||"📖"}
                </div>
                <div className="book-body">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author||"Muallif ko'rsatilmagan"}</div>
                  {book.subject&&(
                    <Pill type="blue" style={{marginTop:4}}>{book.subject}</Pill>
                  )}
                  <div style={{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div className={`book-avail ${Number(book.available||0)>0?"green":"red"}`}>
                      {Number(book.available||0)>0?`✓ ${book.available} mavjud`:"✗ Mavjud emas"}
                    </div>
                    <span style={{fontSize:10,color:"var(--muted)"}}>Jami: {book.total_copies||1}</span>
                  </div>
                  <div className="card-actions" style={{marginTop:8}}>
                    <button className="btn btn-primary btn-sm" style={{flex:1}}
                      onClick={()=>setModal({type:"loan",row:{book_id:book.id,book_title:book.title}})}>
                      Berish
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>setModal({type:"book",row:book})}>✎</button>
                    <button className="btn btn-ghost btn-sm danger" onClick={()=>removeBook(book.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="book-card add-card" onClick={()=>setModal({type:"book"})} role="button" tabIndex={0}>
              <span className="add-card-icon">📚</span><span>Kitob qo'shish</span>
            </div>
          </div>
        </>
      )}

      {(view==="loans"||view==="overdue")&&(
        <Card>
          <table className="tbl">
            <thead>
              <tr><th>Kitob</th><th>Oluvchi</th><th>Berilgan</th><th>Muddati</th><th>Status</th><th>{t.actions}</th></tr>
            </thead>
            <tbody>
              {(view==="overdue"?loans.filter(l=>l.status==="overdue"):loans.filter(l=>l.status==="active"||l.status==="overdue")).map(loan=>(
                <tr key={loan.id} className="tbl-row">
                  <td><b style={{fontSize:12}}>{loan.book_title||"—"}</b></td>
                  <td>
                    <div><b style={{fontSize:12}}>{loan.borrower_name||"—"}</b></div>
                    <div style={{fontSize:10,color:"var(--muted)"}}>{loan.borrower_type==="student"?"Talaba":"O'qituvchi"}</div>
                  </td>
                  <td className="muted">{fmtDate(loan.issue_date)}</td>
                  <td>
                    <span style={{
                      color: new Date(loan.due_date)<new Date()&&loan.status==="active"?"var(--danger)":"var(--text)"
                    }}>{fmtDate(loan.due_date)}</span>
                  </td>
                  <td><StatusPill status={loan.status} t={t}/></td>
                  <td>
                    {loan.status==="active"&&(
                      <button className="btn btn-primary btn-sm"
                        onClick={()=>returnBook(loan.id,loan.book_id)}>
                        Qaytarildi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loans.filter(l=>view==="overdue"?l.status==="overdue":l.status==="active").length&&(
                <tr><td colSpan={6}><Empty text="Yozuvlar yo'q" icon="📚"/></td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
