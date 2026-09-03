import React, { FormEvent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import type { jsPDF as JsPDFDocument } from "jspdf";
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
  PhoneCall,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  Moon,
  Sun,
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

type MobileView = "dashboard" | "members" | "fees" | "collection" | "overdue";
type ThemeMode = "dark" | "light";
type StartupStatus = "checking" | "warming" | "unavailable";
type BusyAction = "member" | "payment" | "profile" | "login" | "delete" | null;

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
  memberName?: string;
  planName?: string;
  amount: number;
  durationMonths: number;
  paidAt: string;
  paymentMode?: Payment["mode"];
  receivedBy: string;
};

type ApiAuthUser = {
  id: number;
  fullName: string;
  phone: string;
  role: AuthRole;
};

type MonthlyCollection = {
  monthIndex: number;
  label: string;
  total: number;
  paymentCount: number;
  memberCount: number;
  planCounts: Record<string, number>;
};

const API_BASE = import.meta.env.DEV ? (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:9898") : "";
const HEALTH_RETRY_DELAYS_MS = [0, 2000, 4000, 8000, 15000, 15000, 15000, 15000];
const HEALTH_TIMEOUT_MS = 12000;
const TRAINER_IMAGE_URL = "https://res.cloudinary.com/wsgsjtrj/image/upload/v1787749514/ChatGPT_Image_Aug_26_2026_06_34_20_PM.png";
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

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function normalizedPhoneKey(phone: string) {
  const compact = phone.trim().replace(/[\s()-]/g, "");
  if (compact.startsWith("+91") && compact.length === 13) return compact;
  if (compact.startsWith("91") && compact.length === 12) return `+${compact}`;
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  return compact;
}

function getInitialTheme(): ThemeMode {
  return "dark";
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

function daysUntilDue(dueDate: string) {
  const now = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((due.getTime() - startOfToday.getTime()) / 86400000);
}

function toUiStatus(status: ApiMemberStatus): MemberStatus {
  if (status === "OVERDUE") return "Overdue";
  if (status === "DUE_SOON") return "Due soon";
  return "Active";
}

function statusClass(status: MemberStatus) {
  return status.toLowerCase().replace(" ", "-");
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
  return {
    id: payment.id,
    memberName: payment.memberName || member?.name || payment.rollNo,
    rollNo: payment.rollNo,
    plan: payment.planName || planNameFromMonths(payment.durationMonths),
    amount: Number(payment.amount),
    paymentDate: payment.paidAt,
    mode: payment.paymentMode ?? "UPI",
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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithTimeout(path: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_BASE}${path}`, {
      credentials: "omit",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function waitForBackendReady(onAttempt: (attempt: number, status: StartupStatus) => void) {
  for (let index = 0; index < HEALTH_RETRY_DELAYS_MS.length; index += 1) {
    const attempt = index + 1;
    const waitMs = HEALTH_RETRY_DELAYS_MS[index];
    if (waitMs > 0) {
      onAttempt(attempt, "warming");
      await delay(waitMs);
    } else {
      onAttempt(attempt, "checking");
    }

    const startedAt = performance.now();
    try {
      const response = await fetchWithTimeout("/api/health", HEALTH_TIMEOUT_MS);
      const duration = Math.round(performance.now() - startedAt);
      console.info(`[SPARK] Backend health attempt ${attempt} completed in ${duration}ms with ${response.status}`);
      if (response.ok) return;
    } catch (error) {
      const duration = Math.round(performance.now() - startedAt);
      console.info(`[SPARK] Backend health attempt ${attempt} did not complete in ${duration}ms`, error);
    }
  }

  throw new Error("Backend health check did not become ready.");
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the backend API. Check the production API URL and try again.");
  }
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

function planNameFromMonths(months: number) {
  return plans.find((plan) => plan.months === months)?.name ?? `${months} Month${months === 1 ? "" : "s"}`;
}

function buildYearlyCollection(payments: Payment[], year: number): MonthlyCollection[] {
  const monthMemberSets = Array.from({ length: 12 }, () => new Set<string>());
  const months = Array.from({ length: 12 }, (_, monthIndex) => ({
    monthIndex,
    label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(year, monthIndex, 1)),
    total: 0,
    paymentCount: 0,
    memberCount: 0,
    planCounts: plans.reduce<Record<string, number>>((counts, plan) => {
      counts[plan.name] = 0;
      return counts;
    }, {}),
  }));

  payments.forEach((payment) => {
    const paidAt = new Date(`${payment.paymentDate}T00:00:00`);
    if (Number.isNaN(paidAt.getTime()) || paidAt.getFullYear() !== year) return;
    const month = months[paidAt.getMonth()];
    month.total += payment.amount;
    month.paymentCount += 1;
    monthMemberSets[paidAt.getMonth()].add(payment.rollNo);
    month.planCounts[payment.plan] = (month.planCounts[payment.plan] ?? 0) + 1;
  });

  return months.map((month, index) => ({
    ...month,
    memberCount: monthMemberSets[index].size,
  }));
}

function planSummary(planCounts: Record<string, number>) {
  const summary = Object.entries(planCounts)
    .filter(([, count]) => count > 0)
    .map(([plan, count]) => `${plan}: ${count}`)
    .join(", ");
  return summary || "No plans selected";
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function drawPdfTable(
  doc: JsPDFDocument,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  startY: number
) {
  let y = startY;
  const marginX = 14;
  const rowHeight = 8;

  function pageBreakIfNeeded(nextHeight = rowHeight) {
    if (y + nextHeight <= 285) return;
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(18, 31, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let x = marginX;
  headers.forEach((header, index) => {
    doc.rect(x, y, columnWidths[index], rowHeight, "F");
    doc.text(header, x + 2, y + 5.5, { maxWidth: columnWidths[index] - 4 });
    x += columnWidths[index];
  });
  y += rowHeight;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 38, 42);
  rows.forEach((row, rowIndex) => {
    pageBreakIfNeeded();
    x = marginX;
    if (rowIndex % 2 === 0) {
      doc.setFillColor(247, 248, 245);
      doc.rect(marginX, y, columnWidths.reduce((sum, width) => sum + width, 0), rowHeight, "F");
    }
    row.forEach((cell, index) => {
      doc.text(String(cell), x + 2, y + 5.5, { maxWidth: columnWidths[index] - 4 });
      x += columnWidths[index];
    });
    y += rowHeight;
  });
}

async function sharePdf(title: string, summary: string[], headers: string[], rows: string[][], columnWidths: number[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const generatedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const fileName = `${safeFileName(title)}.pdf`;

  doc.setTextColor(9, 16, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SPARK GymEye", 14, 16);
  doc.setFontSize(13);
  doc.text(title, 14, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 94, 98);
  doc.text(`Generated ${generatedAt}`, 14, 32);

  let y = 42;
  summary.forEach((line) => {
    doc.text(line, 14, y);
    y += 6;
  });
  drawPdfTable(doc, headers, rows, columnWidths, y + 4);

  const blob = doc.output("blob");
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text: title, files: [file] });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.target = "_blank";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [startupStatus, setStartupStatus] = useState<StartupStatus>("checking");
  const [startupAttempt, setStartupAttempt] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | "payment" | "profile" | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState(600);
  const [paymentMode, setPaymentMode] = useState<Payment["mode"]>("UPI");
  const [paymentDate, setPaymentDate] = useState(today.toISOString().slice(0, 10));
  const [paymentPlan, setPaymentPlan] = useState("1 Month");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const [selectedReportMonth, setSelectedReportMonth] = useState(Math.max(0, today.getMonth() - 1));
  const [appError, setAppError] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const canManage = authUser?.role === "ADMIN" || authUser?.role === "TRAINER";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("spark-theme", theme);
  }, [theme]);

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      [member.name, member.phone, member.plan].some((value) => value.toLowerCase().includes(term))
    );
  }, [members, query]);

  const overdueMembers = members.filter((member) => member.status === "Overdue");
  const expiringMembers = members
    .filter((member) => {
      const daysLeft = daysUntilDue(member.dueDate);
      return daysLeft >= 0 && daysLeft <= 3;
    })
    .sort((first, second) => daysUntilDue(first.dueDate) - daysUntilDue(second.dueDate));
  const totalReceivable = members.reduce((sum, member) => sum + member.amountDue, 0);
  const yearlyCollection = useMemo(() => buildYearlyCollection(payments, reportYear), [payments, reportYear]);
  const currentMonthCollection = useMemo(
    () => buildYearlyCollection(payments, today.getFullYear())[today.getMonth()],
    [payments]
  );
  const selectedCollection = yearlyCollection[selectedReportMonth] ?? yearlyCollection[0];
  const reportYears = useMemo(() => {
    const years = new Set([today.getFullYear(), reportYear]);
    payments.forEach((payment) => {
      const paidAt = new Date(`${payment.paymentDate}T00:00:00`);
      if (!Number.isNaN(paidAt.getTime())) years.add(paidAt.getFullYear());
    });
    return Array.from(years).sort((first, second) => second - first);
  }, [payments, reportYear]);
  const monthlyCollection = currentMonthCollection.total;
  const overdueAmount = overdueMembers.reduce((sum, member) => sum + member.amountDue, 0);

  async function loadMembers() {
    const apiMembers = await apiRequest<ApiMember[]>("/api/members");
    const nextMembers = apiMembers.map(mapApiMember);
    setMembers(nextMembers);
    return nextMembers;
  }

  async function loadAppData() {
    const [apiMembers, apiPayments] = await Promise.all([
      apiRequest<ApiMember[]>("/api/members"),
      apiRequest<ApiPayment[]>("/api/payments"),
    ]);
    const nextMembers = apiMembers.map(mapApiMember);
    setMembers(nextMembers);
    setPayments(apiPayments.map((payment) => mapApiPayment(payment, nextMembers)));
  }

  async function loadMemberData() {
    const apiMember = await apiRequest<ApiMember>("/api/members/me");
    setMembers([mapApiMember(apiMember)]);
    setPayments([]);
  }

  async function loadDataForUser(user: AuthUser) {
    if (user.role === "MEMBER") {
      await loadMemberData();
      return;
    }
    await loadAppData();
  }

  async function initializeApp() {
    setAuthLoading(true);
    try {
      await waitForBackendReady((attempt, status) => {
        setStartupAttempt(attempt);
        setStartupStatus(status);
      });
      await apiRequest<ApiAuthUser>("/api/auth/me")
      .then((user) => {
        const nextUser = mapAuthUser(user);
        setAuthUser(nextUser);
        return loadDataForUser(nextUser);
      })
      .catch(() => {
        setAuthUser(null);
        setMembers([]);
        setPayments([]);
      })
      .finally(() => setAuthLoading(false));
    } catch {
      setStartupStatus("unavailable");
    }
  }

  useEffect(() => {
    initializeApp();
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
    setAppError("");
    setSelectedMember(null);
    setForm(emptyForm);
    setDialog("add");
  }

  function openEdit(member: Member) {
    if (!canManage) return;
    setAppError("");
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
    const target = member ?? null;
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

  function confirmDelete(member: Member) {
    if (!canManage) return;
    setAppError("");
    setMemberToDelete(member);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (busyAction) return;
    setAppError("");
    const phoneKey = normalizedPhoneKey(form.phone);
    const duplicateMember = members.find((member) =>
      normalizedPhoneKey(member.phone) === phoneKey && member.id !== selectedMember?.id
    );
    if (duplicateMember) {
      setAppError("Phone number already exists");
      return;
    }
    setBusyAction("member");
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
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteMember(memberId: number) {
    if (!canManage) return;
    if (busyAction) return;
    setAppError("");
    setBusyAction("delete");
    try {
      await apiRequest<void>(`/api/members/${memberId}`, { method: "DELETE" });
      await loadAppData();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not delete member");
    } finally {
      setBusyAction(null);
      setMemberToDelete(null);
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (!selectedMember) return;
    if (busyAction) return;
    const plan = plans.find((item) => item.name === paymentPlan) ?? plans[0];
    setAppError("");
    setBusyAction("payment");
    try {
      await apiRequest<ApiPayment>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          rollNo: selectedMember.rollNo,
          memberName: selectedMember.name,
          planName: plan.name,
          amount: paymentAmount,
          durationMonths: plan.months,
          paidAt: paymentDate,
          paymentMode,
          receivedBy: authUser?.role ?? "ADMIN",
        }),
      });
      await loadAppData();
      setDialog(null);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not record payment");
    } finally {
      setBusyAction(null);
    }
  }

  async function login(phone: string, password: string) {
    if (busyAction) return;
    setBusyAction("login");
    try {
    const user = await apiRequest<ApiAuthUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    const nextUser = mapAuthUser(user);
    setAuthUser(nextUser);
    await loadDataForUser(nextUser);
    } finally {
      setBusyAction(null);
    }
  }

  async function memberLogin(phone: string) {
    if (busyAction) return;
    setBusyAction("login");
    try {
    const user = await apiRequest<ApiAuthUser>("/api/auth/member-login", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    const nextUser = mapAuthUser(user);
    setAuthUser(nextUser);
    await loadDataForUser(nextUser);
    } finally {
      setBusyAction(null);
    }
  }

  async function signup(fullName: string, phone: string, password: string) {
    if (busyAction) return;
    setBusyAction("login");
    try {
    const user = await apiRequest<ApiAuthUser>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName, phone, password }),
    });
    const nextUser = mapAuthUser(user);
    setAuthUser(nextUser);
    await loadDataForUser(nextUser);
    } finally {
      setBusyAction(null);
    }
  }

  async function updateProfile(fullName: string, phone: string) {
    if (busyAction) return;
    setBusyAction("profile");
    try {
    const user = await apiRequest<ApiAuthUser>("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({ fullName, phone }),
    });
    setAuthUser(mapAuthUser(user));
    } finally {
      setBusyAction(null);
    }
  }

  async function logout() {
    await apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthUser(null);
    setMembers([]);
    setPayments([]);
  }

  function toggleTheme() {
    setTheme((current) => current === "dark" ? "light" : "dark");
  }

  if (authLoading) {
    return (
      <StartupScreen
        status={startupStatus}
        attempt={startupAttempt}
        onRetry={initializeApp}
      />
    );
  }

  if (!authUser) {
    return <LoginScreen theme={theme} onToggleTheme={toggleTheme} onLogin={login} onMemberLogin={memberLogin} onSignup={signup} busy={busyAction === "login"} />;
  }

  if (authUser.role === "MEMBER") {
    return (
      <MemberPortal
        authUser={authUser}
        member={members[0] ?? null}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={logout}
      />
    );
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

  async function shareCollectionReport() {
    try {
      await sharePdf(
        `Collection Report ${reportYear}`,
        [
          `${selectedCollection.label}: ${money(selectedCollection.total)}`,
          `${selectedCollection.memberCount} paid members, ${selectedCollection.paymentCount} payments`,
          `Plans selected: ${planSummary(selectedCollection.planCounts)}`,
        ],
        ["Month", "Paid Members", "Payments", "Collection", "Plans Selected"],
        yearlyCollection.map((month) => [
          month.label,
          String(month.memberCount),
          String(month.paymentCount),
          money(month.total),
          planSummary(month.planCounts),
        ]),
        [28, 28, 24, 34, 150]
      );
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not share collection report");
    }
  }

  async function shareMemberReport() {
    try {
      await sharePdf(
        "Member List Report",
        [`${filteredMembers.length} members`, `Total receivable: ${money(totalReceivable)}`],
        ["Name", "Phone", "Plan", "Due Date", "Amount Due", "Paid Up To", "Status"],
        filteredMembers.map((member) => [
          member.name,
          member.phone,
          member.plan,
          prettyDate(member.dueDate),
          money(member.amountDue),
          prettyDate(member.paidUpTo),
          member.status,
        ]),
        [42, 34, 28, 30, 30, 30, 24]
      );
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not share member list report");
    }
  }

  async function shareOverdueReport() {
    try {
      await sharePdf(
        "Overdue Report",
        [`${overdueMembers.length} overdue members`, `Overdue amount: ${money(overdueAmount)}`],
        ["Name", "Phone", "Plan", "Due Date", "Amount Due", "Days Overdue"],
        overdueMembers.map((member) => [
          member.name,
          member.phone,
          member.plan,
          prettyDate(member.dueDate),
          money(member.amountDue),
          String(member.daysOverdue),
        ]),
        [48, 36, 30, 32, 32, 28]
      );
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Could not share overdue report");
    }
  }

  return (
    <>
      <main className="desktop-shell">
        <Sidebar onLogout={logout} />
        <section className="desktop-dashboard">
          <Topbar query={query} setQuery={setQuery} theme={theme} onToggleTheme={toggleTheme} />
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
            monthlyPaymentCount={currentMonthCollection.paymentCount}
          />

          <CollectionReport
            yearlyCollection={yearlyCollection}
            selectedCollection={selectedCollection}
            reportYear={reportYear}
            reportYears={reportYears}
            selectedReportMonth={selectedReportMonth}
            setReportYear={setReportYear}
            setSelectedReportMonth={setSelectedReportMonth}
            onShare={shareCollectionReport}
          />

          <section className="summary-grid">
            <QuickActions
              canManage={canManage}
              onAdd={openAdd}
              onPay={() => openPayment()}
              onFees={() => document.getElementById("members")?.scrollIntoView({ behavior: "smooth" })}
              onOverdue={() => document.getElementById("overdue")?.scrollIntoView({ behavior: "smooth" })}
            />
            <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} onShare={shareOverdueReport} />
            <ExpiringSoonPanel members={expiringMembers} onEdit={openEdit} canManage={canManage} />
            <RecentPayments payments={payments} />
          </section>

          <MembersTable
            members={filteredMembers}
            onEdit={openEdit}
            onDelete={confirmDelete}
            onPay={openPayment}
            onExport={exportCsv}
            onShare={shareMemberReport}
            canManage={canManage}
          />

          <section className="bottom-grid">
            <ReceivableByPlan members={members} />
            <CollectionChart yearlyCollection={yearlyCollection} />
          </section>
        </section>
      </main>

      <main className="mobile-shell">
        <MobileDashboard
          query={query}
          setQuery={setQuery}
          members={filteredMembers}
          overdueMembers={overdueMembers}
          expiringMembers={expiringMembers}
          totalReceivable={totalReceivable}
          overdueAmount={overdueAmount}
          monthlyCollection={monthlyCollection}
          currentMonthCollection={currentMonthCollection}
          yearlyCollection={yearlyCollection}
          selectedCollection={selectedCollection}
          reportYear={reportYear}
          reportYears={reportYears}
          selectedReportMonth={selectedReportMonth}
          setReportYear={setReportYear}
          setSelectedReportMonth={setSelectedReportMonth}
          overdueBuckets={overdueBuckets}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={confirmDelete}
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
          theme={theme}
          onToggleTheme={toggleTheme}
          onShareCollection={shareCollectionReport}
          onShareMembers={shareMemberReport}
          onShareOverdue={shareOverdueReport}
        />
      </main>

      {dialog && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setDialog(null)} aria-label="Close dialog" disabled={busyAction !== null}>
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
                busy={busyAction === "payment"}
              />
            ) : dialog === "profile" ? (
              <ProfileForm authUser={authUser} onSubmit={updateProfile} onDone={() => setDialog(null)} busy={busyAction === "profile"} />
            ) : (
              <MemberEditor mode={dialog} form={form} setForm={setForm} error={appError} onSubmit={saveMember} busy={busyAction === "member"} />
            )}
          </section>
        </div>
      )}

      {memberToDelete && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <button className="modal-close" onClick={() => setMemberToDelete(null)} aria-label="Close dialog" disabled={busyAction !== null}>
              <X size={18} />
            </button>
            <div className="confirm-icon"><Trash2 size={22} /></div>
            <h3 id="delete-title">Delete member?</h3>
            <p>
              This will remove {memberToDelete.name} from SPARK records. Please confirm before deleting.
            </p>
            {busyAction === "delete" && <SavingGlow message="Deleting member record" />}
            <div className="confirm-actions">
              <button className="ghost" type="button" onClick={() => setMemberToDelete(null)} disabled={busyAction !== null}>Cancel</button>
              <button className="danger-button" type="button" onClick={() => deleteMember(memberToDelete.id)} disabled={busyAction !== null}>
                {busyAction === "delete" && <span className="button-loader danger-loader" aria-hidden="true" />}
                <span>{busyAction === "delete" ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
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

function ThemeToggle({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  const isLight = theme === "light";
  return (
    <button className="theme-toggle" type="button" onClick={onToggle} aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}>
      {isLight ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function Topbar({
  query,
  setQuery,
  theme,
  onToggleTheme,
}: {
  query: string;
  setQuery: (value: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <label className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members by name or phone..." />
        <kbd>Ctrl</kbd><kbd>K</kbd>
      </label>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <button className="icon-btn" aria-label="Notifications"><Bell size={18} /><span>3</span></button>
      <div className="profile">
        <img alt="Trainer profile" src={TRAINER_IMAGE_URL} />
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
  monthlyPaymentCount,
}: {
  totalMembers: number;
  totalReceivable: number;
  overdueCount: number;
  overdueAmount: number;
  monthlyCollection: number;
  monthlyPaymentCount: number;
}) {
  return (
    <section className="stats-grid">
      <StatCard label="Total Members" value={String(totalMembers)} detail="Active members" tone="violet" icon={<Users />} />
      <StatCard label="Total Receivable" value={money(totalReceivable)} detail={`From ${totalMembers} members`} tone="red" icon={<ShieldAlert />} />
      <StatCard label="Overdue Amount" value={money(overdueAmount)} detail={`From ${overdueCount} members`} tone="orange" icon={<IndianRupee />} />
      <StatCard label="Collection This Month" value={money(monthlyCollection)} detail={`From ${monthlyPaymentCount} payments`} tone="lime" icon={<WalletCards />} />
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

function OverdueSummary({
  buckets,
  overdueCount,
  onShare,
}: {
  buckets: { label: string; members: Member[]; tone: string }[];
  overdueCount: number;
  onShare?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const total = Math.max(1, buckets.reduce((sum, bucket) => sum + bucket.members.reduce((part, member) => part + member.amountDue, 0), 0));
  return (
    <article className={`panel overdue-summary collapsible-panel ${open ? "open" : "closed"}`} id="overdue">
      <div className="panel-head">
        <h3>Overdue Summary</h3>
        <div className="panel-actions">
          {onShare && (
            <button className="share-button" onClick={onShare} aria-label="Share overdue report" title="Share overdue report">
              <Share2 size={15} />
            </button>
          )}
          <button className="collapse-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            <span>{open ? "Hide" : "Show"}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="collapse-body donut-row">
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

function CollectionReport({
  yearlyCollection,
  selectedCollection,
  reportYear,
  reportYears,
  selectedReportMonth,
  setReportYear,
  setSelectedReportMonth,
  onShare,
}: {
  yearlyCollection: MonthlyCollection[];
  selectedCollection: MonthlyCollection;
  reportYear: number;
  reportYears: number[];
  selectedReportMonth: number;
  setReportYear: (year: number) => void;
  setSelectedReportMonth: (month: number) => void;
  onShare: () => void;
}) {
  const yearlyTotal = yearlyCollection.reduce((sum, month) => sum + month.total, 0);
  const collectionMonths = yearlyCollection.filter((month) => month.paymentCount > 0).length;

  return (
    <article className="panel collection-report" id="collection-report">
      <div className="panel-head collection-report-head">
        <div>
          <h3>Collection Report</h3>
          <span>{reportYear} monthly payment data</span>
        </div>
        <button className="share-button" type="button" onClick={onShare} aria-label="Share collection report" title="Share collection report">
          <Share2 size={15} />
        </button>
      </div>
      <div className="report-controls">
        <div className="report-months" aria-label="Collection month">
          {yearlyCollection.map((month) => (
            <button
              key={month.monthIndex}
              className={month.monthIndex === selectedReportMonth ? "active" : ""}
              type="button"
              onClick={() => setSelectedReportMonth(month.monthIndex)}
            >
              {month.label}
            </button>
          ))}
        </div>
        <label>
          <CalendarClock size={15} />
          <select value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))}>
            {reportYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>

      <div className="collection-snapshot">
        <div>
          <span>{selectedCollection.label} Collection</span>
          <strong>{money(selectedCollection.total)}</strong>
          <small>{selectedCollection.memberCount} paid members, {selectedCollection.paymentCount} payments</small>
        </div>
        <div>
          <span>Plans Selected</span>
          <strong>{selectedCollection.paymentCount}</strong>
          <small>{planSummary(selectedCollection.planCounts)}</small>
        </div>
        <div>
          <span>Year Total</span>
          <strong>{money(yearlyTotal)}</strong>
          <small>{collectionMonths} active collection months</small>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Month</th><th>Paid Members</th><th>Payments</th><th>Total Collection</th><th>Plans Selected</th></tr>
          </thead>
          <tbody>
            {yearlyCollection.map((month) => (
              <tr key={month.monthIndex} className={month.monthIndex === selectedReportMonth ? "selected-row" : ""}>
                <td>{month.label}</td>
                <td>{month.memberCount}</td>
                <td>{month.paymentCount}</td>
                <td>{money(month.total)}</td>
                <td>{planSummary(month.planCounts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ExpiringSoonPanel({
  members,
  onEdit,
  canManage,
}: {
  members: Member[];
  onEdit: (member: Member) => void;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <article className={`panel expiring-panel collapsible-panel ${open ? "open" : "closed"}`}>
      <div className="panel-head">
        <h3>Expiring Soon</h3>
        <button className="collapse-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <span>{members.length}</span>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="collapse-body">
        {members.length === 0 ? (
          <p className="empty-panel">No subscriptions expire in the next 3 days.</p>
        ) : (
          <div className="expiring-list">
            {members.slice(0, 5).map((member) => {
              const daysLeft = daysUntilDue(member.dueDate);
              const label = daysLeft === 0 ? "Expires today" : `${daysLeft}d left`;
              return (
                <div key={member.id}>
                  <span className="avatar">{initials(member.name)}</span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.phone} · {member.plan}</small>
                  </div>
                  <div className="expiring-actions">
                    <b>{label}</b>
                    <span>
                      {canManage && <button onClick={() => onEdit(member)} aria-label={`Edit ${member.name}`}><Edit3 size={15} /></button>}
                      <a className="call-action" href={phoneHref(member.phone)} aria-label={`Call ${member.name}`}><PhoneCall size={15} /></a>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  onShare,
  canManage,
}: {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onPay: (member: Member) => void;
  onExport: () => void;
  onShare: () => void;
  canManage: boolean;
}) {
  return (
    <article className="panel members-table" id="members">
      <div className="panel-head">
        <h3>Members & Fees</h3>
        <div className="panel-actions">
          <button className="share-button" onClick={onShare} aria-label="Share member list report" title="Share member list report">
            <Share2 size={15} />
          </button>
          <button className="ghost" onClick={onExport}><Download size={16} /> Export Excel</button>
        </div>
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
                      <a className="call-action" href={phoneHref(member.phone)} aria-label={`Call ${member.name}`}><PhoneCall size={15} /></a>
                      <button className="delete" onClick={() => onDelete(member)} aria-label={`Delete ${member.name}`}><Trash2 size={15} /></button>
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

function CollectionChart({ yearlyCollection }: { yearlyCollection: MonthlyCollection[] }) {
  const maxCollection = Math.max(1, ...yearlyCollection.map((month) => month.total));
  const yearlyTotal = yearlyCollection.reduce((sum, month) => sum + month.total, 0);

  return (
    <article className="panel collection-panel">
      <div className="panel-head"><h3>Fee Collection Overview</h3><span>Yearly</span></div>
      <strong>{money(yearlyTotal)}</strong>
      <span>Total Collection</span>
      <div className="chart">
        {yearlyCollection.map((month) => (
          <i
            key={month.monthIndex}
            title={`${month.label}: ${money(month.total)}`}
            style={{ height: `${Math.max(4, (month.total / maxCollection) * 100)}%` }}
          />
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
  expiringMembers,
  totalReceivable,
  overdueAmount,
  monthlyCollection,
  currentMonthCollection,
  yearlyCollection,
  selectedCollection,
  reportYear,
  reportYears,
  selectedReportMonth,
  setReportYear,
  setSelectedReportMonth,
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
  theme,
  onToggleTheme,
  onShareCollection,
  onShareMembers,
  onShareOverdue,
}: {
  query: string;
  setQuery: (value: string) => void;
  members: Member[];
  overdueMembers: Member[];
  expiringMembers: Member[];
  totalReceivable: number;
  overdueAmount: number;
  monthlyCollection: number;
  currentMonthCollection: MonthlyCollection;
  yearlyCollection: MonthlyCollection[];
  selectedCollection: MonthlyCollection;
  reportYear: number;
  reportYears: number[];
  selectedReportMonth: number;
  setReportYear: (year: number) => void;
  setSelectedReportMonth: (month: number) => void;
  overdueBuckets: { label: string; members: Member[]; tone: string }[];
  onAdd: () => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
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
  theme: ThemeMode;
  onToggleTheme: () => void;
  onShareCollection: () => void;
  onShareMembers: () => void;
  onShareOverdue: () => void;
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
        <div className="mobile-top-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="icon-btn" aria-label="Notifications"><Bell size={18} /><span>3</span></button>
        </div>
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
          theme={theme}
          onToggleTheme={onToggleTheme}
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
        <img alt="Trainer profile" src={TRAINER_IMAGE_URL} />
        <div><strong>{authUser.name}</strong><span>{authUser.phone} · {authUser.role}</span></div>
        <ChevronRight size={18} />
      </button>

      {view === "dashboard" && (
        <>
          <section className="mobile-hero">
            <ShieldAlert size={32} />
            <div><span>Total Receivable</span><strong>{money(totalReceivable)}</strong><p>From {members.length} members</p></div>
          </section>

          <section className="mobile-stats">
            <MiniStat label="Members" value={String(members.length)} icon={<Users />} tone="violet" />
            <MiniStat label="Overdue" value={String(overdueMembers.length)} icon={<ShieldAlert />} tone="red" />
            <MiniStat label="Overdue Amount" value={money(overdueAmount)} icon={<IndianRupee />} tone="orange" />
            <MiniStat label="Expiring" value={String(expiringMembers.length)} icon={<CalendarClock />} tone="lime" />
          </section>

          <QuickActions
            canManage={canManage}
            onAdd={onAdd}
            onPay={() => onPay()}
            onFees={() => navigate("fees")}
            onOverdue={() => navigate("overdue")}
          />

          <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} />

          <OverdueMembersPanel
            overdueMembers={overdueMembers}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
            onPay={onPay}
            onShare={onShareOverdue}
          />

          <ExpiringSoonPanel members={expiringMembers} onEdit={onEdit} canManage={canManage} />
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
          onShare={onShareMembers}
        />
      )}

      {view === "fees" && (
        <MobileFeesScreen
          monthlyCollection={monthlyCollection}
          currentMonthCollection={currentMonthCollection}
          canManage={canManage}
          onPay={onPay}
        />
      )}

      {view === "collection" && (
        <MobileCollectionScreen
          yearlyCollection={yearlyCollection}
          selectedCollection={selectedCollection}
          reportYear={reportYear}
          reportYears={reportYears}
          selectedReportMonth={selectedReportMonth}
          setReportYear={setReportYear}
          setSelectedReportMonth={setSelectedReportMonth}
          onShare={onShareCollection}
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
          onShare={onShareOverdue}
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

function OverdueMembersPanel({
  overdueMembers,
  canManage,
  onEdit,
  onDelete,
  onPay,
  onShare,
}: {
  overdueMembers: Member[];
  canManage: boolean;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onPay: (member: Member) => void;
  onShare?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <article className={`panel mobile-members collapsible-panel ${open ? "open" : "closed"}`}>
      <div className="panel-head">
        <h3>Overdue Members</h3>
        <div className="panel-actions">
          {onShare && (
            <button className="share-button" onClick={onShare} aria-label="Share overdue report" title="Share overdue report">
              <Share2 size={15} />
            </button>
          )}
          <button className="collapse-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            <span>{overdueMembers.length}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="collapse-body">
        {overdueMembers.length === 0 ? (
          <p className="empty-panel">No overdue members.</p>
        ) : (
          overdueMembers.map((member) => (
            <MobileMemberRow
              key={member.id}
              member={member}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
              onPay={onPay}
              showOverdue
            />
          ))
        )}
      </div>
    </article>
  );
}

function MobileMembersScreen({
  members,
  canManage,
  onAdd,
  onEdit,
  onDelete,
  onPay,
  onShare,
}: {
  members: Member[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onPay: (member: Member) => void;
  onShare: () => void;
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
        <div className="panel-head">
          <h3>All Members</h3>
          <div className="panel-actions">
            <button className="share-button" onClick={onShare} aria-label="Share member list report" title="Share member list report">
              <Share2 size={15} />
            </button>
            <span>{members.length}</span>
          </div>
        </div>
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

function QuickActions({
  canManage,
  onAdd,
  onPay,
  onFees,
  onOverdue,
}: {
  canManage: boolean;
  onAdd: () => void;
  onPay: () => void;
  onFees: () => void;
  onOverdue: () => void;
}) {
  return (
    <article className="panel quick-actions">
      <h3>Quick Actions</h3>
      <div>
        <button onClick={onAdd} disabled={!canManage}><UserPlus size={24} /> Add Member</button>
        <button onClick={onPay} disabled={!canManage}><IndianRupee size={24} /> Record Payment</button>
        <button onClick={onFees}><FileSpreadsheet size={24} /> Fees Records</button>
        <button onClick={onOverdue}><ShieldAlert size={24} /> View Overdue</button>
      </div>
    </article>
  );
}

function MobileFeesScreen({
  monthlyCollection,
  currentMonthCollection,
  canManage,
  onPay,
}: {
  monthlyCollection: number;
  currentMonthCollection: MonthlyCollection;
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
        <div><span>This Month</span><strong>{money(monthlyCollection)}</strong><p>{currentMonthCollection.paymentCount} payments recorded</p></div>
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

function MobileCollectionScreen({
  yearlyCollection,
  selectedCollection,
  reportYear,
  reportYears,
  selectedReportMonth,
  setReportYear,
  setSelectedReportMonth,
  onShare,
}: {
  yearlyCollection: MonthlyCollection[];
  selectedCollection: MonthlyCollection;
  reportYear: number;
  reportYears: number[];
  selectedReportMonth: number;
  setReportYear: (year: number) => void;
  setSelectedReportMonth: (month: number) => void;
  onShare: () => void;
}) {
  return (
    <section className="mobile-screen">
      <div className="mobile-view-head">
        <div>
          <h2>Collection</h2>
          <p>Month-wise income report</p>
        </div>
      </div>

      <CollectionReport
        yearlyCollection={yearlyCollection}
        selectedCollection={selectedCollection}
        reportYear={reportYear}
        reportYears={reportYears}
        selectedReportMonth={selectedReportMonth}
        setReportYear={setReportYear}
        setSelectedReportMonth={setSelectedReportMonth}
        onShare={onShare}
      />
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
  onShare,
}: {
  overdueMembers: Member[];
  overdueBuckets: { label: string; members: Member[]; tone: string }[];
  overdueAmount: number;
  canManage: boolean;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onPay: (member: Member) => void;
  onShare: () => void;
}) {
  return (
    <section className="mobile-screen">
      <div className="mobile-view-head">
        <div>
          <h2>Overdue</h2>
          <p>{money(overdueAmount)} pending from {overdueMembers.length} members</p>
        </div>
      </div>

      <OverdueSummary buckets={overdueBuckets} overdueCount={overdueMembers.length} onShare={onShare} />

      <OverdueMembersPanel
        overdueMembers={overdueMembers}
        canManage={canManage}
        onEdit={onEdit}
        onDelete={onDelete}
        onPay={onPay}
        onShare={onShare}
      />
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
  onDelete: (member: Member) => void;
  onPay: (member: Member) => void;
  showOverdue?: boolean;
}) {
  const planAmount = plans.find((plan) => plan.name === member.plan)?.amount ?? member.amountDue;
  const displayAmount = member.amountDue > 0 ? member.amountDue : planAmount;
  const detailText = showOverdue
    ? `${member.phone} - ${member.plan} - ${money(displayAmount)}`
    : `${member.phone} - ${member.plan}`;

  return (
    <div className={`mobile-member-card ${showOverdue ? "overdue-member-card" : ""}`}>
      <div className="avatar">{initials(member.name)}</div>
      <div>
        <strong>{member.name}</strong>
        <span>{detailText}</span>
      </div>
      <b className={`member-status ${statusClass(member.status)}`}>
        {showOverdue && member.daysOverdue > 0 ? `${member.daysOverdue}d` : member.status}
      </b>
      {!showOverdue && <strong>{money(displayAmount)}</strong>}
      {canManage && (
        <div className="mobile-card-actions">
          <button onClick={() => onPay(member)} aria-label={`Add payment for ${member.name}`}><CreditCard size={15} /></button>
          <button onClick={() => onEdit(member)} aria-label={`Edit ${member.name}`}><Edit3 size={15} /></button>
          <a className="call-action" href={phoneHref(member.phone)} aria-label={`Call ${member.name}`}><PhoneCall size={15} /></a>
          <button onClick={() => onDelete(member)} aria-label={`Delete ${member.name}`}><Trash2 size={15} /></button>
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
  theme,
  onToggleTheme,
}: {
  authUser: AuthUser;
  canManage: boolean;
  view: MobileView;
  onClose: () => void;
  onLogout: () => void;
  onAdd: () => void;
  onPay: (member?: Member) => void;
  onNavigate: (view: MobileView) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
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
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
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
          <button className={view === "collection" ? "active" : ""} onClick={() => run(() => onNavigate("collection"))}><CalendarClock size={24} /> Collection</button>
          <button onClick={() => run(() => onNavigate("overdue"))}><FileSpreadsheet size={24} /> Reports</button>
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
  error,
  onSubmit,
  busy,
}: {
  mode: "add" | "edit";
  form: MemberForm;
  setForm: React.Dispatch<React.SetStateAction<MemberForm>>;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
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
    <form className="editor-form" onSubmit={onSubmit} aria-busy={busy}>
      <h3>{mode === "add" ? "Add Member" : "Edit Member"}</h3>
      <fieldset disabled={busy}>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label>Plan<select value={form.plan} onChange={(event) => {
          applyPlan(event.target.value);
        }}>{plans.map((plan) => <option key={plan.name}>{plan.name}</option>)}</select></label>
        <label>Payment Date<input type="date" required value={form.paymentDate} onChange={(event) => applyPaymentDate(event.target.value)} /></label>
        <label>Paid Up To<input type="date" required value={form.paidUpTo} readOnly /></label>
        <label>Amount Due<input type="number" min="0" required value={form.amountDue} onChange={(event) => setForm({ ...form, amountDue: Number(event.target.value) })} /></label>
      </fieldset>
      {error && <p className="form-error">{error}</p>}
      {busy && <SavingGlow message={mode === "add" ? "Securing new member record" : "Updating member record"} />}
      <LoadingButton
        label={mode === "add" ? "Create Member" : "Save Changes"}
        loadingLabel={mode === "add" ? "Creating member..." : "Saving changes..."}
        busy={busy}
      />
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
  busy,
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
  busy: boolean;
}) {
  const searchTerm = paymentSearch.trim().toLowerCase();
  const matchedMembers = searchTerm
    ? members.filter((member) =>
        [member.name, member.phone].some((value) => value.toLowerCase().includes(searchTerm))
      )
    : [];

  return (
    <form className="editor-form" onSubmit={onSubmit} aria-busy={busy}>
      <h3>Add Payment</h3>
      <p>{selectedMember ? `${selectedMember.name} · ${selectedMember.phone}` : "Search and select a member first"}</p>
      <fieldset disabled={busy}>
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
        {!searchTerm && <p className="picker-hint">Type a name or phone number to find a member.</p>}
        {searchTerm && matchedMembers.length === 0 && <p className="picker-hint">No matching members found.</p>}
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
      </fieldset>
      {busy && <SavingGlow message="Syncing payment with SPARK records" />}
      <LoadingButton label="Save Payment" loadingLabel="Saving payment..." busy={busy} disabled={!selectedMember} />
    </form>
  );
}

function ProfileForm({
  authUser,
  onSubmit,
  onDone,
  busy,
}: {
  authUser: AuthUser;
  onSubmit: (fullName: string, phone: string) => Promise<void>;
  onDone: () => void;
  busy: boolean;
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
    <form className="editor-form" onSubmit={submit} aria-busy={busy}>
      <h3>My Profile</h3>
      <p>{authUser.role}</p>
      <fieldset disabled={busy}>
        <label>Name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
        <label>Phone<input required value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      </fieldset>
      {error && <p className="form-error">{error}</p>}
      {busy && <SavingGlow message="Updating your profile" />}
      <LoadingButton label="Save Profile" loadingLabel="Saving profile..." busy={busy} />
    </form>
  );
}

function LoadingButton({
  label,
  loadingLabel,
  busy,
  disabled = false,
}: {
  label: string;
  loadingLabel: string;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <button className="primary loading-button" type="submit" disabled={disabled || busy}>
      {busy && <span className="button-loader" aria-hidden="true" />}
      <span>{busy ? loadingLabel : label}</span>
    </button>
  );
}

function SavingGlow({ message }: { message: string }) {
  return (
    <div className="saving-glow" role="status">
      <span className="saving-bolt"><Zap size={14} /></span>
      <span>{message}</span>
      <i aria-hidden="true" />
    </div>
  );
}

function StartupScreen({
  status,
  onRetry,
}: {
  status: StartupStatus;
  attempt: number;
  onRetry: () => void;
}) {
  const isUnavailable = status === "unavailable";
  const title = isUnavailable ? "Almost there" : "SPARK GymEye";
  const message = isUnavailable
    ? "A quick refresh should bring everything back."
    : status === "checking"
      ? "Setting up your gym floor."
      : "Loading your members, fees, and reports.";

  return (
    <main className="login-shell startup-shell">
      <section className="login-card startup-card" aria-live="polite">
        <div className="brand">
          <h1>SP<span>A</span>RK</h1>
          <p>GymEye</p>
        </div>
        <div className="startup-status">
          {!isUnavailable && (
            <div className="spark-loader" aria-hidden="true">
              <span />
              <i />
              <b />
            </div>
          )}
          <h2>{title}</h2>
          <p>{message}</p>
          {!isUnavailable && (
            <div className="startup-charge" aria-hidden="true">
              <span />
            </div>
          )}
          {isUnavailable && <button className="primary" type="button" onClick={onRetry}>Refresh</button>}
        </div>
      </section>
    </main>
  );
}

function LoginScreen({
  theme,
  onToggleTheme,
  onLogin,
  onMemberLogin,
  onSignup,
  busy,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogin: (phone: string, password: string) => Promise<void>;
  onMemberLogin: (phone: string) => Promise<void>;
  onSignup: (fullName: string, phone: string, password: string) => Promise<void>;
  busy: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [signupMode, setSignupMode] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (signupMode) {
        await onSignup(fullName.trim(), phone.trim(), password);
      } else if (adminMode) {
        await onLogin(phone.trim(), password);
      } else {
        await onMemberLogin(phone.trim());
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <div className="brand">
          <h1>SP<span>A</span>RK</h1>
          <p>{adminMode ? "Admin Login" : "Member Login"}</p>
        </div>
        <form onSubmit={submit} className="login-form" aria-busy={busy}>
          <h2>{signupMode ? "Create Member Account" : adminMode ? "Admin Access" : "Member Access"}</h2>
          <fieldset disabled={busy}>
            {signupMode && <label>Name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" /></label>}
            <label>Phone Number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" /></label>
            {(adminMode || signupMode) && (
              <PasswordField
                label={signupMode ? "Create Password" : "Admin PIN / Password"}
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
            )}
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          {busy && <SavingGlow message={signupMode ? "Creating your SPARK access" : "Checking secure access"} />}
          <LoadingButton
            label={signupMode ? "Create Member Account" : adminMode ? "Login" : "View My Plan"}
            loadingLabel={signupMode ? "Creating account..." : "Signing in..."}
            busy={busy}
          />
          <button type="button" className="text-button" disabled={busy} onClick={() => {
            setSignupMode(!signupMode);
            setAdminMode(false);
            setError("");
          }}>
            {signupMode ? "Back to admin login" : "Create member account"}
          </button>
          {!signupMode && (
            <button type="button" className="text-button" disabled={busy} onClick={() => {
              setAdminMode(!adminMode);
              setPassword("");
              setError("");
            }}>
              {adminMode ? "Back to member login" : "Admin login"}
            </button>
          )}
          <div className="demo-users">
            <span>Access rules</span>
            <small>Members use only their registered phone number.</small>
            <small>Admin and trainer accounts use phone plus secure PIN/password.</small>
          </div>
        </form>
      </section>
    </main>
  );
}

function MemberPortal({
  authUser,
  member,
  theme,
  onToggleTheme,
  onLogout,
}: {
  authUser: AuthUser;
  member: Member | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const currentPlan = member ? plans.find((plan) => plan.name === member.plan) : null;
  const planAmount = currentPlan?.amount ?? member?.amountDue ?? 0;

  return (
    <main className="member-portal">
      <section className="member-portal-top">
        <div className="brand">
          <h1>SP<span>A</span>RK</h1>
          <p>Member View</p>
        </div>
        <div className="member-portal-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button type="button" onClick={onLogout}><LogOut size={16} /> Logout</button>
        </div>
      </section>

      <section className="panel member-plan-card">
        <span className="avatar">{initials(member?.name ?? authUser.name)}</span>
        <div>
          <p>{member?.rollNo ?? "Member"}</p>
          <h2>{member?.name ?? authUser.name}</h2>
          <small>{authUser.phone}</small>
        </div>
        {member ? (
          <div className="member-plan-grid">
            <div>
              <span>Current Plan</span>
              <strong>{member.plan}</strong>
            </div>
            <div>
              <span>Plan Fee</span>
              <strong>{money(planAmount)}</strong>
            </div>
            <div>
              <span>Paid Up To</span>
              <strong>{prettyDate(member.paidUpTo)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className={statusClass(member.status)}>{member.status}</strong>
            </div>
          </div>
        ) : (
          <p className="empty-panel">No member record found for this phone number.</p>
        )}
      </section>

      <section className="panel member-plans-panel">
        <div className="panel-head"><h3>Available Plans</h3><span>{plans.length}</span></div>
        <div className="mobile-plan-list">
          {plans.map((plan) => (
            <div key={plan.name}>
              <span>{plan.name}</span>
              <strong>{money(plan.amount)}</strong>
              <small>{plan.months} month{plan.months > 1 ? "s" : ""}</small>
            </div>
          ))}
        </div>
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
