-- ═══════════════════════════════════════════════════════════════════
-- X-MASTER PRO — Complete Database Schema v2.0
-- O'quv Markaz Boshqaruv Tizimi
-- ═══════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────
-- BRANCHES (Filiallar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists branches (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  phone       text,
  is_main     boolean default false,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- SETTINGS (Tizim sozlamalari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists settings (
  id           uuid primary key default uuid_generate_v4(),
  center_name  text default 'X-MASTER',
  phone        text,
  address      text,
  logo_url     text,
  currency     text default 'UZS',
  timezone     text default 'Asia/Tashkent',
  telegram_bot text,
  sms_api_key  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- ROOMS (Xonalar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists rooms (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  branch_id   uuid references branches(id) on delete set null,
  capacity    int default 20,
  equipment   text,
  status      text default 'available' check (status in ('available','occupied','maintenance')),
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- TEACHERS (O'qituvchilar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists teachers (
  id           uuid primary key default uuid_generate_v4(),
  full_name    text not null,
  phone        text,
  email        text,
  subject      text,
  bio          text,
  avatar_url   text,
  salary_type  text default 'fixed' check (salary_type in ('fixed','percent','hourly')),
  salary_value numeric default 0,
  hire_date    date,
  status       text default 'active' check (status in ('active','inactive','on_leave')),
  branch_id    uuid references branches(id) on delete set null,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- STUDY GROUPS (Guruhlar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists study_groups (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  subject        text,
  teacher_id     uuid references teachers(id) on delete set null,
  teacher_name   text,
  room_id        uuid references rooms(id) on delete set null,
  room_name      text,
  price          numeric default 0,
  capacity       int default 15,
  schedule_text  text,
  start_date     date,
  end_date       date,
  status         text default 'active' check (status in ('active','closed','archived')),
  branch_id      uuid references branches(id) on delete set null,
  created_at     timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- STUDENTS (Talabalar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists students (
  id              uuid primary key default uuid_generate_v4(),
  full_name       text not null,
  phone           text,
  parent_phone    text,
  email           text,
  birth_date      date,
  address         text,
  photo_url       text,
  group_id        uuid references study_groups(id) on delete set null,
  group_name      text,
  balance         numeric default 0,
  discount        numeric default 0,
  status          text default 'active' check (status in ('active','frozen','archived')),
  source          text,
  branch_id       uuid references branches(id) on delete set null,
  note            text,
  created_at      timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- PAYMENTS (To'lovlar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists payments (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid references students(id) on delete set null,
  student_name  text,
  group_id      uuid references study_groups(id) on delete set null,
  group_name    text,
  amount        numeric not null,
  method        text default 'cash' check (method in ('cash','card','transfer','online')),
  type          text default 'tuition' check (type in ('tuition','registration','other')),
  period        text,
  note          text,
  cashier       text,
  branch_id     uuid references branches(id) on delete set null,
  created_at    timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- EXPENSES (Xarajatlar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  category    text not null check (category in ('rent','salary','utility','equipment','marketing','repair','food','transport','other')),
  amount      numeric not null,
  method      text default 'cash',
  recipient   text,
  note        text,
  branch_id   uuid references branches(id) on delete set null,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- SALARY PAYMENTS (Maosh to'lovlari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists salary_payments (
  id           uuid primary key default uuid_generate_v4(),
  teacher_id   uuid references teachers(id) on delete set null,
  teacher_name text,
  amount       numeric not null,
  period       text,
  method       text default 'cash',
  note         text,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- ATTENDANCE (Davomat)
-- ───────────────────────────────────────────────────────────────────
create table if not exists attendance (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid references students(id) on delete cascade,
  student_name  text,
  group_id      uuid references study_groups(id) on delete cascade,
  group_name    text,
  lesson_date   date not null,
  status        text not null check (status in ('present','absent','late','excused')),
  note          text,
  marked_by     text,
  created_at    timestamptz default now(),
  unique(student_id, lesson_date, group_id)
);

-- ───────────────────────────────────────────────────────────────────
-- SCHEDULES (Jadval)
-- ───────────────────────────────────────────────────────────────────
create table if not exists schedules (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid references study_groups(id) on delete cascade,
  group_name   text,
  teacher_id   uuid references teachers(id) on delete set null,
  teacher_name text,
  room_id      uuid references rooms(id) on delete set null,
  room         text,
  day_name     text not null check (day_name in ('Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba','Yakshanba')),
  start_time   time not null,
  end_time     time,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- LEADS (Lidlar / CRM)
-- ───────────────────────────────────────────────────────────────────
create table if not exists leads (
  id                uuid primary key default uuid_generate_v4(),
  full_name         text not null,
  phone             text,
  parent_phone      text,
  age               int,
  source            text,
  interested_course text,
  stage             text default 'new' check (stage in ('new','contact','trial','enrolled','lost')),
  assigned_to       text,
  next_action_date  date,
  note              text,
  branch_id         uuid references branches(id) on delete set null,
  created_at        timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- TESTS (Testlar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists tests (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  subject     text,
  group_id    uuid references study_groups(id) on delete set null,
  group_name  text,
  teacher_id  uuid references teachers(id) on delete set null,
  duration    int default 60,
  total_marks int default 100,
  pass_marks  int default 60,
  test_date   date,
  status      text default 'draft' check (status in ('draft','active','completed','archived')),
  description text,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- TEST QUESTIONS (Test savollari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists test_questions (
  id           uuid primary key default uuid_generate_v4(),
  test_id      uuid references tests(id) on delete cascade,
  question     text not null,
  option_a     text,
  option_b     text,
  option_c     text,
  option_d     text,
  correct      text check (correct in ('a','b','c','d')),
  points       int default 1,
  order_num    int default 0,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- TEST RESULTS (Test natijalari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists test_results (
  id            uuid primary key default uuid_generate_v4(),
  test_id       uuid references tests(id) on delete cascade,
  student_id    uuid references students(id) on delete cascade,
  student_name  text,
  score         int default 0,
  total         int default 100,
  passed        boolean default false,
  answers       jsonb,
  duration_sec  int,
  submitted_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- GRADES (Baholar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists grades (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid references students(id) on delete cascade,
  student_name  text,
  group_id      uuid references study_groups(id) on delete set null,
  group_name    text,
  subject       text,
  grade_type    text default 'homework' check (grade_type in ('homework','test','exam','project','activity')),
  score         numeric,
  max_score     numeric default 10,
  lesson_date   date,
  comment       text,
  given_by      text,
  created_at    timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- HOMEWORK (Uy vazifalari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists homework (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  group_id     uuid references study_groups(id) on delete cascade,
  group_name   text,
  teacher_id   uuid references teachers(id) on delete set null,
  due_date     date,
  max_score    numeric default 10,
  status       text default 'active' check (status in ('active','closed')),
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- HOMEWORK SUBMISSIONS (Uy vazifasi topshirishlar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists homework_submissions (
  id           uuid primary key default uuid_generate_v4(),
  homework_id  uuid references homework(id) on delete cascade,
  student_id   uuid references students(id) on delete cascade,
  student_name text,
  file_url     text,
  note         text,
  score        numeric,
  feedback     text,
  status       text default 'submitted' check (status in ('submitted','graded','late','missing')),
  submitted_at timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- LIBRARY BOOKS (Kutubxona kitoblari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists library_books (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  author       text,
  isbn         text,
  subject      text,
  category     text default 'textbook' check (category in ('textbook','fiction','reference','magazine','other')),
  total_copies int default 1,
  available    int default 1,
  location     text,
  cover_url    text,
  status       text default 'available' check (status in ('available','unavailable')),
  branch_id    uuid references branches(id) on delete set null,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- LIBRARY LOANS (Kitob berish)
-- ───────────────────────────────────────────────────────────────────
create table if not exists library_loans (
  id           uuid primary key default uuid_generate_v4(),
  book_id      uuid references library_books(id) on delete cascade,
  book_title   text,
  borrower_id  uuid,
  borrower_name text,
  borrower_type text default 'student' check (borrower_type in ('student','teacher','other')),
  issue_date   date default current_date,
  due_date     date,
  return_date  date,
  fine_amount  numeric default 0,
  status       text default 'active' check (status in ('active','returned','overdue','lost')),
  note         text,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- RESOURCES (O'quv resurslari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists resources (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  type         text default 'document' check (type in ('document','video','audio','link','image','other')),
  subject      text,
  group_id     uuid references study_groups(id) on delete set null,
  file_url     text,
  external_url text,
  uploaded_by  text,
  size_bytes   bigint,
  downloads    int default 0,
  is_public    boolean default false,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- TASKS (Ichki vazifalar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  assigned_to  text,
  priority     text default 'medium' check (priority in ('low','medium','high','urgent')),
  status       text default 'todo' check (status in ('todo','in_progress','done','cancelled')),
  due_date     date,
  created_by   text,
  created_at   timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- NOTIFICATIONS (Bildirishnomalar)
-- ───────────────────────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  body        text,
  type        text default 'info' check (type in ('info','warning','error','payment','attendance','system')),
  target_role text default 'admin',
  is_read     boolean default false,
  link        text,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- SMS LOG (SMS yozuvlari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists sms_log (
  id          uuid primary key default uuid_generate_v4(),
  phone       text not null,
  message     text not null,
  status      text default 'pending' check (status in ('pending','sent','failed')),
  recipient   text,
  cost        numeric default 0,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);

-- ───────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ───────────────────────────────────────────────────────────────────
create index if not exists idx_students_group     on students(group_name);
create index if not exists idx_students_status    on students(status);
create index if not exists idx_payments_student   on payments(student_name);
create index if not exists idx_payments_date      on payments(created_at);
create index if not exists idx_attendance_student on attendance(student_name);
create index if not exists idx_attendance_date    on attendance(lesson_date);
create index if not exists idx_attendance_group   on attendance(group_name);
create index if not exists idx_grades_student     on grades(student_id);
create index if not exists idx_test_results_test  on test_results(test_id);
create index if not exists idx_library_loans_book on library_loans(book_id);
create index if not exists idx_library_loans_stat on library_loans(status);
create index if not exists idx_leads_stage        on leads(stage);
create index if not exists idx_notifications_read on notifications(is_read);

-- ───────────────────────────────────────────────────────────────────
-- SAMPLE DATA
-- ───────────────────────────────────────────────────────────────────
insert into branches (name, address, phone, is_main)
values ('Asosiy filial', 'Toshkent, Yunusobod t.', '+998901234567', true)
on conflict do nothing;

insert into settings (center_name, phone, address)
values ('X-MASTER Pro', '+998901234567', 'Toshkent')
on conflict do nothing;

-- ───────────────────────────────────────────────────────────────────
-- APP USERS (Tizim foydalanuvchilari)
-- ───────────────────────────────────────────────────────────────────
create table if not exists app_users (
  id          uuid primary key default uuid_generate_v4(),
  username    text not null unique,
  password    text not null,
  full_name   text,
  role        text default 'student' check (role in ('superadmin','admin','teacher','reception','student')),
  color       text default '#7c3aed',
  linked_id   uuid,
  group_name  text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

alter table app_users enable row level security;
create policy "Allow all for authenticated" on app_users for all using (true) with check (true);
