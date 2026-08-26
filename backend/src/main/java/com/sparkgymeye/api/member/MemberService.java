package com.sparkgymeye.api.member;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public List<Member> findAll() {
        return memberRepository.findAll();
    }

    public List<Member> findOverdue() {
        refreshStatuses();
        return memberRepository.findByStatus(MemberStatus.OVERDUE);
    }

    public Member create(Member member) {
        return memberRepository.save(member);
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
