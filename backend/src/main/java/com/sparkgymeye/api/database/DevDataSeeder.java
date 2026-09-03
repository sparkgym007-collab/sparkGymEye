package com.sparkgymeye.api.database;

import com.sparkgymeye.api.member.Member;
import com.sparkgymeye.api.member.MemberRepository;
import com.sparkgymeye.api.member.MemberStatus;
import com.sparkgymeye.api.payment.Payment;
import com.sparkgymeye.api.payment.PaymentRepository;
import com.sparkgymeye.api.security.Role;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DevDataSeeder implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final PaymentRepository paymentRepository;
    private final String datasourceUrl;
    private final boolean seedEnabled;

    public DevDataSeeder(
            MemberRepository memberRepository,
            PaymentRepository paymentRepository,
            @Value("${spring.datasource.url:}") String datasourceUrl,
            @Value("${spark.dev.seed.enabled:true}") boolean seedEnabled
    ) {
        this.memberRepository = memberRepository;
        this.paymentRepository = paymentRepository;
        this.datasourceUrl = datasourceUrl;
        this.seedEnabled = seedEnabled;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled || !datasourceUrl.contains(":h2:") || paymentRepository.count() > 0) {
            return;
        }

        List<Member> members = seedMembers();
        seedPayments(members);
    }

    private List<Member> seedMembers() {
        List<Member> members = new ArrayList<>();
        String[] names = {
                "Aarav Sharma", "Diya Patel", "Kabir Singh", "Ananya Das", "Rohan Mehta", "Ishaan Rao",
                "Meera Kapoor", "Vivaan Sen", "Nisha Verma", "Arjun Nair", "Tara Bose", "Reyansh Gupta",
                "Kiara Iyer", "Dev Malhotra", "Saanvi Roy", "Yash Khanna", "Priya Menon", "Aditya Jain",
                "Neha Agarwal", "Kunal Saha", "Riya Mukherjee", "Manav Bansal", "Simran Kaur", "Aryan Dutta"
        };

        for (int index = 0; index < names.length; index += 1) {
            int planIndex = index % 3;
            int months = planIndex == 0 ? 1 : planIndex == 1 ? 3 : 6;
            BigDecimal amount = planIndex == 0 ? BigDecimal.valueOf(600) : planIndex == 1 ? BigDecimal.valueOf(1400) : BigDecimal.valueOf(2600);
            LocalDate startedAt = LocalDate.of(2026, 8, 3 + (index % 18));

            Member member = new Member();
            member.setRollNo("SP-" + String.format("%03d", index + 1));
            member.setName(names[index]);
            member.setPhone("+91980000" + String.format("%04d", index + 1));
            member.setRole(Role.MEMBER);
            member.setPlanName(months == 1 ? "1 Month" : months + " Months");
            member.setPlanStartDate(startedAt);
            member.setDueDate(startedAt.plusMonths(months));
            member.setMonthlyFee(amount);
            member.setAmountDue(index % 5 == 0 ? amount : BigDecimal.ZERO);
            member.setStatus(index % 5 == 0 ? MemberStatus.DUE_SOON : MemberStatus.ACTIVE);
            members.add(memberRepository.save(member));
        }
        return members;
    }

    private void seedPayments(List<Member> members) {
        int[] monthCounts = { 7, 8, 9, 10, 12, 14, 16, 18 };
        for (int month = 1; month <= monthCounts.length; month += 1) {
            int count = monthCounts[month - 1];
            for (int index = 0; index < count; index += 1) {
                Member member = members.get((index + month) % members.size());
                int months = index % 6 == 0 ? 6 : index % 3 == 0 ? 3 : 1;
                BigDecimal amount = months == 6 ? BigDecimal.valueOf(2600) : months == 3 ? BigDecimal.valueOf(1400) : BigDecimal.valueOf(600);

                Payment payment = new Payment();
                payment.setRollNo(member.getRollNo());
                payment.setMemberName(member.getName());
                payment.setPlanName(months == 1 ? "1 Month" : months + " Months");
                payment.setAmount(amount);
                payment.setDurationMonths(months);
                payment.setPaidAt(LocalDate.of(2026, month, 2 + (index % 24)));
                payment.setPaymentMode(index % 4 == 0 ? "Cash" : index % 5 == 0 ? "Card" : "UPI");
                payment.setReceivedBy("DEV_SEED");
                paymentRepository.save(payment);
            }
        }
    }
}
