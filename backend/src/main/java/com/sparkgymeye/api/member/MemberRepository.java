package com.sparkgymeye.api.member;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findByDueDateBefore(LocalDate date);
    List<Member> findByStatus(MemberStatus status);
}
