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
    private final PaymentService paymentService;

    public PaymentController(PaymentRepository paymentRepository, PaymentService paymentService) {
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    @GetMapping("/{rollNo}")
    public List<Payment> byMember(@PathVariable String rollNo) {
        return paymentRepository.findByRollNoOrderByPaidAtDesc(rollNo);
    }

    @PostMapping
    public Payment record(@Valid @RequestBody Payment payment) {
        return paymentService.record(payment);
    }
}
