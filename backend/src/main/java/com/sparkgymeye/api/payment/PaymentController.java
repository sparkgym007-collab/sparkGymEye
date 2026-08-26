package com.sparkgymeye.api.payment;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentRepository paymentRepository;

    public PaymentController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @GetMapping("/{rollNo}")
    public List<Payment> byMember(@PathVariable String rollNo) {
        return paymentRepository.findByRollNoOrderByPaidAtDesc(rollNo);
    }

    @PostMapping
    public Payment record(@Valid @RequestBody Payment payment) {
        return paymentRepository.save(payment);
    }
}
