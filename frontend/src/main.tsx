import React, { FormEvent, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Download,
  Edit3,
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
import { initialMembers, initialPayments, plans } from "./data/mockData";
import "./styles.css";

type MemberStatus = "Active" | "Due soon" | "Overdue";

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

type MemberForm = Omit<Member, "id" | "daysOverdue" | "status">;

const today = new Date("2026-08-26T00:00:00");

const emptyForm: MemberForm = {
  rollNo: "",
  name: "",
  phone: "",
  plan: "1 Month",
  dueDate: "2026-09-26",
  amountDue: 1500,
  paidUpTo: "2026-08-26",
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

function normalizeMember(member: MemberForm, id: number): Member {
  return {
    id,
    ...member,
    amountDue: Number(member.amountDue),
    ...getStatus(member.dueDate, Number(member.amountDue)),
  };
}

function plusMonths(date: string, months: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function App() {
  const [members, setMembers] = useState<Member[]>(() =>
    initialMembers.map((member, index) => normalizeMember(member, index + 1))
  );
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | "payment" | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState(1500);
  const [paymentMode, setPaymentMode] = useState<Payment["mode"]>("UPI");

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      [member.name, member.phone, member.rollNo, member.plan].some((value) => value.toLowerCase().includes(term))
    );
  }, [members, query]);

  const overdueMembers = members.filter((member) => member.status === "Overdue");
  const totalReceivable = members.reduce((sum, member) => sum + member.amountDue, 0);
  const monthlyCollection = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const overdueAmount = overdueMembers.reduce((sum, member) => sum + member.amountDue, 0);

  const overdueBuckets = [
    { label: "1 - 15 days", members: overdueMembers.filter((member) => member.daysOverdue <= 15), tone: "violet" },
    { label: "16 - 30 days", members: overdueMembers.filter((member) => member.daysOverdue > 15 && member.daysOverdue <= 30), tone: "red" },
    { label: "31 - 60 days", members: overdueMembers.filter((member) => member.daysOverdue > 30 && member.daysOverdue <= 60), tone: "orange" },
    { label: "60+ days", members: overdueMembers.filter((member) => member.daysOverdue > 60), tone: "lime" },
  ];

  function openAdd() {
    setSelectedMember(null);
    setForm(emptyForm);
    setDialog("add");
  }

  function openEdit(member: Member) {
    setSelectedMember(member);
    setForm({
      rollNo: member.rollNo,
      name: member.name,
      phone: member.phone,
      plan: member.plan,
      dueDate: member.dueDate,
      amountDue: member.amountDue,
      paidUpTo: member.paidUpTo,
    });
    setDialog("edit");
  }

  function openPayment(member?: Member) {
    const target = member ?? overdueMembers[0] ?? members[0];
    setSelectedMember(target);
    setPaymentAmount(target?.amountDue || 1500);
    setPaymentMode("UPI");
    setDialog("payment");
  }

  function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog === "edit" && selectedMember) {
      setMembers((current) =>
        current.map((member) => (member.id === selectedMember.id ? normalizeMember(form, selectedMember.id) : member))
      );
    } else {
      const nextId = Math.max(0, ...members.map((member) => member.id)) + 1;
      setMembers((current) => [normalizeMember(form, nextId), ...current]);
    }
    setDialog(null);
  }

  function deleteMember(memberId: number) {
    setMembers((current) => current.filter((member) => member.id !== memberId));
  }

  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    const plan = plans.find((item) => item.name === selectedMember.plan) ?? plans[0];
    const paidAt = today.toISOString().slice(0, 10);
    const paidUpTo = plusMonths(paidAt, plan.months);
    setMembers((current) =>
      current.map((member) =>
        member.id === selectedMember.id
          ? normalizeMember({ ...member, amountDue: Math.max(0, member.amountDue - paymentAmount), paidUpTo, dueDate: paidUpTo }, member.id)
          : member
      )
    );
    setPayments((current) => [
      {
        id: Date.now(),
        memberName: selectedMember.name,
        rollNo: selectedMember.rollNo,
        plan: selectedMember.plan,
        amount: paymentAmount,
        paymentDate: paidAt,
        mode: paymentMode,
        receipt: `#RCPT-${2400 + current.length + 1}`,
      },
      ...current,
    ]);
    setDialog(null);
  }

  function exportCsv() {
    const rows = [
      ["Name", "Roll No", "Phone", "Plan", "Due Date", "Amount", "Paid Up To", "Days Overdue"],
      ...overdueMembers.map((member) => [
        member.name,
        member.rollNo,
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
        <Sidebar />
        <section className="desktop-dashboard">
          <Topbar query={query} setQuery={setQuery} />
          <div className="desktop-title">
            <div>
              <h2>Dashboard</h2>
              <p>Monitor your gym's finances and member dues</p>
            </div>
            <div className="actions">
              <button onClick={openAdd}><UserPlus size={17} /> Add Member</button>
              <button className="primary" onClick={() => openPayment()}><Plus size={18} /> Record Payment</button>
            </div>
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
                setPaymentAmount={setPaymentAmount}
                setPaymentMode={setPaymentMode}
                onSubmit={recordPayment}
              />
            ) : (
              <MemberEditor mode={dialog} form={form} setForm={setForm} onSubmit={saveMember} />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Sidebar() {
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
      <a className="logout" href="#logout"><LogOut size={17} /> Logout</a>
    </aside>
  );
}

function Topbar({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  return (
    <header className="topbar">
      <label className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members by name, phone or roll no..." />
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
}: {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onPay: (member: Member) => void;
  onExport: () => void;
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
            <tr><th>Name</th><th>Roll No.</th><th>Phone</th><th>Plan</th><th>Due Date</th><th>Amount</th><th>Paid Up To</th><th>Days Overdue</th><th>Action</th></tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.rollNo}</td>
                <td>{member.phone}</td>
                <td>{member.plan}</td>
                <td>{prettyDate(member.dueDate)}</td>
                <td>{money(member.amountDue)}</td>
                <td>{prettyDate(member.paidUpTo)}</td>
                <td className={member.daysOverdue > 0 ? "danger" : ""}>{member.daysOverdue > 0 ? `${member.daysOverdue} days` : "-"}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => onPay(member)} aria-label={`Record payment for ${member.name}`}><CreditCard size={15} /></button>
                    <button onClick={() => onEdit(member)} aria-label={`Edit ${member.name}`}><Edit3 size={15} /></button>
                    <button className="delete" onClick={() => onDelete(member.id)} aria-label={`Delete ${member.name}`}><Trash2 size={15} /></button>
                  </div>
                </td>
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
}) {
  return (
    <section className="mobile-app">
      <header className="mobile-top">
        <Menu size={22} />
        <div className="mobile-brand">SP<span>A</span>RK</div>
        <button className="icon-btn" aria-label="Notifications"><Bell size={18} /><span>3</span></button>
      </header>

      <label className="mobile-search">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member, phone, roll no..." />
      </label>

      <section className="mobile-trainer">
        <img alt="Trainer profile" src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=90&q=80" />
        <div><strong>Trainer</strong><span>+91 98765 43210</span></div>
        <ChevronRight size={18} />
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

      <button className="mobile-primary" onClick={() => onPay()}><Plus size={19} /> Record Payment</button>
      <button className="mobile-secondary" onClick={onAdd}><UserPlus size={18} /> Add Member</button>

      <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} />

      <article className="panel mobile-members">
        <div className="panel-head"><h3>Top Overdue Members</h3><a href="#members">View All</a></div>
        {overdueMembers.slice(0, 5).map((member) => (
          <div className="mobile-member-card" key={member.id}>
            <div className="avatar">{initials(member.name)}</div>
            <div>
              <strong>{member.name}</strong>
              <span>{member.rollNo} · {member.phone}</span>
            </div>
            <b>{member.daysOverdue}d</b>
            <strong>{money(member.amountDue)}</strong>
            <div className="mobile-card-actions">
              <button onClick={() => onPay(member)}><CreditCard size={15} /></button>
              <button onClick={() => onEdit(member)}><Edit3 size={15} /></button>
              <button onClick={() => onDelete(member.id)}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </article>

      <nav className="bottom-nav">
        <a className="active"><Home size={19} />Dashboard</a>
        <a><Users size={19} />Members</a>
        <a><CreditCard size={19} />Fees</a>
        <a><ShieldAlert size={19} />Overdue</a>
        <a><MoreHorizontal size={19} />More</a>
      </nav>
    </section>
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
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <h3>{mode === "add" ? "Add Member" : "Edit Member"}</h3>
      <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Roll No.<input required value={form.rollNo} onChange={(event) => setForm({ ...form, rollNo: event.target.value })} /></label>
      <label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      <label>Plan<select value={form.plan} onChange={(event) => {
        const plan = plans.find((item) => item.name === event.target.value) ?? plans[0];
        setForm({ ...form, plan: plan.name, amountDue: plan.amount });
      }}>{plans.map((plan) => <option key={plan.name}>{plan.name}</option>)}</select></label>
      <label>Due Date<input type="date" required value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
      <label>Paid Up To<input type="date" required value={form.paidUpTo} onChange={(event) => setForm({ ...form, paidUpTo: event.target.value })} /></label>
      <label>Amount Due<input type="number" min="0" required value={form.amountDue} onChange={(event) => setForm({ ...form, amountDue: Number(event.target.value) })} /></label>
      <button className="primary" type="submit">{mode === "add" ? "Create Member" : "Save Changes"}</button>
    </form>
  );
}

function PaymentForm({
  selectedMember,
  paymentAmount,
  paymentMode,
  setPaymentAmount,
  setPaymentMode,
  onSubmit,
}: {
  selectedMember: Member | null;
  paymentAmount: number;
  paymentMode: Payment["mode"];
  setPaymentAmount: (value: number) => void;
  setPaymentMode: (value: Payment["mode"]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="editor-form" onSubmit={onSubmit}>
      <h3>Record Payment</h3>
      <p>{selectedMember ? `${selectedMember.name} · ${selectedMember.rollNo}` : "Select a member from the overdue list"}</p>
      <label>Amount<input type="number" min="1" required value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value))} /></label>
      <label>Payment Mode<select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as Payment["mode"])}><option>UPI</option><option>Cash</option><option>Card</option></select></label>
      <button className="primary" type="submit" disabled={!selectedMember}>Save Payment</button>
    </form>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
