package com.sparkgymeye.api.attendance;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;

    public AttendanceController(AttendanceRepository attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }

    @GetMapping
    public List<Attendance> byDate(@RequestParam(required = false) LocalDate date) {
        return attendanceRepository.findByAttendanceDate(date == null ? LocalDate.now() : date);
    }

    @PostMapping
    public Attendance mark(@Valid @RequestBody Attendance attendance) {
        return attendanceRepository.save(attendance);
    }
}
