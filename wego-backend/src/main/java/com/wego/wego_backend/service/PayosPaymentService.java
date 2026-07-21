package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.PayosCreatePaymentResponse;
import com.wego.wego_backend.dto.PaymentStatusResponse;
import com.wego.wego_backend.entity.Payment;
import com.wego.wego_backend.repository.PaymentRepository;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class PayosPaymentService {
    private static final long WEGO_PLUS_AMOUNT = 30_000L;
    private static final String PROVIDER = "PAYOS";

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${payos.client-id:}") private String clientId;
    @Value("${payos.api-key:}") private String apiKey;
    @Value("${payos.checksum-key:}") private String checksumKey;
    @Value("${payos.endpoint:https://api-merchant.payos.vn/v2/payment-requests}") private String endpoint;
    @Value("${payos.return-url:myapp://payment-result}") private String returnUrl;
    @Value("${payos.cancel-url:myapp://payment-result?cancelled=true}") private String cancelUrl;

    public PayosCreatePaymentResponse createPayment(String firebaseUid) {
        requireConfiguration();
        long code = System.currentTimeMillis() * 100 + ThreadLocalRandom.current().nextInt(100);
        String orderCode = Long.toString(code);
        String description = "WEGO PLUS " + orderCode.substring(orderCode.length() - 6);

        Payment payment = new Payment();
        payment.setOrderId(orderCode);
        payment.setRequestId(orderCode);
        payment.setFirebaseUid(firebaseUid);
        payment.setAmount(WEGO_PLUS_AMOUNT);
        payment.setProvider(PROVIDER);
        payment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderCode", code);
        body.put("amount", WEGO_PLUS_AMOUNT);
        body.put("description", description);
        body.put("cancelUrl", cancelUrl);
        body.put("returnUrl", returnUrl);
        body.put("signature", hmac("amount=" + WEGO_PLUS_AMOUNT + "&cancelUrl=" + cancelUrl
                + "&description=" + description + "&orderCode=" + code + "&returnUrl=" + returnUrl));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);
        try {
            String json = restTemplate.postForObject(endpoint, new HttpEntity<>(body, headers), String.class);
            Map<String, Object> response = objectMapper.readValue(json, new TypeReference<>() {});
            if (!"00".equals(value(response.get("code"))) || !(response.get("data") instanceof Map<?, ?> data)) {
                String message = value(response.get("desc"));
                fail(payment, message);
                throw new IllegalStateException(message.isBlank() ? "payOS rejected payment" : message);
            }
            String checkoutUrl = value(data.get("checkoutUrl"));
            if (checkoutUrl.isBlank()) {
                fail(payment, "payOS did not return a checkout URL");
                throw new IllegalStateException("payOS did not return a checkout URL");
            }
            payment.setPaymentLinkId(value(data.get("paymentLinkId")));
            paymentRepository.save(payment);
            return new PayosCreatePaymentResponse(orderCode, checkoutUrl, value(data.get("qrCode")));
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            fail(payment, "Could not connect to payOS");
            throw new IllegalStateException("Could not create payOS payment", e);
        }
    }

    @Transactional
    public synchronized boolean processWebhook(Map<String, Object> payload) {
        if (checksumKey.isBlank() || !(payload.get("data") instanceof Map<?, ?> raw)) return false;
        Map<String, Object> data = new LinkedHashMap<>();
        raw.forEach((key, val) -> data.put(String.valueOf(key), val));
        if (!secureEquals(hmac(canonical(data)), value(payload.get("signature")))) return false;

        paymentRepository.findById(value(data.get("orderCode"))).ifPresent(payment -> {
            if (payment.getStatus() == Payment.Status.PAID || !PROVIDER.equals(payment.getProvider())) return;
            long receivedAmount = number(data.get("amount"));
            if (receivedAmount != payment.getAmount()) {
                payment.setStatus(Payment.Status.FAILED);
                payment.setResultMessage("Webhook amount mismatch");
                paymentRepository.save(payment);
                return;
            }
            if (!"00".equals(value(data.get("code")))) return;

            payment.setStatus(Payment.Status.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setProviderTransactionId(value(data.get("reference")));
            payment.setPaymentLinkId(value(data.get("paymentLinkId")));
            payment.setResultCode(0);
            payment.setResultMessage(value(data.get("desc")));
            paymentRepository.save(payment);

            userRepository.findById(payment.getFirebaseUid()).ifPresent(user -> {
                LocalDateTime now = LocalDateTime.now();
                LocalDateTime expiry = user.getPlanExpiresAt();
                user.setPlan("PLUS");
                user.setPlanExpiresAt((expiry != null && expiry.isAfter(now) ? expiry : now).plusDays(30));
                userRepository.save(user);
            });
        });
        return true;
    }

    public PaymentStatusResponse getStatus(String orderCode, String firebaseUid) {
        Payment payment = paymentRepository.findById(orderCode)
                .filter(p -> p.getFirebaseUid().equals(firebaseUid) && PROVIDER.equals(p.getProvider()))
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        return new PaymentStatusResponse(payment.getOrderId(), payment.getStatus().name(), payment.getAmount());
    }

    private String canonical(Map<String, Object> data) {
        return data.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + value(e.getValue()))
                .reduce((a, b) -> a + "&" + b).orElse("");
    }

    private void requireConfiguration() {
        if (clientId.isBlank() || apiKey.isBlank() || checksumKey.isBlank()
                || returnUrl.isBlank() || cancelUrl.isBlank())
            throw new IllegalStateException("payOS credentials or callback URLs are not configured");
    }

    private void fail(Payment payment, String message) {
        payment.setStatus(Payment.Status.FAILED);
        payment.setResultMessage(message);
        paymentRepository.save(payment);
    }

    private String hmac(String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(checksumKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign payOS data", e);
        }
    }

    private static String value(Object input) { return input == null ? "" : String.valueOf(input); }
    private static long number(Object input) {
        try { return Long.parseLong(value(input)); } catch (NumberFormatException ignored) { return -1; }
    }
    private static boolean secureEquals(String expected, String actual) {
        return java.security.MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }
}
