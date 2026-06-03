import { useState, useEffect } from "react";

export const sum      = (a, k) => (a||[]).reduce((s,x)=>s+Number(x[k]||0),0);
export const money    = (n)    => new Intl.NumberFormat("uz-UZ").format(Number(n||0))+" so'm";
export const short    = (n)    => { n=Number(n||0); if(Math.abs(n)>=1_000_000) return (n/1_000_000).toFixed(1)+"M"; if(Math.abs(n)>=1_000) return Math.round(n/1_000)+"K"; return String(n); };
export const initials = (s="") => s.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"XM";
export const fmtDate  = (d)    => { if(!d) return "—"; try{ const dt=new Date(d); if(isNaN(dt)) return "—"; return dt.toLocaleDateString("ru-RU",{day:"2-digit",month:"short"}); }catch{return "—"}; };
export const fmtFull  = (d)    => { if(!d) return "—"; try{ const dt=new Date(d); if(isNaN(dt)) return "—"; return dt.toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:"numeric"}); }catch{return "—"}; };
export const fmtTime  = (d)    => { if(!d) return "—"; const dt=new Date(d); return dt.toLocaleTimeString("uz-UZ",{hour:"2-digit",minute:"2-digit"}); };
export const attRate  = (rows) => { if(!rows?.length) return 0; return Math.round(rows.filter(r=>r.status==="present").length/rows.length*100); };
export const gradeColor = (score, max=10) => { const pct=score/max*100; return pct>=80?"green":pct>=60?"orange":"red"; };

/* Column label maps for clean export headers */
const COL_LABELS = {
  full_name:"FISH", student_name:"Talaba", teacher_name:"O'qituvchi",
  phone:"Telefon", group_name:"Guruh", amount:"Summa", method:"Usul",
  status:"Holat", created_at:"Sana", balance:"Balans", subject:"Fan",
  salary_type:"Maosh turi", salary_value:"Maosh", source:"Manba",
  stage:"Bosqich", lesson_date:"Dars sanasi", period:"Davr",
  category:"Kategoriya", recipient:"Kimga", note:"Izoh",
  start_time:"Boshlanish", end_time:"Tugash", day_name:"Kun",
  title:"Sarlavha", score:"Ball", max_score:"Maks ball",
  due_date:"Muddat", priority:"Muhimlik", assigned_to:"Tayinlangan",
};

export const exportCSV = (rows, name, colMap) => {
  if(!rows?.length) return;
  const map  = colMap || COL_LABELS;
  const keys = Object.keys(rows[0]).filter(k => !["id","__v"].includes(k));
  const headers = keys.map(k => map[k] || k);
  const formatVal = (k, v) => {
    if(v == null) return "";
    if(k === "amount" || k === "salary_value" || k === "balance")
      return new Intl.NumberFormat("uz-UZ").format(Number(v));
    if(k === "created_at" || k === "lesson_date" || k === "due_date")
      return v ? new Date(v).toLocaleDateString("uz-UZ") : "";
    if(typeof v === "boolean") return v ? "Ha" : "Yo'q";
    return String(v);
  };
  const BOM = "﻿"; // UTF-8 BOM for Excel to detect encoding
  const csv = BOM + [
    headers.join(","),
    ...rows.map(r => keys.map(k => {
      const val = formatVal(k, r[k]);
      return `"${val.replace(/"/g,'""')}"`;
    }).join(","))
  ].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = name + "_" + new Date().toISOString().slice(0,10) + ".csv";
  a.click();
};

export const useDebounce = (value, delay=300) => {
  const [dv, setDv] = useState(value);
  useEffect(()=>{ const t=setTimeout(()=>setDv(value),delay); return()=>clearTimeout(t); },[value,delay]);
  return dv;
};

export const CHART_COLORS = ["#2563eb","#16a34a","#dc2626","#7c3aed","#0891b2","#d97706"];
