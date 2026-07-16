package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.MomoCreatePaymentResponse;
import com.wego.wego_backend.dto.PaymentStatusResponse;
import com.wego.wego_backend.service.MomoPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final MomoPaymentService momoPaymentService;

    @PostMapping("/momo")
    public MomoCreatePaymentResponse create(Authentication authentication) {
        return momoPaymentService.createPayment(authentication.getName());
    }

    @PostMapping("/momo/ipn")
    public ResponseEntity<Map<String, Object>> ipn(@RequestBody Map<String, Object> payload) {
        if (!momoPaymentService.processIpn(payload)) {
            return ResponseEntity.badRequest().body(Map.of("resultCode", 1, "message", "Invalid signature"));
        }
        return ResponseEntity.ok(Map.of("resultCode", 0, "message", "Success"));
    }

    @GetMapping("/{orderId}")
    public PaymentStatusResponse status(@PathVariable String orderId, Authentication authentication) {
        return momoPaymentService.getStatus(orderId, authentication.getName());
    }
}
