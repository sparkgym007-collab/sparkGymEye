package com.sparkgymeye.api.payment;

import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByOrderByPaidAtDesc();
    List<Payment> findByRollNoOrderByPaidAtDesc(String rollNo);
    boolean existsByRollNoAndPlanNameAndAmountAndPaidAt(String rollNo, String planName, BigDecimal amount, LocalDate paidAt);
}
