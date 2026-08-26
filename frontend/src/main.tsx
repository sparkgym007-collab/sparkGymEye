import React from "react";
import ReactDOM from "react-dom/client";
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Dumbbell,
  FileSpreadsheet,
  Home,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  Smartphone,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { attendance, members, reports } from "./data/mockData";
import "./styles.css";

const overdueMembers = members.filter((member) => member.status === "Overdue");
const dueSoonMembers = members.filter((member) => member.status === "Due soon");
const paidMembers = members.filter((member) => member.status === "Active");
const todaysAttendance = attendance.filter((entry) => entry.date === "2026-08-24");
const totalOutstanding = overdueMembers.reduce((sum, member) => sum + member.amountDue, 0);
const healthyFees = Math.round((paidMembers.length / members.length) * 100);

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function prettyDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("");
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
  fill,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "violet" | "red" | "orange" | "lime";
  fill: number;
}) {
  return (
    <article className={`stat ${tone}`}>
      <div className="stat-head">
        <div className="stat-icon">{icon}</div>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
      <div className="stat-track">
        <i style={{ width: `${fill}%` }} />
      </div>
    </article>
  );
}

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>SP<span>A</span>RK</h1>
          <p>Ignite your fitness</p>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <a href="#dashboard" className="active"><Home size={17} /> Dashboard <ChevronRight size={17} /></a>
          <a href="#members"><Users size={17} /> Members</a>
          <a href="#attendance"><CalendarCheck size={17} /> Attendance</a>
          <a href="#fees"><CreditCard size={17} /> Fees</a>
          <a href="#plans"><ReceiptText size={17} /> Plans</a>
          <a href="#reports"><FileSpreadsheet size={17} /> Reports</a>
          <a href="#overdue"><ShieldAlert size={17} /> Overdue</a>
          <a href="#trainers"><Users size={17} /> Trainers</a>
          <a href="#notices"><Bell size={17} /> Notices</a>
          <a href="#settings"><Settings size={17} /> Settings</a>
        </nav>

        <section className="gym-card">
          <Zap size={42} />
          <strong>SPARK GYM</strong>
          <span>Control Room</span>
          <p>Discipline today. Strength tomorrow. SPARK forever.</p>
        </section>

        <a className="logout" href="#logout"><LogOut size={17} /> Logout</a>
      </aside>

      <section className="dashboard">
        <header className="topbar">
          <button className="icon-button" aria-label="Open menu"><Menu size={20} /></button>
          <label className="global-search">
            <Search size={17} />
            <input placeholder="Search members..." />
            <kbd>Ctrl K</kbd>
          </label>
          <button className="icon-button notification" aria-label="Notifications">
            <Bell size={19} />
            <span>3</span>
          </button>
          <div className="profile">
            <img alt="Trainer profile" src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=96&q=80" />
            <div>
              <strong>Trainer</strong>
              <small>+91 98765 43210</small>
            </div>
            <ChevronDown size={17} />
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <h2>Welcome back, Trainer</h2>
            <p>Here's what's happening at SPARK today.</p>
          </div>
          <div className="actions">
            <button><Plus size={18} /> Add Member</button>
            <button className="primary"><CalendarCheck size={18} /> Mark Attendance</button>
          </div>
        </section>

        <section className="hero" id="dashboard">
          <div className="hero-copy">
            <span>Today at SPARK</span>
            <h3>{todaysAttendance.length} checked in, {overdueMembers.length} overdue</h3>
            <p>Thursday reports are scheduled for 10:00 AM with Excel attachment and email summary.</p>
            <button>View Full Report <ChevronRight size={17} /></button>
          </div>
          <div className="hero-ring" style={{ "--score": `${healthyFees}%` } as React.CSSProperties}>
            <div>
              <strong>{healthyFees}%</strong>
              <span>healthy fees</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard label="Members" value={String(members.length)} detail="Active enrollments" tone="violet" fill={64} icon={<Users />} />
          <StatCard label="Overdue" value={String(overdueMembers.length)} detail={`${money(totalOutstanding)} outstanding`} tone="red" fill={82} icon={<ShieldAlert />} />
          <StatCard label="Due soon" value={String(dueSoonMembers.length)} detail="Next 7 days" tone="orange" fill={48} icon={<CalendarCheck />} />
          <StatCard label="Attendance" value={String(todaysAttendance.length)} detail="Today's entries" tone="lime" fill={76} icon={<CheckCircle2 />} />
        </section>

        <section className="main-grid">
          <article className="panel members-panel" id="members">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Trainer view</span>
                <h3>Members needing attention</h3>
              </div>
              <label className="mini-search"><Search size={15} /><input placeholder="Search member..." /></label>
            </div>
            <div className="member-list">
              {members.map((member, index) => (
                <div className="member-row" key={member.rollNo}>
                  <div className={`avatar avatar-${index + 1}`}>{initials(member.name)}</div>
                  <div className="member-main">
                    <strong>{member.name}</strong>
                    <span>Roll {member.rollNo} · {member.phone}</span>
                  </div>
                  <div className="member-meta">
                    <b>{member.plan}</b>
                    <span className={`pill ${member.status.toLowerCase().replace(" ", "-")}`}>{member.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="panel-link">View All Members <ChevronRight size={17} /></button>
          </article>

          <article className="panel overdue-panel" id="fees">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Overdue queue</span>
                <h3>Fees pending</h3>
              </div>
              <button className="ghost"><Download size={16} /> Export Excel</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Due date</th>
                  <th>Amount</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {overdueMembers.map((member) => (
                  <tr key={member.rollNo}>
                    <td>{member.name}</td>
                    <td>{prettyDate(member.dueDate)}</td>
                    <td>{money(member.amountDue)}</td>
                    <td>{member.daysOverdue}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="panel-link">View All Overdue <ChevronRight size={17} /></button>
          </article>
        </section>

        <section className="lower-grid">
          <article className="panel attendance-panel" id="attendance">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Live desk</span>
                <h3>Today's attendance</h3>
              </div>
              <button className="ghost"><Smartphone size={16} /> Scan / Phone</button>
            </div>
            <div className="timeline">
              {todaysAttendance.map((entry) => (
                <div key={`${entry.rollNo}-${entry.time}`}>
                  <span>{entry.time}</span>
                  <strong>{entry.name}</strong>
                  <small>{entry.method}</small>
                </div>
              ))}
            </div>
            <button className="panel-link">View All Attendance <ChevronRight size={17} /></button>
          </article>

          <article className="phone-panel" aria-label="Member mobile preview">
            <div className="phone-shell">
              <div className="phone-top"></div>
              <h3>Hi, Priya</h3>
              <div className="validity">
                <span>Membership valid until</span>
                <strong>12 Sep 2026</strong>
              </div>
              <div className="mini-grid">
                <span>Plan <b>3 months</b></span>
                <span>Visits <b>18</b></span>
                <span>Last paid <b>{money(4500)}</b></span>
                <span>Status <b>Active</b></span>
              </div>
              <div className="mobile-nav">
                <Home size={17} />
                <CalendarCheck size={17} />
                <CreditCard size={17} />
                <Users size={17} />
              </div>
            </div>
          </article>

          <article className="panel quick-panel">
            <span className="eyebrow">Quick actions</span>
            <div className="quick-grid">
              <button><UserPlus size={22} /> Add Member</button>
              <button><CalendarCheck size={22} /> Mark Attendance</button>
              <button><CreditCard size={22} /> Collect Payment</button>
              <button><Megaphone size={22} /> Add Notice</button>
            </div>
            <div className="challenge-card">
              <strong><span>SPARK</span> Challenge</strong>
              <p>Be stronger than your strongest excuse.</p>
              <b>Let's go!</b>
            </div>
          </article>
        </section>

        <section className="panel report-panel" id="reports">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Automation</span>
              <h3>Weekly overdue report <b>ON</b></h3>
            </div>
          </div>
          <div className="report-grid">
            <div className="report-card">
              <CalendarCheck size={27} />
              <span>Schedule</span>
              <strong>Every Thursday, 10:00 AM</strong>
              <p>Excel report emailed to owner and trainer.</p>
            </div>
            <div className="report-card">
              <ClipboardList size={27} />
              <span>Last report</span>
              <strong>20 Aug 2026</strong>
              <p>{reports[0].overdueCount} overdue members, {money(reports[0].outstanding)} outstanding.</p>
            </div>
            <div className="report-card">
              <MessageCircle size={27} />
              <span>WhatsApp optional</span>
              <strong>Provider-ready later</strong>
              <p>Can be added after WhatsApp Business or Twilio approval.</p>
            </div>
            <div className="report-visual">
              <Mail size={82} />
              <FileSpreadsheet size={42} />
            </div>
          </div>
        </section>

        <section className="panel architecture" id="architecture">
          <div>
            <span className="eyebrow">Build plan</span>
            <h3>Architecture</h3>
          </div>
          <div className="diagram">
            <span><Zap size={18} /> React + TypeScript</span>
            <span><Lock size={18} /> HTTPS</span>
            <span><Dumbbell size={18} /> Spring Boot API</span>
            <span><FileSpreadsheet size={18} /> JPA</span>
            <span><CreditCard size={18} /> Supabase PostgreSQL</span>
            <span><CalendarCheck size={18} /> Thursday job</span>
          </div>
        </section>

        <footer>
          <span>2026 SPARK Gym Management System</span>
          <span>Made for Fitness</span>
        </footer>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
