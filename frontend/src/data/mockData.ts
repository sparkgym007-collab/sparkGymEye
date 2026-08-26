export const members = [
  { rollNo: "SP-001", name: "Rahul Sharma", phone: "+91 98765 11110", plan: "3 months", dueDate: "2026-08-10", amountDue: 4500, daysOverdue: 14, status: "Overdue" },
  { rollNo: "SP-002", name: "Priya Singh", phone: "+91 98765 11111", plan: "3 months", dueDate: "2026-09-12", amountDue: 0, daysOverdue: 0, status: "Active" },
  { rollNo: "SP-003", name: "Amit Verma", phone: "+91 98765 11112", plan: "1 month", dueDate: "2026-08-18", amountDue: 1500, daysOverdue: 6, status: "Overdue" },
  { rollNo: "SP-004", name: "Neha Das", phone: "+91 98765 11113", plan: "2 months", dueDate: "2026-08-30", amountDue: 3000, daysOverdue: 0, status: "Due soon" },
  { rollNo: "SP-005", name: "Sourav Pal", phone: "+91 98765 11114", plan: "1 month", dueDate: "2026-09-04", amountDue: 0, daysOverdue: 0, status: "Active" },
  { rollNo: "SP-006", name: "Maya Roy", phone: "+91 98765 11115", plan: "6 months", dueDate: "2026-08-05", amountDue: 8000, daysOverdue: 19, status: "Overdue" }
];

export const payments = [
  { rollNo: "SP-002", amount: 4500, paidAt: "2026-06-12", months: 3 },
  { rollNo: "SP-005", amount: 1500, paidAt: "2026-08-04", months: 1 }
];

export const attendance = [
  { rollNo: "SP-002", name: "Priya Singh", date: "2026-08-24", time: "06:12 AM", method: "Phone login" },
  { rollNo: "SP-005", name: "Sourav Pal", date: "2026-08-24", time: "06:41 AM", method: "Trainer marked" },
  { rollNo: "SP-004", name: "Neha Das", date: "2026-08-24", time: "07:02 AM", method: "Phone login" },
  { rollNo: "SP-001", name: "Rahul Sharma", date: "2026-08-24", time: "07:35 AM", method: "Trainer marked" }
];

export const reports = [
  { generatedAt: "2026-08-20T10:00:00", overdueCount: 17, outstanding: 24500, sentTo: "owner@sparkgym.in" }
];
