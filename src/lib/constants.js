export const TABLES = [
  "branches","study_groups","teachers","students",
  "payments","expenses","attendance","schedules",
  "leads","notifications","settings","rooms",
  "tests","test_questions","test_results",
  "homework","grades","library_books","library_loans",
  "resources","tasks","salary_payments"
];

export const ORDERED_TABLES = new Set([
  "students","payments","expenses","attendance",
  "leads","notifications","schedules","tasks",
  "library_loans","test_results","grades","homework"
]);

export const PAGES = [
  { id:"dash",      key:"dashboard",   icon:"⊞",  group:"main" },
  { id:"students",  key:"students",    icon:"👥",  group:"main" },
  { id:"groups",    key:"groups",      icon:"🎓",  group:"main" },
  { id:"teachers",  key:"teachers",    icon:"🧑‍🏫", group:"main" },
  { id:"finance",   key:"finance",     icon:"💳",  group:"main" },
  { id:"attend",    key:"attendance",  icon:"✓",   group:"edu"  },
  { id:"sched",     key:"schedule",    icon:"📅",  group:"edu"  },
  { id:"tests",     key:"tests",       icon:"📝",  group:"edu"  },
  { id:"homework",  key:"homework",    icon:"📚",  group:"edu"  },
  { id:"grades",    key:"grades",      icon:"⭐",  group:"edu"  },
  { id:"library",   key:"library",     icon:"📖",  group:"res"  },
  { id:"resources", key:"resources",   icon:"🗂",  group:"res"  },
  { id:"leads",     key:"leads",       icon:"📣",  group:"crm", dot:true },
  { id:"tasks",     key:"tasks",       icon:"✅",  group:"crm"  },
  { id:"reports",   key:"reports",     icon:"📊",  group:"sys"  },
  { id:"settings",  key:"settings",    icon:"⚙️",  group:"sys"  },
];

export const LEAD_STAGES = [
  { id:"new",      label:"Yangi so'rov",    color:"blue"   },
  { id:"contact",  label:"Bog'lanildi",     color:"orange" },
  { id:"trial",    label:"Sinov darsi",     color:"purple" },
  { id:"enrolled", label:"Yozildi",         color:"green"  },
  { id:"lost",     label:"Yo'qotildi",      color:"red"    },
];

export const WEEK_DAYS = ["Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba","Yakshanba"];
export const TIMES = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

export const EXPENSE_CATS = [
  {v:"rent",      l:"🏠 Ijara"},
  {v:"salary",    l:"👤 Maosh"},
  {v:"utility",   l:"⚡ Kommunal"},
  {v:"equipment", l:"🖥 Jihozlar"},
  {v:"marketing", l:"📣 Marketing"},
  {v:"repair",    l:"🔧 Ta'mirlash"},
  {v:"other",     l:"📦 Boshqa"},
];

export const PAYMENT_METHODS = [
  {v:"cash",     l:"💵 Naqd"},
  {v:"card",     l:"💳 Karta"},
  {v:"transfer", l:"🏦 O'tkazma"},
  {v:"online",   l:"📱 Online"},
];

export const SALARY_TYPES = [
  {v:"fixed",   l:"Belgilangan"},
  {v:"percent", l:"Foiz (%)"},
  {v:"hourly",  l:"Soatbay"},
];

export const BOOK_CATS = [
  {v:"textbook",  l:"📘 Darslik"},
  {v:"fiction",   l:"📕 Badiiy"},
  {v:"reference", l:"📗 Ma'lumotnoma"},
  {v:"magazine",  l:"📰 Jurnal"},
  {v:"other",     l:"📦 Boshqa"},
];

export const RES_TYPES = [
  {v:"document", l:"📄 Hujjat", icon:"📄", bg:"#eff6ff"},
  {v:"video",    l:"🎬 Video",  icon:"🎬", bg:"#fef2f2"},
  {v:"audio",    l:"🎵 Audio",  icon:"🎵", bg:"#fdf4ff"},
  {v:"link",     l:"🔗 Havola", icon:"🔗", bg:"#f0fdf4"},
  {v:"image",    l:"🖼 Rasm",   icon:"🖼", bg:"#fffbeb"},
  {v:"other",    l:"📦 Boshqa", icon:"📦", bg:"#f1f5f9"},
];

export const PRIORITY_OPTS = [
  {v:"low",    l:"⬇ Past",    color:"muted"},
  {v:"medium", l:"➡ O'rta",   color:"blue"},
  {v:"high",   l:"⬆ Yuqori",  color:"orange"},
  {v:"urgent", l:"🔴 Shoshilinch", color:"red"},
];

export const PER_PAGE = 25;
