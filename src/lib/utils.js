import { useState, useEffect } from "react";

export const sum      = (a, k) => (a||[]).reduce((s,x)=>s+Number(x[k]||0),0);
export const money    = (n)    => new Intl.NumberFormat("uz-UZ").format(Number(n||0))+" so'm";
export const short    = (n)    => { n=Number(n||0); if(Math.abs(n)>=1_000_000) return (n/1_000_000).toFixed(1)+"M"; if(Math.abs(n)>=1_000) return Math.round(n/1_000)+"K"; return String(n); };
export const initials = (s="") => s.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"XM";
export const fmtDate  = (d)    => { if(!d) return "—"; return new Date(d).toLocaleDateString("uz-UZ",{day:"2-digit",month:"short"}); };
export const fmtFull  = (d)    => { if(!d) return "—"; return new Date(d).toLocaleDateString("uz-UZ",{day:"2-digit",month:"short",year:"numeric"}); };
export const fmtTime  = (d)    => { if(!d) return "—"; const dt=new Date(d); return dt.toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit"}); };
export const attRate  = (rows) => { if(!rows?.length) return 0; return Math.round(rows.filter(r=>r.status==="present").length/rows.length*100); };
export const gradeColor = (score, max=10) => { const pct=score/max*100; return pct>=80?"green":pct>=60?"orange":"red"; };

export const exportCSV = (rows, name) => {
  if(!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map(r=>keys.map(k=>JSON.stringify(r[k]??"")).join(","))].join("\n");
  Object.assign(document.createElement("a"),{
    href:"data:text/csv;charset=utf-8,"+encodeURIComponent(csv), download:name+".csv"
  }).click();
};

export const useDebounce = (value, delay=300) => {
  const [dv, setDv] = useState(value);
  useEffect(()=>{ const t=setTimeout(()=>setDv(value),delay); return()=>clearTimeout(t); },[value,delay]);
  return dv;
};

export const CHART_COLORS = ["#2563eb","#16a34a","#dc2626","#7c3aed","#0891b2","#d97706"];
