import { useMemo, useState } from "react";
import {
  StatCard, Card, SectionHeader, Mini, FinanceLine,
  GroupLine, Notice, ProgressBar, Pill, Empty, FinanceHeroCard
} from "../components/ui/index.jsx";
import { money, short, fmtDate, attRate } from "../lib/utils.js";
import { LEAD_STAGES } from "../lib/constants.js";

export default function Dashboard({ t, data, stats, sub, setSub, setModal, nav, markAllRead }) {
  if (sub === "analytics")     return <Analytics     t={t} data={data} stats={stats} nav={nav} />;
  if (sub === "notifications") return <Notifications t={t} data={data} markAllRead={markAllRead} />;

  const recentAtt = attRate(data.attendance);

  return (
    <div className="page-enter">
      {/* KPI */}
      <div className="summary-strip">
        <StatCard label={t.students}    value={stats.active}           icon="👥" tone="blue"   onClick={()=>nav("students")} trend="+2 bu oy"/>
        <StatCard label={t.income}      value={short(stats.income)}    icon="💰" tone="green"  onClick={()=>nav("finance")}  trend="so'm"/>
        <StatCard label={t.debtors}     value={stats.debtors}          icon="⚠️" tone="red"    sub={money(stats.debt)}/>
        <StatCard label={t.newLeads}    value={data.leads?.length||0}  icon="📣" tone="purple" onClick={()=>nav("leads")} trend={`${data.leads?.filter(l=>l.stage==="new").length||0} yangi`}/>
      </div>

      <div className="grid2">
        {/* Left */}
        <section style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <SectionHeader title={t.recentPayments} action={t.all} onAction={()=>nav("finance")}/>
            <Card>
              {(data.payments||[]).slice(0,6).map(p=>(
                <FinanceLine key={p.id} name={p.student_name} sub={p.group_name}
                  amount={money(p.amount)} date={fmtDate(p.created_at)}/>
              ))}
              {!data.payments?.length&&<Empty text="To'lovlar mavjud emas" action="+ To'lov" onAction={()=>setModal({type:"payment"})}/>}
            </Card>
          </div>

          <div>
            <SectionHeader title={t.groupStatus} action={t.all} onAction={()=>nav("groups")}/>
            <Card>
              {(data.study_groups||[]).slice(0,5).map(g=>(
                <GroupLine key={g.id} g={g} count={(data.students||[]).filter(s=>s.group_name===g.name).length}/>
              ))}
              {!data.study_groups?.length&&<Empty text="Guruhlar mavjud emas" action="+ Guruh" onAction={()=>setModal({type:"group"})}/>}
            </Card>
          </div>
        </section>

        {/* Right */}
        <section style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <SectionHeader title={t.systemMessages} action={t.markAllRead} onAction={markAllRead}/>
            <Card>
              {(data.notifications||[]).slice(0,6).map(n=><Notice key={n.id} n={n}/>)}
              {!data.notifications?.length&&<Empty text="Bildirishnomalar yo'q" icon="🔔"/>}
            </Card>
          </div>

          <div className="grid2 mini-grid">
            <Mini title={t.attendance} value={`${recentAtt}%`}       tone="green"  sub="O'rtacha davomat"/>
            <Mini title={t.profit}     value={short(stats.profit)}    tone={stats.profit>=0?"blue":"red"} sub="Sof foyda"/>
            <Mini title={t.groups}     value={stats.groups||0}        tone="purple" sub="Faol guruhlar"/>
            <Mini title={t.teachers}   value={stats.teachers||0}      tone="cyan"   sub="O'qituvchilar"/>
          </div>

          {/* Quick actions */}
          <Card className="pad">
            <div style={{fontWeight:800,fontSize:12,color:"var(--text-sub)",marginBottom:10}}>⚡ Tezkor amallar</div>
            <div className="qa-grid">
              {[
                {icon:"💳",label:"To'lov qabul",   modal:{type:"payment"}},
                {icon:"👤",label:"Talaba qo'sh",    modal:{type:"student"}},
                {icon:"📣",label:"Lid qo'sh",       modal:{type:"lead"}},
                {icon:"💸",label:"Xarajat",         modal:{type:"expense"}},
                {icon:"📝",label:"Test yarat",       modal:{type:"test"}},
                {icon:"📖",label:"Kitob qo'sh",     modal:{type:"book"}},
              ].map(a=>(
                <button key={a.label} className="qa-btn" onClick={()=>setModal(a.modal)}>
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

/* ── Analytics ──────────────────────────────────────────────────── */
function Analytics({ t, data, stats }) {
  const byMonth = useMemo(()=>{
    const map={};
    (data.payments||[]).forEach(r=>{if(!r.created_at)return;const m=r.created_at.slice(0,7);if(!map[m])map[m]={income:0,expense:0};map[m].income+=Number(r.amount||0);});
    (data.expenses||[]).forEach(r=>{if(!r.created_at)return;const m=r.created_at.slice(0,7);if(!map[m])map[m]={income:0,expense:0};map[m].expense+=Number(r.amount||0);});
    return Object.entries(map).sort().slice(-6);
  },[data]);
  const maxVal = byMonth.length?Math.max(...byMonth.map(([,v])=>Math.max(v.income,v.expense)),1):1;
  const byStage = LEAD_STAGES.map(s=>({...s,count:(data.leads||[]).filter(l=>l.stage===s.id).length}));
  const totalLeads=(data.leads||[]).length||1;

  return (
    <div className="page-enter">
      <div className="summary-strip">
        <StatCard label="Jami talabalar"   value={(data.students||[]).length}         icon="👥" tone="blue"/>
        <StatCard label={t.income}         value={short(stats.income)}               icon="💰" tone="green"/>
        <StatCard label={t.profit}         value={short(stats.profit)}               icon="📈" tone={stats.profit>=0?"blue":"red"}/>
        <StatCard label="Davomat o'rtacha" value={`${attRate(data.attendance||[])}%`} icon="✓"  tone="purple"/>
      </div>

      <div className="grid2">
        <Card className="pad">
          <SectionHeader title="Oylik moliyaviy tahlil"/>
          {byMonth.length ? byMonth.map(([m,v])=>(
            <div key={m} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11}}>
                <span style={{fontWeight:700}}>{m}</span>
                <span>
                  <span style={{color:"var(--success)"}}>+{short(v.income)}</span>
                  {" / "}
                  <span style={{color:"var(--danger)"}}>-{short(v.expense)}</span>
                </span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <ProgressBar value={Math.round(v.income/maxVal*100)} color="green"/>
                <ProgressBar value={Math.round(v.expense/maxVal*100)} color="red"/>
              </div>
            </div>
          )):<Empty text="Moliyaviy ma'lumotlar yo'q"/>}
        </Card>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card className="pad">
            <SectionHeader title="Lidlar bosqichlari"/>
            {byStage.map(s=>(
              <div key={s.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                  <Pill type={s.color}>{s.label}</Pill>
                  <span style={{fontWeight:700}}>{s.count} ({Math.round(s.count/totalLeads*100)}%)</span>
                </div>
                <ProgressBar value={Math.round(s.count/totalLeads*100)}/>
              </div>
            ))}
          </Card>

          <Card className="pad">
            <SectionHeader title="Guruhlar bandligi"/>
            {(data.study_groups||[]).slice(0,5).map(g=>{
              const count=(data.students||[]).filter(s=>s.group_name===g.name).length;
              const cap=Number(g.capacity||15);
              const pct=Math.min(100,Math.round(count/cap*100));
              return (
                <div key={g.id} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                    <span style={{fontWeight:700}}>{g.name}</span>
                    <span style={{color:pct>=80?"var(--danger)":"var(--success)"}}>{count}/{cap}</span>
                  </div>
                  <ProgressBar value={pct}/>
                </div>
              );
            })}
            {!data.study_groups?.length&&<Empty text="Guruhlar yo'q"/>}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Notifications ───────────────────────────────────────────────── */
function Notifications({ t, data, markAllRead }) {
  const [filter,setFilter]=useState("all");
  const items = useMemo(()=>{
    if(filter==="unread") return (data.notifications||[]).filter(n=>!n.is_read);
    if(filter==="read")   return (data.notifications||[]).filter(n=>n.is_read);
    return data.notifications||[];
  },[data.notifications,filter]);
  const unreadCount=(data.notifications||[]).filter(n=>!n.is_read).length;
  return (
    <div className="page-enter">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {[["all","Barchasi"],["unread","O'qilmagan"],["read","O'qilgan"]].map(([v,l])=>(
            <button key={v} className={`filter-tab ${filter===v?"on":""}`} onClick={()=>setFilter(v)}>
              {l}{v==="unread"&&unreadCount>0&&<span className="filter-count">{unreadCount}</span>}
            </button>
          ))}
        </div>
        {unreadCount>0&&<button className="btn btn-ghost btn-sm" onClick={markAllRead}>{t.markAllRead}</button>}
      </div>
      <Card>
        {items.map(n=><Notice key={n.id} n={n}/>)}
        {!items.length&&<Empty text="Bildirishnomalar yo'q" icon="🔔"/>}
      </Card>
    </div>
  );
}
