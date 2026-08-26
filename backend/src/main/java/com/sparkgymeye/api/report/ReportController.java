package com.sparkgymeye.api.report;

import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final OverdueReportService overdueReportService;
    private final GeneratedReportRepository generatedReportRepository;

    public ReportController(OverdueReportService overdueReportService, GeneratedReportRepository generatedReportRepository) {
        this.overdueReportService = overdueReportService;
        this.generatedReportRepository = generatedReportRepository;
    }

    @GetMapping
    public List<GeneratedReport> all() {
        return generatedReportRepository.findAll();
    }

    @PostMapping("/overdue/generate")
    public ResponseEntity<byte[]> generateNow() {
        byte[] report = overdueReportService.generateAndRecordReport("GENERATED_MANUALLY");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=spark-overdue-report.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(report);
    }
}
