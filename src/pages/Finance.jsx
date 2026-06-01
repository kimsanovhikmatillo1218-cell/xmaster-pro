import { useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart2, Download } from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import {
  Card, FinanceHeroCard, Pill, MethodBadge, CategoryBadge,
  Person, Empty, useToast, useConfirm
} from "../components/ui/index.jsx";
import { money, short, fmtFull, exportCSV } from "../lib/utils.js";

export default function Finance({ t, data, stats, sub, setSub, setModal, loadAll }) {
  const toast   = useToast();
  const confirm = useConfirm();
  const debtors = (data.students||[]).filter(s=>Number(s.balance||0)<0);

  const remove = async (table, id) => {
    if(!await confirm(t.confirmDelete)) return;
    const { error } = await db.from(table).delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("O'chirildi"); loadAll();
  };

  const SUBTABS = [
    ["home",t.payments], ["expenses",t.expenses],
    ["salary",t.salaries], ["debtors",t.debtors], ["break","Tahlil"]
  ];

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="finance-hero">
        <FinanceHeroCard title={t.income}  value={money(stats.income)}  tone="green" icon={<TrendingUp  size={24} strokeWidth={1.75} />} sub={`${(data.payments||[]).length} ta to'lov`}/>
        <FinanceHeroCard title={t.expense} value={money(stats.expense)} tone="red"   icon={<TrendingDown size={24} strokeWidth={1.75} />} sub={`${(data.expenses||[]).length} ta xarajat`}/>
        <FinanceHeroCard title={t.profit}  value={money(stats.profit)}  tone={stats.profit>=0?"blue":"red"} icon={<BarChart2 size={24} strokeWidth={1.75} />} sub="Sof daromad"/>
      </div>

      {/* Tabs */}
      <div className="page-toolbar" style={{marginBottom:14}}>
        <div className="filter-tabs">
          {SUBTABS.map(([id,label])=>(
            <button key={id} className={`filter-tab ${sub===id?"on":""}`} onClick={()=>setSub(id)}>
              {label}
              {id==="debtors"&&stats.debtors>0&&(
                <span className="nm-badge" style={{marginLeft:6}}>{stats.debtors}</span>
              )}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          {(sub==="home"||sub==="expenses")&&(
            <>
              <button className="btn btn-ghost btn-sm"
                onClick={()=>exportCSV(sub==="expenses"?data.expenses:data.payments,sub==="expenses"?"xarajatlar":"tolovlar")}>
                ⇩ Excel
              </button>
              <button className="btn btn-primary btn-sm"
                onClick={()=>setModal({type:sub==="expenses"?"expense":"payment"})}>
                {sub==="expenses"?t.addExpense:t.addPayment}
              </button>
            </>
          )}
          {sub==="salary"&&(
            <button className="btn btn-primary btn-sm" onClick={()=>setModal({type:"salary"})}>+ Maosh to'lash</button>
          )}
        </div>
      </div>

      {/* Payments */}
      {sub==="home"&&(
        <Card>
          <table className="tbl">
            <thead><tr><th>{t.date}</th><th>{t.students}</th><th>{t.group}</th><th>{t.amount}</th><th>{t.method}</th><th>Tur</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {(data.payments||[]).map(r=>(
                <tr key={r.id} className="tbl-row">
                  <td className="muted" style={{fontSize:11}}>{fmtFull(r.created_at)}</td>
                  <td><b style={{fontSize:12.5}}>{r.student_name||"—"}</b></td>
                  <td>{r.group_name?<Pill>{r.group_name}</Pill>:"—"}</td>
                  <td className="money green" style={{fontWeight:900}}>+{money(r.amount)}</td>
                  <td><MethodBadge method={r.method}/></td>
                  <td><Pill type="green">To'lov</Pill></td>
                  <td><button className="btn btn-ghost btn-xs danger" onClick={()=>remove("payments",r.id)}>✕</button></td>
                </tr>
              ))}
              {!data.payments?.length&&<tr><td colSpan={7}><Empty text="To'lovlar yo'q" action={t.addPayment} onAction={()=>setModal({type:"payment"})}/></td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {/* Expenses */}
      {sub==="expenses"&&(
        <Card>
          <table className="tbl">
            <thead><tr><th>{t.date}</th><th>Kategoriya</th><th>{t.amount}</th><th>{t.method}</th><th>Kimga</th><th>Izoh</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {(data.expenses||[]).map(r=>(
                <tr key={r.id} className="tbl-row">
                  <td className="muted" style={{fontSize:11}}>{fmtFull(r.created_at)}</td>
                  <td><CategoryBadge cat={r.category}/></td>
                  <td className="money red" style={{fontWeight:900}}>-{money(r.amount)}</td>
                  <td><MethodBadge method={r.method}/></td>
                  <td className="muted">{r.recipient||"—"}</td>
                  <td className="muted">{r.note||"—"}</td>
                  <td><button className="btn btn-ghost btn-xs danger" onClick={()=>remove("expenses",r.id)}>✕</button></td>
                </tr>
              ))}
              {!data.expenses?.length&&<tr><td colSpan={7}><Empty text="Xarajatlar yo'q" action={t.addExpense} onAction={()=>setModal({type:"expense"})}/></td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {/* Debtors */}
      {sub==="debtors"&&(
        <Card>
          <table className="tbl">
            <thead><tr><th>{t.name}</th><th>{t.phone}</th><th>{t.group}</th><th>Qarz miqdori</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {debtors.map(s=>(
                <tr key={s.id} className="tbl-row">
                  <td><Person name={s.full_name} sub={s.phone}/></td>
                  <td>{s.phone||"—"}</td>
                  <td>{s.group_name?<Pill>{s.group_name}</Pill>:"—"}</td>
                  <td className="money red" style={{fontWeight:900}}>{money(Math.abs(Number(s.balance||0)))}</td>
                  <td>
                    <button className="btn btn-primary btn-sm"
                      onClick={()=>setModal({type:"payment",row:{student_name:s.full_name,group_name:s.group_name}})}>
                      + To'lov
                    </button>
                  </td>
                </tr>
              ))}
              {!debtors.length&&<tr><td colSpan={5}><Empty text="Qarzdorlar yo'q 🎉" icon="✓"/></td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {/* Salary */}
      {sub==="salary"&&(
        <div className="grid2">
          <Card>
            <table className="tbl">
              <thead><tr><th>{t.teacher}</th><th>Fan</th><th>Maosh turi</th><th>Maosh</th><th>{t.status}</th></tr></thead>
              <tbody>
                {(data.teachers||[]).map(r=>(
                  <tr key={r.id} className="tbl-row">
                    <td><Person name={r.full_name} sub={r.phone}/></td>
                    <td>{r.subject?<Pill>{r.subject}</Pill>:"—"}</td>
                    <td className="muted">{r.salary_type||"—"}</td>
                    <td className="money green">{money(r.salary_value)}</td>
                    <td><Pill type={r.status==="active"?"green":"orange"}>{r.status==="active"?"Faol":"Nofaol"}</Pill></td>
                  </tr>
                ))}
                {!data.teachers?.length&&<tr><td colSpan={5}><Empty text="O'qituvchilar yo'q"/></td></tr>}
              </tbody>
            </table>
          </Card>
          <Card className="pad">
            <div style={{fontWeight:800,fontSize:13,marginBottom:14}}>💳 Maosh tarixi</div>
            {(data.salary_payments||[]).slice(0,10).map(sp=>(
              <div key={sp.id} className="fin-row">
                <div className="fin-name"><b>{sp.teacher_name||"—"}</b><small>{sp.period||fmtFull(sp.created_at)}</small></div>
                <div className="fin-amt green">+{money(sp.amount)}</div>
              </div>
            ))}
            {!data.salary_payments?.length&&<Empty text="Maosh to'lovlari yo'q"/>}
          </Card>
        </div>
      )}

      {/* Break-even */}
      {sub==="break"&&(
        <div className="grid2">
          <Card className="pad">
            <div style={{fontWeight:800,fontSize:13,marginBottom:14}}>📊 Moliyaviy tahlil</div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[
                ["Jami daromad",<span style={{color:"var(--success)",fontWeight:900}}>{money(stats.income)}</span>],
                ["Jami xarajatlar",<span style={{color:"var(--danger)",fontWeight:900}}>{money(stats.expense)}</span>],
                ["Sof foyda",<span style={{color:stats.profit>=0?"var(--success)":"var(--danger)",fontWeight:900}}>{money(stats.profit)}</span>],
                ["Qarzdorlar jami",<span style={{color:"var(--danger)",fontWeight:900}}>{money(stats.debt)}</span>],
                ["To'lovlar soni",`${(data.payments||[]).length} ta`],
                ["Xarajatlar soni",`${(data.expenses||[]).length} ta`],
              ].map(([l,r])=>(
                <div key={l} className="line"><span>{l}</span><b>{r}</b></div>
              ))}
            </div>
          </Card>
          <Card className="pad">
            <div style={{fontWeight:800,fontSize:13,marginBottom:14}}>🏫 Tizim ma'lumotlari</div>
            {[
              ["Faol talabalar",(data.students||[]).filter(s=>(s.status||"active")==="active").length],
              ["Guruhlar soni",(data.study_groups||[]).length],
              ["O'qituvchilar",(data.teachers||[]).length],
              ["Oylik maoshlar jami",money((data.teachers||[]).reduce((a,tc)=>a+Number(tc.salary_value||0),0))],
              ["Kutubxona kitoblari",(data.library_books||[]).length],
              ["Testlar",(data.tests||[]).length],
            ].map(([l,r])=>(
              <div key={l} className="line"><span>{l}</span><b>{r}</b></div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
