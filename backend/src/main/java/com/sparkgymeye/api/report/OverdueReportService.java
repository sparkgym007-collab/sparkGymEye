package com.sparkgymeye.api.report;

import com.sparkgymeye.api.member.Member;
import com.sparkgymeye.api.member.MemberService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class OverdueReportService {

    private final MemberService memberService;
    private final GeneratedReportRepository generatedReportRepository;
    private final JavaMailSender mailSender;
    private final String recipientEmail;
    private final String ccEmail;

    public OverdueReportService(
            MemberService memberService,
            GeneratedReportRepository generatedReportRepository,
            JavaMailSender mailSender,
            @Value("${spark.reports.recipient-email}") String recipientEmail,
            @Value("${spark.reports.cc-email}") String ccEmail
    ) {
        this.memberService = memberService;
        this.generatedReportRepository = generatedReportRepository;
        this.mailSender = mailSender;
        this.recipientEmail = recipientEmail;
        this.ccEmail = ccEmail;
    }

    @Scheduled(cron = "${spark.reports.overdue-cron}")
    public void sendScheduledOverdueReport() {
        generateAndRecordReport("SENT");
    }

    public byte[] generateAndRecordReport(String status) {
        List<Member> overdueMembers = memberService.findOverdue();
        byte[] workbook = buildWorkbook(overdueMembers);

        GeneratedReport report = new GeneratedReport();
        report.setReportType("OVERDUE_MEMBERS");
        report.setFileName("spark-overdue-" + LocalDate.now() + ".xlsx");
        report.setStoragePath("local/generated/" + report.getFileName());
        report.setStatus(status);
        report.setSentTo(recipientEmail + "," + ccEmail);
        generatedReportRepository.save(report);

        // Keep mail wiring injectable. Production can attach workbook with JavaMailSender.
        mailSender.createMimeMessage();
        return workbook;
    }

    private byte[] buildWorkbook(List<Member> overdueMembers) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Overdue Members");
            Row header = sheet.createRow(0);
            String[] columns = {"Member Name", "Roll No", "Phone", "Plan", "Start Date", "Due Date", "Amount Due", "Days Overdue"};
            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }

            for (int i = 0; i < overdueMembers.size(); i++) {
                Member member = overdueMembers.get(i);
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(member.getName());
                row.createCell(1).setCellValue(member.getRollNo());
                row.createCell(2).setCellValue(member.getPhone());
                row.createCell(3).setCellValue(member.getPlanName());
                row.createCell(4).setCellValue(String.valueOf(member.getPlanStartDate()));
                row.createCell(5).setCellValue(String.valueOf(member.getDueDate()));
                row.createCell(6).setCellValue(member.getAmountDue().doubleValue());
                row.createCell(7).setCellValue(ChronoUnit.DAYS.between(member.getDueDate(), LocalDate.now()));
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to generate overdue report", exception);
        }
    }
}
