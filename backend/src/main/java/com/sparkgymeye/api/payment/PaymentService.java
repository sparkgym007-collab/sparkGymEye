package com.sparkgymeye.api.payment;

import com.sparkgymeye.api.member.Member;
import com.sparkgymeye.api.member.MemberRepository;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;

    public PaymentService(PaymentRepository paymentRepository, MemberRepository memberRepository) {
        this.paymentRepository = paymentRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public Payment record(Payment payment) {
        memberRepository.findByRollNo(payment.getRollNo()).ifPresent(member -> preparePaymentSnapshot(member, payment));
        Payment savedPayment = paymentRepository.save(payment);
        memberRepository.findByRollNo(payment.getRollNo()).ifPresent(member -> updateMemberFees(member, payment));
        return savedPayment;
    }

    private void preparePaymentSnapshot(Member member, Payment payment) {
        if (payment.getMemberName() == null || payment.getMemberName().isBlank()) {
            payment.setMemberName(member.getName());
        }
        if (payment.getPlanName() == null || payment.getPlanName().isBlank()) {
            payment.setPlanName(member.getPlanName());
        }
        if (payment.getPaymentMode() == null || payment.getPaymentMode().isBlank()) {
            payment.setPaymentMode("UPI");
        }
    }

    private void updateMemberFees(Member member, Payment payment) {
        BigDecimal remaining = member.getAmountDue().subtract(payment.getAmount());
        member.setAmountDue(remaining.max(BigDecimal.ZERO));
        member.setPlanStartDate(payment.getPaidAt());
        member.setDueDate(payment.getPaidAt().plusMonths(payment.getDurationMonths()));
        memberRepository.save(member);
    }
}
