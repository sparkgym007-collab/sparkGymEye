package com.sparkgymeye.api.payment;

import com.sparkgymeye.api.member.Member;
import com.sparkgymeye.api.member.MemberService;
import com.sparkgymeye.api.security.AppUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final MemberService memberService;

    public PaymentController(PaymentRepository paymentRepository, PaymentService paymentService, MemberService memberService) {
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
        this.memberService = memberService;
    }

    @GetMapping
    public List<Payment> all() {
        return paymentRepository.findAllByOrderByPaidAtDesc();
    }

    @GetMapping("/me")
    public List<Payment> mine(@AuthenticationPrincipal AppUser user) {
        Member member = memberService.findForUser(user);
        return paymentRepository.findByRollNoOrderByPaidAtDesc(member.getRollNo());
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
