package com.sparkgymeye.api.member;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public List<Member> all() {
        return memberService.findAll();
    }

    @GetMapping("/overdue")
    public List<Member> overdue() {
        return memberService.findOverdue();
    }

    @PostMapping
    public Member create(@Valid @RequestBody Member member) {
        return memberService.create(member);
    }
}
