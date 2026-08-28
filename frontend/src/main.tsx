import React, { FormEvent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Home,
  IndianRupee,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { plans } from "./data/plans";
import "./styles.css";

type MemberStatus = "Active" | "Due soon" | "Overdue";
type ApiMemberStatus = "ACTIVE" | "DUE_SOON" | "OVERDUE" | "PAUSED";

type Member = {
  id: number;
  rollNo: string;
  name: string;
  phone: string;
  plan: string;
  dueDate: string;
  amountDue: number;
  paidUpTo: string;
  daysOverdue: number;
  status: MemberStatus;
};

type Payment = {
  id: number;
  memberName: string;
  rollNo: string;
  plan: string;
  amount: number;
  paymentDate: string;
  mode: "UPI" | "Cash" | "Card";
  receipt: string;
};

type AuthRole = "ADMIN" | "TRAINER" | "MEMBER";

type AuthUser = {
  id: number;
  name: string;
  phone: string;
  role: AuthRole;
};

type MobileView = "dashboard" | "members" | "fees" | "overdue";

type MemberForm = Omit<Member, "id" | "rollNo" | "daysOverdue" | "status"> & {
  paymentDate: string;
};

type ApiMember = {
  id: number;
  rollNo: string;
  name: string;
  phone: string;
  role: AuthRole;
  planName: string;
  planStartDate: string;
  dueDate: string;
  monthlyFee: number;
  amountDue: number;
  status: ApiMemberStatus;
};

type ApiPayment = {
  id: number;
  rollNo: string;
  amount: number;
  durationMonths: number;
  paidAt: string;
  receivedBy: string;
};

type ApiAuthUser = {
  id: number;
  fullName: string;
  phone: string;
  role: AuthRole;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9898";
const today = new Date();

const emptyForm: MemberForm = {
  name: "",
  phone: "",
  plan: "1 Month",
  dueDate: plusMonths("2026-08-26", 1),
  amountDue: 600,
  paidUpTo: plusMonths("2026-08-26", 1),
  paymentDate: "2026-08-26",
};

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
  }).format(new Date(`${value}T00:00:00`));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatus(dueDate: string, amountDue: number): Pick<Member, "status" | "daysOverdue"> {
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.ceil((today.getTime() - due.getTime()) / 86400000);
  if (amountDue > 0 && days > 0) {
    return { status: "Overdue", daysOverdue: days };
  }
  if (amountDue > 0 || days >= -7) {
    return { status: "Due soon", daysOverdue: 0 };
  }
  return { status: "Active", daysOverdue: 0 };
}

function toUiStatus(status: ApiMemberStatus): MemberStatus {
  if (status === "OVERDUE") return "Overdue";
  if (status === "DUE_SOON") return "Due soon";
  return "Active";
}

function mapAuthUser(user: ApiAuthUser): AuthUser {
  return {
    id: user.id,
    name: user.fullName,
    phone: user.phone,
    role: user.role,
  };
}

function mapApiMember(member: ApiMember): Member {
  const status = getStatus(member.dueDate, Number(member.amountDue));
  return {
    id: member.id,
    rollNo: member.rollNo,
    name: member.name,
    phone: member.phone,
    plan: member.planName,
    dueDate: member.dueDate,
    amountDue: Number(member.amountDue),
    paidUpTo: member.dueDate,
    daysOverdue: status.daysOverdue,
    status: status.daysOverdue > 0 ? status.status : toUiStatus(member.status),
  };
}

function mapApiPayment(payment: ApiPayment, members: Member[]): Payment {
  const member = members.find((item) => item.rollNo === payment.rollNo);
  const plan = plans.find((item) => item.months === payment.durationMonths);
  return {
    id: payment.id,
    memberName: member?.name ?? payment.rollNo,
    rollNo: payment.rollNo,
    plan: plan?.name ?? `${payment.durationMonths} Month`,
    amount: Number(payment.amount),
    paymentDate: payment.paidAt,
    mode: "UPI",
    receipt: `#RCPT-${payment.id}`,
  };
}

function toApiMember(member: MemberForm, id?: number, rollNo?: string): ApiMember {
  const plan = plans.find((item) => item.name === member.plan) ?? plans[0];
  return {
    id: id ?? 0,
    rollNo: rollNo ?? "",
    name: member.name,
    phone: member.phone,
    role: "MEMBER",
    planName: member.plan,
    planStartDate: member.paymentDate,
    dueDate: member.dueDate,
    monthlyFee: plan.amount,
    amountDue: Number(member.amountDue),
    status: "ACTIVE",
  };
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    let errorMessage = message;
    try {
      const payload = JSON.parse(message) as { message?: string };
      errorMessage = payload.message || errorMessage;
    } catch {
      // Keep the raw response text when the server did not return JSON.
    }
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

function nextRollNo(members: Member[]) {
  const highest = members.reduce((max, member) => {
    const value = Number(member.rollNo.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `SP-${String(highest + 1).padStart(3, "0")}`;
}

function plusMonths(date: string, months: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | "payment" | "profile" | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState(600);
  const [paymentMode, setPaymentMode] = useState<Payment["mode"]>("UPI");
  const [paymentDate, setPaymentDate] = useState(today.toISOString().slice(0, 10));
  const [paymentPlan, setPaymentPlan] = useState("1 Month");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [appError, setAppError] = useState("");
  const canManage = authUser?.role === "ADMIN" || authUser?.role === "TRAINER";

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      [member.name, member.phone, member.plan].some((value) => value.toLowerCase().includes(term))
    );
  }, [members, query]);

  const overdueMembers = members.filter((member) => member.status === "Overdue");
  const totalReceivable = members.reduce((sum, member) => sum + member.amountDue, 0);
  const monthlyCollection = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const overdueAmount = overdueMembers.reduce((sum, member) => sum + member.amountDue, 0);

  async function loadMembers() {
    const apiMembers = await apiRequest<ApiMember[]>("/api/members");
    const nextMembers = apiMembers.map(mapApiMember);
    setMembers(nextMembers);
    return nextMembers;
  }

  async function loadAppData() {
    const nextMembers = await loadMembers();
    const apiPayments = await apiRequest<ApiPayment[]>("/api/payments");
    setPayments(apiPayments.map((payment) => mapApiPayment(payment, nextMembers)));
  }

  useEffect(() => {
    apiRequest<ApiAuthUser>("/api/auth/me")
      .then((user) => {
        setAuthUser(mapAuthUser(user));
        return loadAppData();
      })
      .catch(() => {
        setAuthUser(null);
        setMembers([]);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const overdueBuckets = [
    { label: "1 - 15 days", members: overdueMembers.filter((member) => member.daysOverdue <= 15), tone: "violet" },
    { label: "16 - 30 days", members: overdueMembers.filter((member) => member.daysOverdue > 15 && member.daysOverdue <= 30), tone: "red" },
    { label: "31 - 60 days", members: overdueMembers.filter((member) => member.daysOverdue > 30 && member.daysOverdue <= 60), tone: "orange" },
    { label: "60+ days", members: overdueMembers.filter((member) => member.daysOverdue > 60), tone: "lime" },
  ];

  function openAdd() {
    if (!canManage) return;
    setSelectedMember(null);
    setForm(emptyForm);
    setDialog("add");
  }

  function openEdit(member: Member) {
    if (!canManage) return;
    setSelectedMember(member);
    setForm({
      name: member.name,
      phone: member.phone,
      plan: member.plan,
      dueDate: member.dueDate,
      amountDue: member.amountDue,
      paidUpTo: member.paidUpTo,
      paymentDate: today.toISOString().slice(0, 10),
    });
    setDialog("edit");
  }

  function openPayment(member?: Member) {
    if (!canManage) return;
    const target = member ?? overdueMembers[0] ?? members[0];
    setSelectedMember(target);
    const plan = plans.find((item) => item.name === target?.plan) ?? plans[0];
    setPaymentAmount(target?.amountDue || plan.amount);
    setPaymentMode("UPI");
    setPaymentDate(today.toISOString().slice(0, 10));
    setPaymentPlan(target?.plan ?? plans[0].name);
    setPaymentSearch(target ? `${target.name} ${target.phone}` : "");
    setDialog("payment");
  }

  function openProfile() {
    setDialog("profile");
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setAppError("");
    try {
      if (dialog === "edit" && selectedMember) {
        await apiRequest<ApiMember>(`/api/members/${selectedMember.id}`, {
          method: "PUT",
          body: JSON.stringify(toApiMember(form, selectedMember.id, selectedMember.rollNo)),
        });
      } else {
        await apiRequest<ApiMember>("/api/members", {
          method: "POST",
          body: JSON.stringify(toApiMember(form, undefined, nextRollNo(members))),
        });
      }
      await loadAppData();
      setDialog(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not save member");
    }
  }

  async function deleteMember(memberId: number) {
    if (!canManage) return;
    setAppError("");
    try {
      await apiRequest<void>(`/api/members/${memberId}`, { method: "DELETE" });
      await loadAppData();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not delete member");
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (!selectedMember) return;
    const plan = plans.find((item) => item.name === paymentPlan) ?? plans[0];
    setAppError("");
    try {
      await apiRequest<ApiPayment>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          rollNo: selectedMember.rollNo,
          amount: paymentAmount,
          durationMonths: plan.months,
          paidAt: paymentDate,
          receivedBy: authUser?.role ?? "ADMIN",
        }),
      });
      await loadAppData();
      setDialog(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  async function login(phone: string, password: string) {
    const user = await apiRequest<ApiAuthUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setAuthUser(mapAuthUser(user));
    await loadAppData();
  }

  async function signup(fullName: string, phone: string, password: string) {
    const user = await apiRequest<ApiAuthUser>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName, phone, password }),
    });
    setAuthUser(mapAuthUser(user));
    await loadAppData();
  }

  async function updateProfile(fullName: string, phone: string) {
    const user = await apiRequest<ApiAuthUser>("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({ fullName, phone }),
    });
    setAuthUser(mapAuthUser(user));
  }

  async function logout() {
    await apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthUser(null);
    setMembers([]);
    setPayments([]);
  }

  if (authLoading) {
    return <main className="login-shell"><section className="login-card"><div className="brand"><h1>SP<span>A</span>RK</h1><p>Loading</p></div></section></main>;
  }

  if (!authUser) {
    return <LoginScreen onLogin={login} onSignup={signup} />;
  }

  function exportCsv() {
    const rows = [
      ["Name", "Phone", "Plan", "Payment Due", "Amount", "Paid Up To", "Days Overdue"],
      ...overdueMembers.map((member) => [
        member.name,
        member.phone,
        member.plan,
        member.dueDate,
        String(member.amountDue),
        member.paidUpTo,
        String(member.daysOverdue),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "spark-overdue-members.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <main className="desktop-shell">
        <Sidebar onLogout={logout} />
        <section className="desktop-dashboard">
          <Topbar query={query} setQuery={setQuery} />
          {appError && <p className="app-error">{appError}</p>}
          {query.trim() && (
            <SearchResults
              members={filteredMembers}
              onPay={openPayment}
              onEdit={openEdit}
              onClear={() => setQuery("")}
              canManage={canManage}
            />
          )}
          <div className="desktop-title">
            <div>
              <h2>Dashboard</h2>
              <p>Monitor your gym's finances and member dues</p>
            </div>
            {canManage && (
              <div className="actions">
                <button onClick={openAdd}><UserPlus size={17} /> Add Member</button>
                <button className="primary" onClick={() => openPayment()}><Plus size={18} /> Add Payment</button>
              </div>
            )}
          </div>

          <Stats
            totalMembers={members.length}
            totalReceivable={totalReceivable}
            overdueCount={overdueMembers.length}
            overdueAmount={overdueAmount}
            monthlyCollection={monthlyCollection}
          />

          <section className="summary-grid">
            <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} />
            <RecentPayments payments={payments} />
          </section>

          <MembersTable
            members={filteredMembers}
            onEdit={openEdit}
            onDelete={deleteMember}
            onPay={openPayment}
            onExport={exportCsv}
            canManage={canManage}
          />

          <section className="bottom-grid">
            <ReceivableByPlan members={members} />
            <CollectionChart collection={monthlyCollection} />
          </section>
        </section>
      </main>

      <main className="mobile-shell">
        <MobileDashboard
          query={query}
          setQuery={setQuery}
          members={filteredMembers}
          overdueMembers={overdueMembers}
          totalReceivable={totalReceivable}
          overdueAmount={overdueAmount}
          monthlyCollection={monthlyCollection}
          overdueBuckets={overdueBuckets}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={deleteMember}
          onPay={openPayment}
          canManage={canManage}
          authUser={authUser}
          view={mobileView}
          setView={setMobileView}
          menuOpen={mobileMenuOpen}
          setMenuOpen={setMobileMenuOpen}
          onLogout={logout}
          onProfile={openProfile}
          appError={appError}
        />
      </main>

      {dialog && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setDialog(null)} aria-label="Close dialog">
              <X size={18} />
            </button>
            {dialog === "payment" ? (
              <PaymentForm
                selectedMember={selectedMember}
                paymentAmount={paymentAmount}
                paymentMode={paymentMode}
                paymentDate={paymentDate}
                paymentPlan={paymentPlan}
                paymentSearch={paymentSearch}
                members={members}
                paidUpTo={plusMonths(paymentDate, plans.find((item) => item.name === paymentPlan)?.months ?? 1)}
                setPaymentAmount={setPaymentAmount}
                setPaymentMode={setPaymentMode}
                setPaymentDate={setPaymentDate}
                setPaymentPlan={(planName) => {
                  const plan = plans.find((item) => item.name === planName) ?? plans[0];
                  setPaymentPlan(plan.name);
                  setPaymentAmount(plan.amount);
                }}
                setPaymentSearch={setPaymentSearch}
                setSelectedMember={setSelectedMember}
                onSubmit={recordPayment}
              />
            ) : dialog === "profile" ? (
              <ProfileForm authUser={authUser} onSubmit={updateProfile} onDone={() => setDialog(null)} />
            ) : (
              <MemberEditor mode={dialog} form={form} setForm={setForm} onSubmit={saveMember} />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>SP<span>A</span>RK</h1>
        <p>Ignite your fitness</p>
      </div>
      <nav className="side-nav" aria-label="Main navigation">
        <a className="active" href="#dashboard"><Home size={17} /> Dashboard</a>
        <a href="#members"><Users size={17} /> Members</a>
        <a href="#plans"><ReceiptText size={17} /> Plans</a>
        <span>Fees Management</span>
        <a href="#records"><FileSpreadsheet size={17} /> Fees Records</a>
        <a href="#payments"><WalletCards size={17} /> Payments</a>
        <a href="#overdue"><ShieldAlert size={17} /> Overdue</a>
        <a href="#reports"><CalendarClock size={17} /> Reports</a>
        <span>Settings</span>
        <a href="#users"><Users size={17} /> Users & Roles</a>
        <a href="#settings"><Settings size={17} /> Settings</a>
      </nav>
      <section className="gym-card">
        <Zap size={42} />
        <strong>SPARK GYM</strong>
        <small>Control Room</small>
        <p>Discipline today. Strength tomorrow. SPARK forever.</p>
      </section>
      <button className="logout" onClick={onLogout}><LogOut size={17} /> Logout</button>
    </aside>
  );
}

function Topbar({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  return (
    <header className="topbar">
      <label className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members by name or phone..." />
        <kbd>Ctrl</kbd><kbd>K</kbd>
      </label>
      <button className="icon-btn" aria-label="Notifications"><Bell size={18} /><span>3</span></button>
      <div className="profile">
        <img alt="Trainer profile" src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=90&q=80" />
        <div><strong>Trainer</strong><small>+91 98765 43210</small></div>
      </div>
    </header>
  );
}

function SearchResults({
  members,
  onPay,
  onEdit,
  onClear,
  canManage,
}: {
  members: Member[];
  onPay: (member: Member) => void;
  onEdit: (member: Member) => void;
  onClear: () => void;
  canManage: boolean;
}) {
  return (
    <section className="search-results" aria-live="polite">
      <div className="panel-head">
        <h3>Search Results</h3>
        <button className="ghost" onClick={onClear}>Clear</button>
      </div>
      {members.length === 0 ? (
        <p>No member found. Try another name or phone number.</p>
      ) : (
        <div className="search-result-list">
          {members.slice(0, 6).map((member) => (
            <article key={member.id}>
              <div className="avatar">{initials(member.name)}</div>
              <div>
                <strong>{member.name}</strong>
                <span>{member.phone} · {member.plan} · {money(member.amountDue)}</span>
              </div>
              {canManage && (
                <>
                  <button onClick={() => onPay(member)}><CreditCard size={15} /> Add Payment</button>
                  <button onClick={() => onEdit(member)}><Edit3 size={15} /> Edit</button>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Stats({
  totalMembers,
  totalReceivable,
  overdueCount,
  overdueAmount,
  monthlyCollection,
}: {
  totalMembers: number;
  totalReceivable: number;
  overdueCount: number;
  overdueAmount: number;
  monthlyCollection: number;
}) {
  return (
    <section className="stats-grid">
      <StatCard label="Total Members" value={String(totalMembers)} detail="Active members" tone="violet" icon={<Users />} />
      <StatCard label="Total Receivable" value={money(totalReceivable)} detail={`From ${totalMembers} members`} tone="red" icon={<ShieldAlert />} />
      <StatCard label="Overdue Amount" value={money(overdueAmount)} detail={`From ${overdueCount} members`} tone="orange" icon={<IndianRupee />} />
      <StatCard label="Collection This Month" value={money(monthlyCollection)} detail={`From ${Math.max(1, Math.min(42, totalMembers))} payments`} tone="lime" icon={<WalletCards />} />
    </section>
  );
}

function StatCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: string; icon: React.ReactNode }) {
  return (
    <article className={`stat ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <i />
    </article>
  );
}

function OverdueSummary({ buckets, overdueCount }: { buckets: { label: string; members: Member[]; tone: string }[]; overdueCount: number }) {
  const total = Math.max(1, buckets.reduce((sum, bucket) => sum + bucket.members.reduce((part, member) => part + member.amountDue, 0), 0));
  return (
    <article className="panel overdue-summary">
      <div className="panel-head">
        <h3>Overdue Summary</h3>
        <a href="#overdue">View All <ChevronRight size={15} /></a>
      </div>
      <div className="donut-row">
        <div className="donut"><strong>{overdueCount}</strong><span>Overdue Members</span></div>
        <div className="bucket-list">
          {buckets.map((bucket) => {
            const amount = bucket.members.reduce((sum, member) => sum + member.amountDue, 0);
            return (
              <div key={bucket.label}>
                <i className={bucket.tone} />
                <span>{bucket.label}</span>
                <small>{bucket.members.length} members</small>
                <b>{money(amount)}</b>
                <em style={{ width: `${Math.max(10, (amount / total) * 100)}%` }} />
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function RecentPayments({ payments }: { payments: Payment[] }) {
  return (
    <article className="panel recent-payments" id="payments">
      <div className="panel-head">
        <h3>Recent Payments</h3>
        <a href="#payments">View All Payments</a>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Member Name</th><th>Plan</th><th>Amount</th><th>Payment Date</th><th>Mode</th><th>Receipt</th></tr></thead>
          <tbody>
            {payments.slice(0, 5).map((payment) => (
              <tr key={payment.id}>
                <td>{payment.memberName}</td>
                <td>{payment.plan}</td>
                <td>{money(payment.amount)}</td>
                <td>{prettyDate(payment.paymentDate)}</td>
                <td><span className={`mode ${payment.mode.toLowerCase()}`}>{payment.mode}</span></td>
                <td>{payment.receipt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function MembersTable({
  members,
  onEdit,
  onDelete,
  onPay,
  onExport,
  canManage,
}: {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onPay: (member: Member) => void;
  onExport: () => void;
  canManage: boolean;
}) {
  return (
    <article className="panel members-table" id="members">
      <div className="panel-head">
        <h3>Members & Fees</h3>
        <button className="ghost" onClick={onExport}><Download size={16} /> Export Excel</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Plan</th><th>Payment Due</th><th>Amount</th><th>Paid Up To</th><th>Days Overdue</th>{canManage && <th>Action</th>}</tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.phone}</td>
                <td>{member.plan}</td>
                <td>{prettyDate(member.dueDate)}</td>
                <td>{money(member.amountDue)}</td>
                <td>{prettyDate(member.paidUpTo)}</td>
                <td className={member.daysOverdue > 0 ? "danger" : ""}>{member.daysOverdue > 0 ? `${member.daysOverdue} days` : "-"}</td>
                {canManage && (
                  <td>
                    <div className="row-actions">
                      <button onClick={() => onPay(member)} aria-label={`Add payment for ${member.name}`}><CreditCard size={15} /></button>
                      <button onClick={() => onEdit(member)} aria-label={`Edit ${member.name}`}><Edit3 size={15} /></button>
                      <button className="delete" onClick={() => onDelete(member.id)} aria-label={`Delete ${member.name}`}><Trash2 size={15} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ReceivableByPlan({ members }: { members: Member[] }) {
  return (
    <article className="panel plan-panel" id="plans">
      <div className="panel-head"><h3>Receivable By Plan</h3><span>Total: {money(members.reduce((sum, member) => sum + member.amountDue, 0))}</span></div>
      <div className="plan-list">
        {plans.map((plan) => {
          const planMembers = members.filter((member) => member.plan === plan.name);
          const amount = planMembers.reduce((sum, member) => sum + member.amountDue, 0);
          return (
            <div key={plan.name}>
              <span>{plan.name}</span>
              <i><b style={{ width: `${Math.min(100, (amount / 65000) * 100)}%` }} /></i>
              <small>{planMembers.length} members</small>
              <strong>{money(amount)}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function CollectionChart({ collection }: { collection: number }) {
  return (
    <article className="panel collection-panel">
      <div className="panel-head"><h3>Fee Collection Overview</h3><button className="ghost">This Month</button></div>
      <strong>{money(collection)}</strong>
      <span>Total Collection</span>
      <div className="chart">
        {[8, 18, 24, 18, 47, 39, 56, 52, 75, 98].map((point, index) => (
          <i key={index} style={{ height: `${point}%` }} />
        ))}
      </div>
    </article>
  );
}

function MobileDashboard({
  query,
  setQuery,
  members,
  overdueMembers,
  totalReceivable,
  overdueAmount,
  monthlyCollection,
  overdueBuckets,
  onAdd,
  onEdit,
  onDelete,
  onPay,
  canManage,
  authUser,
  view,
  setView,
  menuOpen,
  setMenuOpen,
  onLogout,
  onProfile,
  appError,
}: {
  query: string;
  setQuery: (value: string) => void;
  members: Member[];
  overdueMembers: Member[];
  totalReceivable: number;
  overdueAmount: number;
  monthlyCollection: number;
  overdueBuckets: { label: string; members: Member[]; tone: string }[];
  onAdd: () => void;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onPay: (member?: Member) => void;
  canManage: boolean;
  authUser: AuthUser;
  view: MobileView;
  setView: (view: MobileView) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onLogout: () => void;
  onProfile: () => void;
  appError: string;
}) {
  function navigate(nextView: MobileView) {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="mobile-app" id="mobile-dashboard">
      <header className="mobile-top">
        <button className="mobile-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
          <Menu size={22} />
        </button>
        <div className="mobile-brand">SP<span>A</span>RK</div>
        <button className="icon-btn" aria-label="Notifications"><Bell size={18} /><span>3</span></button>
      </header>

      {menuOpen && (
        <MobileDrawer
          authUser={authUser}
          canManage={canManage}
          view={view}
          onClose={() => setMenuOpen(false)}
          onLogout={onLogout}
          onAdd={onAdd}
          onPay={onPay}
          onNavigate={navigate}
        />
      )}

      <label className="mobile-search">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member or phone..." />
      </label>
      {query.trim() && (
        <section className="mobile-search-results">
          {members.length === 0 ? (
            <p>No member found.</p>
          ) : (
            members.slice(0, 4).map((member) => (
              <button key={member.id} onClick={() => canManage && onPay(member)}>
                <span>{member.name}</span>
                <small>{member.phone}</small>
                <b>{money(member.amountDue)}</b>
              </button>
            ))
          )}
        </section>
      )}
      {appError && <p className="app-error">{appError}</p>}

      <button className="mobile-trainer" id="mobile-profile" onClick={onProfile}>
        <img alt="Trainer profile" src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=90&q=80" />
        <div><strong>{authUser.name}</strong><span>{authUser.phone} · {authUser.role}</span></div>
        <ChevronRight size={18} />
      </button>

      {view === "dashboard" && (
        <>
          <section className="mobile-view-head">
            <div>
              <h2>Dashboard</h2>
              <p>Important gym fee signals</p>
            </div>
          </section>

          <section className="mobile-hero">
            <ShieldAlert size={32} />
            <div><span>Total Receivable</span><strong>{money(totalReceivable)}</strong><p>From {members.length} members</p></div>
          </section>

          <section className="mobile-stats">
            <MiniStat label="Members" value={String(members.length)} icon={<Users />} tone="violet" />
            <MiniStat label="Overdue" value={String(overdueMembers.length)} icon={<ShieldAlert />} tone="red" />
            <MiniStat label="Overdue Amount" value={money(overdueAmount)} icon={<IndianRupee />} tone="orange" />
            <MiniStat label="Collection" value={money(monthlyCollection)} icon={<WalletCards />} tone="lime" />
          </section>

          {canManage && (
            <>
              <button className="mobile-primary" onClick={() => onPay()}><Plus size={19} /> Add Payment</button>
              <button className="mobile-secondary" onClick={onAdd}><UserPlus size={18} /> Add Member</button>
            </>
          )}

          <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} />

          <article className="panel mobile-members">
            <div className="panel-head">
              <h3>Top Overdue Members</h3>
              <button className="panel-link" onClick={() => navigate("overdue")}>View All</button>
            </div>
            {overdueMembers.slice(0, 5).map((member) => (
              <MobileMemberRow
                key={member.id}
                member={member}
                canManage={canManage}
                onEdit={onEdit}
                onDelete={onDelete}
                onPay={onPay}
                showOverdue
              />
            ))}
          </article>
        </>
      )}

      {view === "members" && (
        <MobileMembersScreen
          members={members}
          canManage={canManage}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          onPay={onPay}
        />
      )}

      {view === "fees" && (
        <MobileFeesScreen
          monthlyCollection={monthlyCollection}
          canManage={canManage}
          onPay={onPay}
        />
      )}

      {view === "overdue" && (
        <MobileOverdueScreen
          overdueMembers={overdueMembers}
          overdueBuckets={overdueBuckets}
          overdueAmount={overdueAmount}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onPay={onPay}
        />
      )}

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}><Home size={19} />Dashboard</button>
        <button className={view === "members" ? "active" : ""} onClick={() => navigate("members")}><Users size={19} />Members</button>
        <button className={view === "fees" ? "active" : ""} onClick={() => navigate("fees")}><CreditCard size={19} />Fees</button>
        <button className={view === "overdue" ? "active" : ""} onClick={() => navigate("overdue")}><ShieldAlert size={19} />Overdue</button>
        <button onClick={() => setMenuOpen(true)}><MoreHorizontal size={19} />More</button>
      </nav>
    </section>
  );
}

function MobileMembersScreen({
  members,
  canManage,
  onAdd,
  onEdit,
  onDelete,
  onPay,
}: {
  members: Member[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onPay: (member: Member) => void;
}) {
  return (
    <section className="mobile-screen">
      <div className="mobile-view-head">
        <div>
          <h2>Members</h2>
          <p>{members.length} gym members</p>
        </div>
        {canManage && <button onClick={onAdd}><UserPlus size={16} /> Add</button>}
      </div>

      <article className="panel mobile-members">
        <div className="panel-head"><h3>All Members</h3><span>{members.length}</span></div>
        {members.map((member) => (
          <MobileMemberRow
            key={member.id}
            member={member}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onPay={onPay}
          />
        ))}
      </article>
    </section>
  );
}

function MobileFeesScreen({
  monthlyCollection,
  canManage,
  onPay,
}: {
  monthlyCollection: number;
  canManage: boolean;
  onPay: (member?: Member) => void;
}) {
  return (
    <section className="mobile-screen">
      <div className="mobile-view-head">
        <div>
          <h2>Fees</h2>
          <p>Plans, payments, and collection</p>
        </div>
      </div>

      <section className="mobile-hero">
        <WalletCards size={32} />
        <div><span>This Month</span><strong>{money(monthlyCollection)}</strong><p>Total fee collection</p></div>
      </section>

      {canManage && <button className="mobile-primary" onClick={() => onPay()}><Plus size={19} /> Add Payment</button>}

      <article className="panel plan-panel">
        <div className="panel-head"><h3>Plans</h3><span>{plans.length}</span></div>
        <div className="mobile-plan-list">
          {plans.map((plan) => (
            <div key={plan.name}>
              <span>{plan.name}</span>
              <strong>{money(plan.amount)}</strong>
              <small>{plan.months} month{plan.months > 1 ? "s" : ""}</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function MobileOverdueScreen({
  overdueMembers,
  overdueBuckets,
  overdueAmount,
  canManage,
  onEdit,
  onDelete,
  onPay,
}: {
  overdueMembers: Member[];
  overdueBuckets: { label: string; members: Member[]; tone: string }[];
  overdueAmount: number;
  canManage: boolean;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onPay: (member: Member) => void;
}) {
  return (
    <section className="mobile-screen">
      <div className="mobile-view-head">
        <div>
          <h2>Overdue</h2>
          <p>{money(overdueAmount)} pending from {overdueMembers.length} members</p>
        </div>
      </div>

      <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} />

      <article className="panel mobile-members">
        <div className="panel-head"><h3>Overdue Members</h3><span>{overdueMembers.length}</span></div>
        {overdueMembers.map((member) => (
          <MobileMemberRow
            key={member.id}
            member={member}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onPay={onPay}
            showOverdue
          />
        ))}
      </article>
    </section>
  );
}

function MobileMemberRow({
  member,
  canManage,
  onEdit,
  onDelete,
  onPay,
  showOverdue = false,
}: {
  member: Member;
  canManage: boolean;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onPay: (member: Member) => void;
  showOverdue?: boolean;
}) {
  return (
    <div className="mobile-member-card">
      <div className="avatar">{initials(member.name)}</div>
      <div>
        <strong>{member.name}</strong>
        <span>{member.phone} · {member.plan}</span>
      </div>
      <b>{showOverdue && member.daysOverdue > 0 ? `${member.daysOverdue}d` : member.status}</b>
      <strong>{money(member.amountDue)}</strong>
      {canManage && (
        <div className="mobile-card-actions">
          <button onClick={() => onPay(member)} aria-label={`Add payment for ${member.name}`}><CreditCard size={15} /></button>
          <button onClick={() => onEdit(member)} aria-label={`Edit ${member.name}`}><Edit3 size={15} /></button>
          <button onClick={() => onDelete(member.id)} aria-label={`Delete ${member.name}`}><Trash2 size={15} /></button>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({
  authUser,
  canManage,
  view,
  onClose,
  onLogout,
  onAdd,
  onPay,
  onNavigate,
}: {
  authUser: AuthUser;
  canManage: boolean;
  view: MobileView;
  onClose: () => void;
  onLogout: () => void;
  onAdd: () => void;
  onPay: (member?: Member) => void;
  onNavigate: (view: MobileView) => void;
}) {
  function run(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="mobile-drawer-layer" role="presentation">
      <button className="mobile-drawer-backdrop" onClick={onClose} aria-label="Close menu" />
      <aside className="mobile-drawer" aria-label="Mobile menu">
        <div className="drawer-head">
          <div className="brand">
            <h1>SP<span>A</span>RK</h1>
            <p>Ignite your fitness</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu"><X size={22} /></button>
        </div>

        <nav className="drawer-nav">
          <span>Main</span>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => run(() => onNavigate("dashboard"))}><Home size={24} /> Dashboard</button>
          <button className={view === "members" ? "active" : ""} onClick={() => run(() => onNavigate("members"))}><Users size={24} /> Members</button>
          <button className={view === "fees" ? "active" : ""} onClick={() => run(() => onNavigate("fees"))}><ReceiptText size={24} /> Plans</button>

          <span>Fees Management</span>
          <button className={view === "fees" ? "active" : ""} onClick={() => run(() => onNavigate("fees"))}><FileSpreadsheet size={24} /> Fees Records</button>
          <button onClick={() => canManage && run(() => onPay())} disabled={!canManage}><CreditCard size={24} /> Payments</button>
          <button className={view === "overdue" ? "active" : ""} onClick={() => run(() => onNavigate("overdue"))}><ShieldAlert size={24} /> Overdue</button>

          <span>Reports & Automation</span>
          <button onClick={() => run(() => onNavigate("overdue"))}><CalendarClock size={24} /> Reports</button>
          <button onClick={() => run(() => onNavigate("dashboard"))}><Settings size={24} /> Automation</button>

          <span>Settings</span>
          <button onClick={() => canManage && run(onAdd)} disabled={!canManage}><UserPlus size={24} /> Users & Roles</button>
          <button onClick={() => run(() => onNavigate("dashboard"))}><Settings size={24} /> Settings</button>
        </nav>

        <section className="drawer-gym-card">
          <Zap size={34} />
          <strong>SPARK GYM</strong>
          <small>Control Room</small>
          <p>Discipline today. Strength tomorrow. SPARK forever.</p>
        </section>

        <button className="drawer-logout" onClick={() => run(onLogout)}><LogOut size={22} /> Logout</button>
        <p className="drawer-user">{authUser.name} Â· {authUser.role}</p>
      </aside>
    </div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <article className={`mini-stat ${tone}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MemberEditor({
  mode,
  form,
  setForm,
  onSubmit,
}: {
  mode: "add" | "edit";
  form: MemberForm;
  setForm: React.Dispatch<React.SetStateAction<MemberForm>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function applyPlan(planName: string, paymentDate = form.paymentDate) {
    const plan = plans.find((item) => item.name === planName) ?? plans[0];
    const paidUpTo = plusMonths(paymentDate, plan.months);
    setForm({ ...form, plan: plan.name, amountDue: plan.amount, paymentDate, paidUpTo, dueDate: paidUpTo });
  }

  function applyPaymentDate(paymentDate: string) {
    const plan = plans.find((item) => item.name === form.plan) ?? plans[0];
    const paidUpTo = plusMonths(paymentDate, plan.months);
    setForm({ ...form, paymentDate, paidUpTo, dueDate: paidUpTo });
  }

  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <h3>{mode === "add" ? "Add Member" : "Edit Member"}</h3>
      <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      <label>Plan<select value={form.plan} onChange={(event) => {
        applyPlan(event.target.value);
      }}>{plans.map((plan) => <option key={plan.name}>{plan.name}</option>)}</select></label>
      <label>Payment Date<input type="date" required value={form.paymentDate} onChange={(event) => applyPaymentDate(event.target.value)} /></label>
      <label>Paid Up To<input type="date" required value={form.paidUpTo} readOnly /></label>
      <label>Amount Due<input type="number" min="0" required value={form.amountDue} onChange={(event) => setForm({ ...form, amountDue: Number(event.target.value) })} /></label>
      <button className="primary" type="submit">{mode === "add" ? "Create Member" : "Save Changes"}</button>
    </form>
  );
}

function PaymentForm({
  selectedMember,
  paymentAmount,
  paymentMode,
  paymentDate,
  paymentPlan,
  paymentSearch,
  members,
  paidUpTo,
  setPaymentAmount,
  setPaymentMode,
  setPaymentDate,
  setPaymentPlan,
  setPaymentSearch,
  setSelectedMember,
  onSubmit,
}: {
  selectedMember: Member | null;
  paymentAmount: number;
  paymentMode: Payment["mode"];
  paymentDate: string;
  paymentPlan: string;
  paymentSearch: string;
  members: Member[];
  paidUpTo: string;
  setPaymentAmount: (value: number) => void;
  setPaymentMode: (value: Payment["mode"]) => void;
  setPaymentDate: (value: string) => void;
  setPaymentPlan: (value: string) => void;
  setPaymentSearch: (value: string) => void;
  setSelectedMember: (member: Member | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const searchTerm = paymentSearch.trim().toLowerCase();
  const matchedMembers = searchTerm
    ? members.filter((member) =>
        [member.name, member.phone].some((value) => value.toLowerCase().includes(searchTerm))
      )
    : members.slice(0, 5);

  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <h3>Add Payment</h3>
      <p>{selectedMember ? `${selectedMember.name} · ${selectedMember.phone}` : "Search and select a member first"}</p>
      <label className="full-field">Search Member
        <input
          value={paymentSearch}
          onChange={(event) => {
            setPaymentSearch(event.target.value);
            setSelectedMember(null);
          }}
          placeholder="Search by member name or phone number"
        />
      </label>
      <div className="member-picker">
        {matchedMembers.slice(0, 5).map((member) => (
          <button
            type="button"
            className={selectedMember?.id === member.id ? "selected" : ""}
            key={member.id}
            onClick={() => {
              const plan = plans.find((item) => item.name === member.plan) ?? plans[0];
              setSelectedMember(member);
              setPaymentSearch(`${member.name} ${member.phone}`);
              setPaymentPlan(plan.name);
              setPaymentAmount(member.amountDue || plan.amount);
            }}
          >
            <span>{member.name}</span>
            <small>{member.phone}</small>
          </button>
        ))}
      </div>
      <label>Payment Date<input type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>
      <label>Plan<select value={paymentPlan} onChange={(event) => setPaymentPlan(event.target.value)}>{plans.map((plan) => <option key={plan.name}>{plan.name}</option>)}</select></label>
      <label>Amount<input type="number" min="1" required value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value))} /></label>
      <label>Payment Mode<select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as Payment["mode"])}><option>UPI</option><option>Cash</option><option>Card</option></select></label>
      <label>Paid Up To<input type="date" value={paidUpTo} readOnly /></label>
      <button className="primary" type="submit" disabled={!selectedMember}>Save Payment</button>
    </form>
  );
}

function ProfileForm({
  authUser,
  onSubmit,
  onDone,
}: {
  authUser: AuthUser;
  onSubmit: (fullName: string, phone: string) => Promise<void>;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState(authUser.name);
  const [phone, setPhone] = useState(authUser.phone);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit(fullName.trim(), phone.trim());
      onDone();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update profile");
    }
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <h3>My Profile</h3>
      <p>{authUser.role}</p>
      <label>Name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Phone<input required value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary" type="submit">Save Profile</button>
    </form>
  );
}

function LoginScreen({
  onLogin,
  onSignup,
}: {
  onLogin: (phone: string, password: string) => Promise<void>;
  onSignup: (fullName: string, phone: string, password: string) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [signupMode, setSignupMode] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const canResetPassword = resetToken.trim().length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (signupMode) {
        await onSignup(fullName.trim(), phone.trim(), password);
      } else {
        await onLogin(phone.trim(), password);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid phone number or password.");
    }
  }

  async function forgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setResetToken("");
    await apiRequest<{ message: string; devResetToken?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ phone: phone.trim() }),
    })
      .then((response) => {
        setResetMessage(response.message);
        setResetToken(response.devResetToken ?? "");
      })
      .catch(() => setResetMessage("If this phone exists, reset instructions will be sent."));
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await apiRequest<void>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
      });
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      setForgotMode(false);
      setResetMessage("Password changed. Login with your new password.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reset token is invalid or expired.");
    }
  }

  function backToLogin() {
    setForgotMode(false);
    setSignupMode(false);
    setError("");
    setResetMessage("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand">
          <h1>SP<span>A</span>RK</h1>
          <p>Fees Control Login</p>
        </div>
        {!forgotMode ? (
          <form onSubmit={submit} className="login-form">
            <h2>{signupMode ? "Sign Up" : "Login"}</h2>
            {signupMode && <label>Name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label>}
            <label>Phone Number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9876543211" /></label>
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />
            {resetMessage && <p className="form-success">{resetMessage}</p>}
            {error && <p className="form-error">{error}</p>}
            <button className="primary" type="submit">{signupMode ? "Create Account" : "Login"}</button>
            <button type="button" className="text-button" onClick={() => {
              setSignupMode(!signupMode);
              setError("");
            }}>
              {signupMode ? "Back to login" : "Create member account"}
            </button>
            <button type="button" className="text-button" onClick={() => setForgotMode(true)}>Forgot password?</button>
            <div className="demo-users">
              <span>Access rules</span>
              <small>Admin and trainer accounts can manage gym records.</small>
              <small>New signups are member accounts with view-only access.</small>
            </div>
          </form>
        ) : (
          <form onSubmit={canResetPassword ? resetPassword : forgotPassword} className="login-form">
            <h2>Forgot Password</h2>
            <label>Phone Number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Registered phone number" /></label>
            {resetMessage && <p className="form-success">{resetMessage}</p>}
            {canResetPassword && (
              <div className="reset-panel">
                <label>Reset Token<input value={resetToken} onChange={(event) => setResetToken(event.target.value)} /></label>
                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                />
                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                />
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <button className="primary" type="submit">{canResetPassword ? "Reset Password" : "Send Reset Instructions"}</button>
            <button type="button" className="text-button" onClick={backToLogin}>Back to login</button>
          </form>
        )}
      </section>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label>{label}
      <span className="password-field">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
        />
        <button type="button" className="password-toggle" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
