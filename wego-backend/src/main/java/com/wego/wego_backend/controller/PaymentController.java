package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.MomoCreatePaymentResponse;
import com.wego.wego_backend.dto.PaymentStatusResponse;
import com.wego.wego_backend.dto.PayosCreatePaymentResponse;
import com.wego.wego_backend.service.MomoPaymentService;
import com.wego.wego_backend.service.PayosPaymentService;
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
    private final PayosPaymentService payosPaymentService;

    @PostMapping("/payos/create")
    public PayosCreatePaymentResponse createPayos(Authentication authentication) {
        return payosPaymentService.createPayment(authentication.getName());
    }

    @PostMapping("/payos/webhook")
    public ResponseEntity<Map<String, Object>> payosWebhook(@RequestBody Map<String, Object> payload) {
        if (!payosPaymentService.processWebhook(payload)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid signature"));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/{orderCode}/status")
    public PaymentStatusResponse payosStatus(@PathVariable String orderCode, Authentication authentication) {
        return payosPaymentService.getStatus(orderCode, authentication.getName());
    }

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
