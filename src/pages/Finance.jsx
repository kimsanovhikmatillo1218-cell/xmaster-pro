import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, BarChart2, Download, Printer, X } from "lucide-react";
import { supabase as db } from "../lib/supabase.js";
import {
  Card, FinanceHeroCard, Pill, MethodBadge, CategoryBadge,
  Person, Empty, useToast, useConfirm
} from "../components/ui/index.jsx";
import { money, short, fmtFull, exportCSV } from "../lib/utils.js";

export default function Finance({ t, data, stats, sub, setSub, setModal, loadAll }) {
  const toast    = useToast();
  const confirm  = useConfirm();
  const debtors  = (data.students||[]).filter(s=>Number(s.balance||0)<0);
  const [receipt, setReceipt] = useState(null);

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
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost btn-xs" title="Chek" onClick={()=>setReceipt(r)}>
                        <Printer size={11}/>
                      </button>
                      <button className="btn btn-ghost btn-xs danger" onClick={()=>remove("payments",r.id)}>✕</button>
                    </div>
                  </td>
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
      {sub==="debtors"&&<DebtorsTab data={data} setModal={setModal} money={money}/>}

      {/* Salary */}
      {sub==="salary"&&<SalaryTab data={data} setModal={setModal} loadAll={loadAll} money={money} />}

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

      {receipt && <ReceiptModal r={receipt} center={(data.settings||[])[0]} onClose={()=>setReceipt(null)}/>}
    </div>
  );
}

/* ── Receipt Modal ──────────────────────────────────────────────── */
function ReceiptModal({ r, center, onClose }) {
  const centerName = center?.center_name || "X-MASTER Pro";
  const centerPhone = center?.phone || "";
  const centerAddress = center?.address || "";
  const receiptNo = `REC-${String(r.id||"").slice(0,8).toUpperCase()||Math.floor(Math.random()*99999)}`;
  const now = new Date();

  const printReceipt = () => {
    const w = window.open("","_blank","width=400,height=600");
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>To'lov cheki — ${receiptNo}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:20px}
        .receipt{max-width:320px;margin:0 auto;border:1.5px dashed #ccc;border-radius:8px;padding:20px}
        .header{text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1.5px dashed #ddd}
        .logo{font-size:22px;font-weight:900;color:#4f6ef7;letter-spacing:-1px}
        .center-name{font-size:12px;color:#666;margin-top:2px}
        .receipt-no{display:inline-block;background:#f1f5f9;border-radius:5px;padding:3px 10px;font-size:11px;font-weight:700;color:#64748b;margin-top:8px}
        .section{margin:12px 0}
        .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #f0f0f0}
        .row:last-child{border-bottom:none}
        .label{color:#666;font-size:12px}
        .value{font-weight:600;font-size:12px;text-align:right}
        .amount-section{background:#f0fdf4;border-radius:8px;padding:12px;margin:14px 0;text-align:center}
        .amount-label{font-size:11px;color:#666;margin-bottom:4px}
        .amount-value{font-size:24px;font-weight:900;color:#10b981}
        .footer{text-align:center;margin-top:16px;padding-top:12px;border-top:1.5px dashed #ddd;font-size:11px;color:#999}
        .paid-stamp{display:inline-block;border:2px solid #10b981;color:#10b981;font-weight:900;font-size:13px;padding:4px 14px;border-radius:6px;transform:rotate(-5deg);margin-top:8px;letter-spacing:1px}
        @media print{body{padding:0}.receipt{border:none;border-radius:0}}
      </style>
    </head><body>
      <div class="receipt">
        <div class="header">
          <div class="logo">XM</div>
          <div class="center-name">${centerName}</div>
          ${centerAddress ? `<div style="font-size:11px;color:#999;margin-top:2px">${centerAddress}</div>` : ""}
          ${centerPhone ? `<div style="font-size:11px;color:#999">${centerPhone}</div>` : ""}
          <div class="receipt-no"># ${receiptNo}</div>
        </div>

        <div class="section">
          <div class="row"><span class="label">Sana</span><span class="value">${now.toLocaleDateString("uz-UZ",{day:"2-digit",month:"long",year:"numeric"})}</span></div>
          <div class="row"><span class="label">Vaqt</span><span class="value">${now.toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit"})}</span></div>
          <div class="row"><span class="label">Talaba</span><span class="value">${r.student_name||"—"}</span></div>
          ${r.group_name ? `<div class="row"><span class="label">Guruh</span><span class="value">${r.group_name}</span></div>` : ""}
          <div class="row"><span class="label">To'lov turi</span><span class="value">${r.type==="tuition"?"O'qish to'lovi":r.type==="registration"?"Ro'yxatdan o'tish":r.type||"To'lov"}</span></div>
          <div class="row"><span class="label">Usul</span><span class="value">${r.method==="cash"?"💵 Naqd":r.method==="card"?"💳 Karta":r.method==="transfer"?"🏦 O'tkazma":r.method||"—"}</span></div>
          ${r.period ? `<div class="row"><span class="label">Davr</span><span class="value">${r.period}</span></div>` : ""}
          ${r.note ? `<div class="row"><span class="label">Izoh</span><span class="value">${r.note}</span></div>` : ""}
        </div>

        <div class="amount-section">
          <div class="amount-label">TO'LANGAN SUMMA</div>
          <div class="amount-value">${new Intl.NumberFormat("uz-UZ").format(Number(r.amount||0))} so'm</div>
        </div>

        <div style="text-align:center"><span class="paid-stamp">✓ TO'LANGAN</span></div>

        <div class="footer">
          <div>${centerName} · ${now.getFullYear()}</div>
          <div style="margin-top:4px;font-size:10px">Ushbu chek to'lov tasdig'i hisoblanadi</div>
        </div>
      </div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
    w.document.close();
  };

  const METHOD_LABEL = { cash:"💵 Naqd", card:"💳 Karta", transfer:"🏦 O'tkazma", online:"📱 Online" };
  const TYPE_LABEL   = { tuition:"O'qish to'lovi", registration:"Ro'yxatdan o'tish", other:"Boshqa" };

  return (
    <div className="backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:360,padding:0,overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#4f6ef7,#7c3aed)",padding:"20px 24px 16px",color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,opacity:.7,letterSpacing:1}}>TO'LOV CHEKI</div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <X size={13}/>
            </button>
          </div>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:26,fontWeight:900,letterSpacing:"-.5px"}}>
            {new Intl.NumberFormat("uz-UZ").format(Number(r.amount||0))} <span style={{fontSize:14,opacity:.8}}>so'm</span>
          </div>
          <div style={{fontSize:11,opacity:.65,marginTop:4}}>#{receiptNo} · {new Date(r.created_at||Date.now()).toLocaleDateString("uz-UZ",{day:"2-digit",month:"long",year:"numeric"})}</div>
        </div>

        {/* Body */}
        <div style={{padding:"16px 24px"}}>
          {[
            ["Talaba",     r.student_name||"—"],
            ["Guruh",      r.group_name||"—"],
            ["To'lov turi",TYPE_LABEL[r.type]||r.type||"To'lov"],
            ["Usul",       METHOD_LABEL[r.method]||r.method||"—"],
            ["Davr",       r.period||"—"],
            ["Izoh",       r.note||"—"],
          ].filter(([,v])=>v&&v!=="—").map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px dashed var(--line2)"}}>
              <span style={{fontSize:12,color:"var(--t4)"}}>{l}</span>
              <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:14,padding:"10px 14px",background:"var(--green-bg)",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>✅</span>
            <span style={{fontWeight:700,color:"var(--green)",fontSize:13}}>To'lov tasdiqlangan</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 24px",borderTop:"1px solid var(--line)",display:"flex",gap:8}}>
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>Yopish</button>
          <button className="btn btn-primary" style={{flex:1,gap:6}} onClick={printReceipt}>
            <Printer size={13}/> Chek chiqarish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Debtors + Monthly Invoice Tab ─────────────────────────────── */
function DebtorsTab({ data, setModal, money }) {
  const now   = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [tab, setTab] = useState("debtors"); // "debtors" | "invoice"

  const debtors = useMemo(()=>
    (data.students||[]).filter(s=>Number(s.balance||0)<0)
      .sort((a,b)=>Number(a.balance||0)-Number(b.balance||0)),
    [data.students]);

  const totalDebt = debtors.reduce((s,d)=>s+Math.abs(Number(d.balance||0)),0);

  // Oylik to'lov qilmagan talabalar: guruh narxi bor, bu oyda to'lov yo'q
  const unpaidThisMonth = useMemo(()=>{
    const paid = new Set(
      (data.payments||[])
        .filter(p=>(p.created_at||"").startsWith(month))
        .map(p=>p.student_name)
    );
    return (data.students||[])
      .filter(s=>(s.status||"active")==="active" && !paid.has(s.full_name))
      .map(s=>{
        const grp = (data.study_groups||[]).find(g=>g.name===s.group_name);
        const price = Number(grp?.price||0);
        const discount = Number(s.discount||0);
        const due = Math.round(price*(1-discount/100));
        return {...s, due, grp};
      })
      .filter(s=>s.due>0)
      .sort((a,b)=>b.due-a.due);
  },[data,month]);

  const totalDue = unpaidThisMonth.reduce((s,x)=>s+x.due,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Summary + tabs */}
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6}}>
          <button className={`filter-tab ${tab==="debtors"?"on":""}`} onClick={()=>setTab("debtors")}>
            ⚠️ Qarzdorlar <span className="nm-badge" style={{marginLeft:6}}>{debtors.length}</span>
          </button>
          <button className={`filter-tab ${tab==="invoice"?"on":""}`} onClick={()=>setTab("invoice")}>
            📋 {month.slice(5)} oy — to'lamagan <span className="nm-badge blue" style={{marginLeft:6}}>{unpaidThisMonth.length}</span>
          </button>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {tab==="debtors"&&(
            <div style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:700,color:"#dc2626"}}>
              Jami qarz: {money(totalDebt)}
            </div>
          )}
          {tab==="invoice"&&(
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:700,color:"#d97706"}}>
              Kutilayotgan: {money(totalDue)}
            </div>
          )}
        </div>
      </div>

      {/* Qarzdorlar */}
      {tab==="debtors"&&(
        <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"var(--r)",overflow:"hidden",boxShadow:"var(--sh1)"}}>
          <table className="tbl">
            <thead><tr><th>Talaba</th><th>Telefon</th><th>Guruh</th><th>Qarz miqdori</th><th>Holat</th><th>Amal</th></tr></thead>
            <tbody>
              {debtors.map(s=>{
                const qarz = Math.abs(Number(s.balance||0));
                const severity = qarz>500000?"high":qarz>200000?"medium":"low";
                return (
                  <tr key={s.id} className="tbl-row"
                    style={{borderLeft:`3px solid ${severity==="high"?"var(--red)":severity==="medium"?"var(--orange)":"var(--yellow)"}`}}>
                    <td><Person name={s.full_name} sub={s.phone}/></td>
                    <td style={{fontSize:12}}>{s.phone||"—"}</td>
                    <td>{s.group_name?<Pill>{s.group_name}</Pill>:"—"}</td>
                    <td>
                      <span style={{fontWeight:900,color:"var(--red)",fontVariantNumeric:"tabular-nums",fontSize:13}}>
                        {money(qarz)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding:"3px 9px",borderRadius:20,fontSize:10.5,fontWeight:700,
                        background:severity==="high"?"#fee2e2":severity==="medium"?"#fff7ed":"#fffbeb",
                        color:severity==="high"?"#dc2626":severity==="medium"?"#ea580c":"#d97706"
                      }}>
                        {severity==="high"?"Kritik":severity==="medium"?"O'rta":"Kichik"}
                      </span>
                    </td>
                    <td>
                      <div style={{display:"flex",gap:5}}>
                        <button className="btn btn-primary btn-xs"
                          onClick={()=>setModal({type:"payment",row:{student_name:s.full_name,group_name:s.group_name,amount:qarz}})}>
                          + To'lov
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!debtors.length&&(
                <tr><td colSpan={6}>
                  <div style={{padding:"40px",textAlign:"center"}}>
                    <div style={{fontSize:36}}>🎉</div>
                    <div style={{fontWeight:700,color:"var(--green)",marginTop:8}}>Barcha talabalar to'lagan!</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bu oy to'lamagan */}
      {tab==="invoice"&&(
        <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"var(--r)",overflow:"hidden",boxShadow:"var(--sh1)"}}>
          <table className="tbl">
            <thead><tr><th>Talaba</th><th>Telefon</th><th>Guruh</th><th>Narx</th><th>Chegirma</th><th>To'lash kerak</th><th>Amal</th></tr></thead>
            <tbody>
              {unpaidThisMonth.map(s=>(
                <tr key={s.id} className="tbl-row">
                  <td><Person name={s.full_name} sub={s.phone}/></td>
                  <td style={{fontSize:12}}>{s.phone||"—"}</td>
                  <td>{s.group_name?<Pill>{s.group_name}</Pill>:"—"}</td>
                  <td style={{fontVariantNumeric:"tabular-nums",color:"var(--t3)"}}>{money(s.grp?.price||0)}</td>
                  <td>{s.discount?<Pill type="green">{s.discount}%</Pill>:"—"}</td>
                  <td style={{fontWeight:900,color:"var(--orange)",fontVariantNumeric:"tabular-nums"}}>{money(s.due)}</td>
                  <td>
                    <button className="btn btn-primary btn-xs"
                      onClick={()=>setModal({type:"payment",row:{student_name:s.full_name,group_name:s.group_name,amount:s.due,period:month}})}>
                      + To'lov
                    </button>
                  </td>
                </tr>
              ))}
              {!unpaidThisMonth.length&&(
                <tr><td colSpan={7}>
                  <div style={{padding:"40px",textAlign:"center"}}>
                    <div style={{fontSize:36}}>✅</div>
                    <div style={{fontWeight:700,color:"var(--green)",marginTop:8}}>Bu oy hammasi to'lagan!</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Salary calculation tab ─────────────────────────────────────── */
function SalaryTab({ data, setModal, loadAll, money }) {
  const toast = useToast();
  const now   = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);

  const rows = useMemo(() => {
    return (data.teachers || []).map(tc => {
      const groups   = (data.study_groups || []).filter(g => g.teacher_name === tc.full_name);
      const groupIncome = (data.payments || [])
        .filter(p => groups.some(g => g.name === p.group_name) && (p.created_at||"").startsWith(month))
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      let expected = 0;
      if (tc.salary_type === "percent")
        expected = Math.round(groupIncome * (Number(tc.salary_value || 0) / 100));
      else if (tc.salary_type === "hourly") {
        const lessons = (data.attendance || []).filter(a =>
          groups.some(g => g.name === a.group_name) && (a.lesson_date||"").startsWith(month)
        ).length;
        expected = lessons * Number(tc.salary_value || 0);
      } else {
        expected = Number(tc.salary_value || 0);
      }

      const paid = (data.salary_payments || [])
        .filter(sp => sp.teacher_name === tc.full_name && (sp.period || sp.created_at || "").startsWith(month))
        .reduce((s, sp) => s + Number(sp.amount || 0), 0);

      return { ...tc, expected, paid, remaining: Math.max(0, expected - paid), groupIncome, groups: groups.length };
    });
  }, [data, month]);

  const totalExpected  = rows.reduce((s, r) => s + r.expected,   0);
  const totalPaid      = rows.reduce((s, r) => s + r.paid,       0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining,  0);

  const MONTHS = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:8 }}>
          {MONTHS.map(m => (
            <button key={m} className={`filter-tab ${month===m?"on":""}`} onClick={() => setMonth(m)}
              style={{ fontSize:11 }}>
              {m.slice(5)} / {m.slice(0,4)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ type:"salary" })}>
          + Maosh to'lash
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {[
          ["Jami hisoblangan", money(totalExpected),  "var(--brand)"],
          ["To'langan",        money(totalPaid),      "var(--green)"],
          ["Qolgan",           money(totalRemaining), totalRemaining > 0 ? "var(--red)" : "var(--green)"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r-sm)", padding:"14px 16px", boxShadow:"var(--sh1)" }}>
            <div style={{ fontSize:11, color:"var(--t4)", fontWeight:600 }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:900, color:c, marginTop:4, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Teachers table */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", overflow:"hidden", boxShadow:"var(--sh1)" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>O'qituvchi</th>
              <th>Fan</th>
              <th>Tur</th>
              <th>Guruhlar daromadi</th>
              <th>Hisoblangan</th>
              <th>To'langan</th>
              <th>Qolgan</th>
              <th>Holat</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const pct = r.expected > 0 ? Math.round(r.paid / r.expected * 100) : 0;
              return (
                <tr key={r.id} className="tbl-row">
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:"var(--brand3)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, color:"var(--brand)", flexShrink:0 }}>
                        {(r.full_name||"?").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:12.5 }}>{r.full_name}</div>
                        <div style={{ fontSize:10.5, color:"var(--t4)" }}>{r.phone||"—"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.subject ? <span className="pill pill-blue">{r.subject}</span> : "—"}</td>
                  <td>
                    <span style={{ fontSize:11, color:"var(--t3)", fontWeight:600 }}>
                      {r.salary_type==="percent" ? `${r.salary_value}%` : r.salary_type==="hourly" ? `${money(r.salary_value)}/soat` : "Belgilangan"}
                    </span>
                  </td>
                  <td style={{ fontWeight:700, color:"var(--t2)", fontVariantNumeric:"tabular-nums" }}>{money(r.groupIncome)}</td>
                  <td style={{ fontWeight:900, color:"var(--brand)", fontVariantNumeric:"tabular-nums" }}>{money(r.expected)}</td>
                  <td style={{ fontWeight:900, color:"var(--green)", fontVariantNumeric:"tabular-nums" }}>{money(r.paid)}</td>
                  <td style={{ fontWeight:900, color: r.remaining>0 ? "var(--red)" : "var(--green)", fontVariantNumeric:"tabular-nums" }}>
                    {money(r.remaining)}
                  </td>
                  <td>
                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      <div style={{ fontSize:10, fontWeight:700, color: pct>=100 ? "var(--green)" : pct>=50 ? "var(--yellow)" : "var(--red)" }}>
                        {pct}%
                      </div>
                      <div style={{ height:4, background:"var(--line)", borderRadius:4, width:60, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background: pct>=100 ? "var(--green)" : pct>=50 ? "var(--yellow)" : "var(--red)", borderRadius:4, transition:"width .3s" }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    {r.remaining > 0 && (
                      <button className="btn btn-primary btn-xs"
                        onClick={() => setModal({ type:"salary", row:{ teacher_name:r.full_name, amount:r.remaining, period:month } })}>
                        To'lash
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={9} style={{ padding:"32px", textAlign:"center", color:"var(--t4)" }}>O'qituvchilar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* History */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", padding:"16px", boxShadow:"var(--sh1)" }}>
        <div style={{ fontWeight:800, fontSize:13, marginBottom:12, color:"var(--t1)" }}>💳 Maosh to'lovlari tarixi — {month}</div>
        {(data.salary_payments||[]).filter(sp => (sp.period||sp.created_at||"").startsWith(month)).length
          ? (data.salary_payments||[]).filter(sp => (sp.period||sp.created_at||"").startsWith(month)).map(sp => (
            <div key={sp.id} className="fin-row">
              <div className="fin-name">
                <b>{sp.teacher_name||"—"}</b>
                <small style={{ color:"var(--t4)", fontSize:10.5 }}>{sp.period||fmtFull(sp.created_at)} · {sp.method||"—"}</small>
              </div>
              <div style={{ fontWeight:900, color:"var(--green)", fontVariantNumeric:"tabular-nums" }}>+{money(sp.amount)}</div>
            </div>
          ))
          : <div style={{ textAlign:"center", color:"var(--t4)", padding:"20px 0", fontSize:12 }}>Bu oyda maosh to'lovlari yo'q</div>
        }
      </div>
    </div>
  );
}
