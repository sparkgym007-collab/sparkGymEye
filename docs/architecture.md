# SPARK GymEye Architecture

## Product Scope

SPARK GymEye manages:

- Members with roll number, name, phone, plan, start date, due date, fee amount, and status.
- Admin and trainer access by phone number.
- Member access for personal validity, attendance, and payment history.
- Attendance marking by trainer or member phone login.
- Fees and overdue tracking.
- Weekly Thursday overdue report generation.

## Recommended Architecture

```text
React + TypeScript
        |
        | HTTPS / JSON
        v
Spring Boot API
        |
        | Spring Data JPA
        v
Supabase PostgreSQL

Spring Scheduler
        |
        v
Overdue Finder -> Apache POI Excel -> Email owner/trainer
                                  -> Supabase Storage later
                                  -> WhatsApp optional later
```

## Roles

ADMIN:

- Add and edit members.
- Add trainers.
- Record payments.
- Configure weekly reports.
- Download reports.
- View all attendance and overdue data.

TRAINER:

- View members.
- Mark attendance.
- View today's attendance.
- View overdue members.
- Generate overdue report manually.

MEMBER:

- Login with phone number.
- View own profile.
- View membership validity.
- View payment history.
- View attendance history.

## Core Tables

```text
members
  id
  roll_no
  name
  phone
  role
  plan_name
  plan_start_date
  due_date
  monthly_fee
  amount_due
  status

attendance
  id
  roll_no
  member_name
  attendance_date
  check_in_time
  marked_by

payments
  id
  roll_no
  amount
  duration_months
  paid_at
  received_by

generated_report
  id
  report_type
  generated_at
  file_name
  storage_path
  status
  sent_to
```

## Weekly Report

Default schedule:

```text
Every Thursday at 10:00 AM
```

Excel columns:

```text
Member Name | Roll No | Phone | Plan | Start Date | Due Date | Amount Due | Days Overdue
```

The report generator is implemented in `OverdueReportService`. It currently records the report audit and produces the Excel bytes. The next production step is to attach those bytes to an email using `JavaMailSender`.

## Free-Tier Choices

- Supabase PostgreSQL can be used on the free tier for the database.
- Apache POI is open source and free for Excel generation.
- Email delivery can use Gmail SMTP or another free/low-cost SMTP provider for early usage.
- WhatsApp should remain optional because official WhatsApp messaging and Twilio may require approval or paid usage.
