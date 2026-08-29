package com.sparkgymeye.api.member;

import com.sparkgymeye.api.security.AuthService;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final AuthService authService;

    public MemberService(MemberRepository memberRepository, AuthService authService) {
        this.memberRepository = memberRepository;
        this.authService = authService;
    }

    public List<Member> findAll() {
        return memberRepository.findAll();
    }

    public List<Member> findOverdue() {
        refreshStatuses();
        return memberRepository.findByStatus(MemberStatus.OVERDUE);
    }

    public Member create(Member member) {
        String normalizedPhone = authService.normalizePhone(member.getPhone());
        if (memberPhoneExists(member.getPhone(), null) || authService.findByPhoneInput(member.getPhone()).isPresent()) {
            throw new IllegalArgumentException("Phone number already exists");
        }
        member.setPhone(normalizedPhone);
        return memberRepository.save(member);
    }

    public Member update(Long id, Member changedMember) {
        Member member = memberRepository.findById(id).orElseThrow();
        String normalizedPhone = authService.normalizePhone(changedMember.getPhone());
        if (!member.getPhone().equals(normalizedPhone)
                && (memberPhoneExists(changedMember.getPhone(), member.getId()) || authService.findByPhoneInput(changedMember.getPhone()).isPresent())) {
            throw new IllegalArgumentException("Phone number already exists");
        }
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
        return memberRepository.save(member);
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
