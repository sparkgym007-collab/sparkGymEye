package com.sparkgymeye.api.member;

import com.sparkgymeye.api.payment.Payment;
import com.sparkgymeye.api.payment.PaymentRepository;
import com.sparkgymeye.api.security.AppUser;
import com.sparkgymeye.api.security.AuthService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final PaymentRepository paymentRepository;

    public MemberService(MemberRepository memberRepository, AuthService authService, PaymentRepository paymentRepository) {
        this.memberRepository = memberRepository;
        this.authService = authService;
        this.paymentRepository = paymentRepository;
    }

    public List<Member> findAll() {
        return memberRepository.findAll();
    }

    public List<Member> findOverdue() {
        refreshStatuses();
        return memberRepository.findByStatus(MemberStatus.OVERDUE);
    }

    public Member findForUser(AppUser user) {
        return authService.findMemberByPhoneInput(user.getPhone()).orElseThrow();
    }

    @Transactional
    public Member create(Member member) {
        String normalizedPhone = authService.normalizePhone(member.getPhone());
        if (memberPhoneExists(member.getPhone(), null) || authService.findByPhoneInput(member.getPhone()).isPresent()) {
            throw new IllegalArgumentException("Phone number already exists");
        }
        member.setPhone(normalizedPhone);
        Member savedMember = memberRepository.save(member);
        appendCollectionSnapshot(savedMember);
        return savedMember;
    }

    @Transactional
    public Member update(Long id, Member changedMember) {
        Member member = memberRepository.findById(id).orElseThrow();
        String normalizedPhone = authService.normalizePhone(changedMember.getPhone());
        if (!member.getPhone().equals(normalizedPhone)
                && (memberPhoneExists(changedMember.getPhone(), member.getId()) || authService.findByPhoneInput(changedMember.getPhone()).isPresent())) {
            throw new IllegalArgumentException("Phone number already exists");
        }
        boolean paidPlanChanged = !Objects.equals(member.getPlanName(), changedMember.getPlanName())
                || !Objects.equals(member.getPlanStartDate(), changedMember.getPlanStartDate())
                || !Objects.equals(member.getDueDate(), changedMember.getDueDate())
                || member.getMonthlyFee().compareTo(changedMember.getMonthlyFee()) != 0;
        member.setRollNo(changedMember.getRollNo());
        member.setName(changedMember.getName());
        member.setPhone(normalizedPhone);
        member.setRole(changedMember.getRole());
        member.setPlanName(changedMember.getPlanName());
        member.setPlanStartDate(changedMember.getPlanStartDate());
        member.setDueDate(changedMember.getDueDate());
        member.setMonthlyFee(changedMember.getMonthlyFee());
        member.setAmountDue(changedMember.getAmountDue());
        member.setStatus(changedMember.getStatus());
        Member savedMember = memberRepository.save(member);
        if (paidPlanChanged) {
            appendCollectionSnapshot(savedMember);
        }
        return savedMember;
    }

    private void appendCollectionSnapshot(Member member) {
        BigDecimal amount = member.getMonthlyFee();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 || member.getPlanStartDate() == null) {
            return;
        }
        if (paymentRepository.existsByRollNoAndPlanNameAndAmountAndPaidAt(
                member.getRollNo(),
                member.getPlanName(),
                amount,
                member.getPlanStartDate()
        )) {
            return;
        }

        Payment payment = new Payment();
        payment.setRollNo(member.getRollNo());
        payment.setMemberName(member.getName());
        payment.setPlanName(member.getPlanName());
        payment.setAmount(amount);
        payment.setDurationMonths(Math.max(1, (int) ChronoUnit.MONTHS.between(member.getPlanStartDate(), member.getDueDate())));
        payment.setPaidAt(member.getPlanStartDate());
        payment.setPaymentMode("UPI");
        payment.setReceivedBy("ADMIN");
        paymentRepository.save(payment);
    }

    private boolean memberPhoneExists(String phone, Long ignoredMemberId) {
        String normalized = authService.normalizePhone(phone);
        if (memberRepository.findByPhone(normalized)
                .filter(existing -> ignoredMemberId == null || !existing.getId().equals(ignoredMemberId))
                .isPresent()) {
            return true;
        }
        String compact = normalized.startsWith("+91") ? normalized.substring(3) : normalized;
        return memberRepository.findByPhone(compact)
                .filter(existing -> ignoredMemberId == null || !existing.getId().equals(ignoredMemberId))
                .isPresent();
    }

    public void delete(Long id) {
        memberRepository.deleteById(id);
    }

    @Transactional
    public void refreshStatuses() {
        LocalDate today = LocalDate.now();
        memberRepository.findAll().forEach(member -> {
            long daysUntilDue = ChronoUnit.DAYS.between(today, member.getDueDate());
            if (daysUntilDue < 0) {
                member.setStatus(MemberStatus.OVERDUE);
                return;
            }
            if (daysUntilDue <= 7) {
                member.setStatus(MemberStatus.DUE_SOON);
                return;
            }
            member.setStatus(MemberStatus.ACTIVE);
        });
    }
}
