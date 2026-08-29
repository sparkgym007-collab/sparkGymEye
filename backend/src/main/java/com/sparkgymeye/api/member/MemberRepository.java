package com.sparkgymeye.api.member;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
    List<Member> findByDueDateBefore(LocalDate date);
    List<Member> findByStatus(MemberStatus status);
    Optional<Member> findByRollNo(String rollNo);
    Optional<Member> findByPhone(String phone);
    boolean existsByPhone(String phone);
}
