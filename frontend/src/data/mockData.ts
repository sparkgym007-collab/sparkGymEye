export const plans = [
  { name: "1 Month", months: 1, amount: 600 },
  { name: "3 Months", months: 3, amount: 1400 },
  { name: "6 Months", months: 6, amount: 2600 },
];

export const initialMembers = [
  { rollNo: "SP-001", name: "Rahul Sharma", phone: "9876543210", plan: "3 Months", dueDate: "2026-08-10", amountDue: 1400, paidUpTo: "2026-05-10" },
  { rollNo: "SP-002", name: "Priya Singh", phone: "9876543211", plan: "3 Months", dueDate: "2026-09-12", amountDue: 0, paidUpTo: "2026-09-12" },
  { rollNo: "SP-003", name: "Amit Verma", phone: "9876543212", plan: "1 Month", dueDate: "2026-08-18", amountDue: 600, paidUpTo: "2026-07-18" },
  { rollNo: "SP-004", name: "Neha Das", phone: "9876543213", plan: "3 Months", dueDate: "2026-08-30", amountDue: 1400, paidUpTo: "2026-08-30" },
  { rollNo: "SP-005", name: "Sourav Pal", phone: "9876543214", plan: "1 Month", dueDate: "2026-09-04", amountDue: 0, paidUpTo: "2026-09-04" },
  { rollNo: "SP-006", name: "Maya Roy", phone: "9876543215", plan: "6 Months", dueDate: "2026-08-05", amountDue: 2600, paidUpTo: "2026-02-05" },
  { rollNo: "SP-008", name: "Ankit Singh", phone: "9876543217", plan: "3 Months", dueDate: "2026-08-01", amountDue: 1400, paidUpTo: "2026-05-01" },
  { rollNo: "SP-010", name: "Deepak Yadav", phone: "9876543220", plan: "6 Months", dueDate: "2026-07-27", amountDue: 2600, paidUpTo: "2026-01-27" },
];

export const initialPayments: {
  id: number;
  memberName: string;
  rollNo: string;
  plan: string;
  amount: number;
  paymentDate: string;
  mode: "UPI" | "Cash" | "Card";
  receipt: string;
}[] = [
  { id: 2456, memberName: "Rahul Sharma", rollNo: "SP-001", plan: "3 Months", amount: 1400, paymentDate: "2026-08-20", mode: "UPI", receipt: "#RCPT-2456" },
  { id: 2455, memberName: "Priya Singh", rollNo: "SP-002", plan: "3 Months", amount: 1400, paymentDate: "2026-08-20", mode: "UPI", receipt: "#RCPT-2455" },
  { id: 2454, memberName: "Amit Verma", rollNo: "SP-003", plan: "1 Month", amount: 600, paymentDate: "2026-08-19", mode: "Cash", receipt: "#RCPT-2454" },
  { id: 2453, memberName: "Sourav Pal", rollNo: "SP-005", plan: "1 Month", amount: 600, paymentDate: "2026-08-18", mode: "UPI", receipt: "#RCPT-2453" },
  { id: 2452, memberName: "Neha Das", rollNo: "SP-004", plan: "3 Months", amount: 1400, paymentDate: "2026-08-17", mode: "UPI", receipt: "#RCPT-2452" },
];
