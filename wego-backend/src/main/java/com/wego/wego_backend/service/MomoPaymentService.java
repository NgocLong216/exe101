package com.wego.wego_backend.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.wego.wego_backend.dto.MomoCreatePaymentResponse;
import com.wego.wego_backend.dto.PaymentStatusResponse;
import com.wego.wego_backend.entity.Payment;
import com.wego.wego_backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MomoPaymentService {
    private static final long WEGO_PLUS_AMOUNT = 30_000L;

    private final PaymentRepository paymentRepository;
    private final com.wego.wego_backend.repository.UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final UserAiProfileService userAiProfileService;

    @Value("${momo.partner-code:}") private String partnerCode;
    @Value("${momo.access-key:}") private String accessKey;
    @Value("${momo.secret-key:}") private String secretKey;
    @Value("${momo.endpoint:https://test-payment.momo.vn/v2/gateway/api/create}") private String endpoint;
    @Value("${momo.redirect-url:myapp://payment-result}") private String redirectUrl;
    @Value("${momo.ipn-url:}") private String ipnUrl;

    public MomoCreatePaymentResponse createPayment(String firebaseUid) {
        requireConfiguration();

        String suffix = UUID.randomUUID().toString().replace("-", "");
        String orderId = "WEGO" + suffix;
        String requestId = "REQ" + suffix;
        String amount = Long.toString(WEGO_PLUS_AMOUNT);
        String extraData = "";
        String orderInfo = "WeGo Plus monthly plan";
        String requestType = "captureWallet";

        String rawSignature = "accessKey=" + accessKey
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + ipnUrl
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + partnerCode
                + "&redirectUrl=" + redirectUrl
                + "&requestId=" + requestId
                + "&requestType=" + requestType;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("requestType", requestType);
        body.put("ipnUrl", ipnUrl);
        body.put("redirectUrl", redirectUrl);
        body.put("orderId", orderId);
        body.put("amount", amount);
        body.put("orderInfo", orderInfo);
        body.put("requestId", requestId);
        body.put("extraData", extraData);
        body.put("lang", "vi");
        body.put("autoCapture", true);
        body.put("signature", hmac(rawSignature));

        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setRequestId(requestId);
        payment.setFirebaseUid(firebaseUid);
        payment.setAmount(WEGO_PLUS_AMOUNT);
        payment.setCreatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, body, String.class);
            Map<String, Object> result = objectMapper.readValue(response.getBody(), new TypeReference<>() {});
            int resultCode = ((Number) result.getOrDefault("resultCode", -1)).intValue();
            String payUrl = (String) result.get("payUrl");
            if (resultCode != 0 || payUrl == null || payUrl.isBlank()) {
                fail(payment, resultCode, String.valueOf(result.getOrDefault("message", "MoMo rejected payment")));
                throw new IllegalStateException(String.valueOf(result.getOrDefault("message", "MoMo rejected payment")));
            }
            return new MomoCreatePaymentResponse(orderId, payUrl);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            fail(payment, -1, "Could not connect to MoMo");
            throw new IllegalStateException("Could not create MoMo payment", e);
        }
    }

    public boolean processIpn(Map<String, Object> payload) {
        if (partnerCode.isBlank() || secretKey.isBlank()) return false;
        String rawSignature = "accessKey=" + accessKey
                + "&amount=" + value(payload, "amount")
                + "&extraData=" + value(payload, "extraData")
                + "&message=" + value(payload, "message")
                + "&orderId=" + value(payload, "orderId")
                + "&orderInfo=" + value(payload, "orderInfo")
                + "&orderType=" + value(payload, "orderType")
                + "&partnerCode=" + value(payload, "partnerCode")
                + "&payType=" + value(payload, "payType")
                + "&requestId=" + value(payload, "requestId")
                + "&responseTime=" + value(payload, "responseTime")
                + "&resultCode=" + value(payload, "resultCode")
                + "&transId=" + value(payload, "transId");

        if (!partnerCode.equals(value(payload, "partnerCode"))
                || !constantTimeEquals(hmac(rawSignature), value(payload, "signature"))) {
            return false;
        }

        paymentRepository.findById(value(payload, "orderId")).ifPresent(payment -> {
            if (payment.getStatus() == Payment.Status.PAID) return;
            int resultCode = Integer.parseInt(value(payload, "resultCode"));
            payment.setResultCode(resultCode);
            payment.setResultMessage(value(payload, "message"));
            if (resultCode == 0 && payment.getAmount().toString().equals(value(payload, "amount"))) {
                payment.setStatus(Payment.Status.PAID);
                payment.setPaidAt(LocalDateTime.now());
                payment.setMomoTransactionId(Long.parseLong(value(payload, "transId")));
                userRepository.findById(payment.getFirebaseUid()).ifPresent(user -> {
                    LocalDateTime now = LocalDateTime.now();
                    LocalDateTime currentExpiry = user.getPlanExpiresAt();
                    user.setPlan("PLUS");
                    user.setPlanExpiresAt((currentExpiry != null && currentExpiry.isAfter(now) ? currentExpiry : now).plusDays(30));
                    userRepository.save(user);
                    userAiProfileService.syncFromPersonalChats(user.getFirebaseUid());
                });
            } else {
                payment.setStatus(Payment.Status.FAILED);
            }
            paymentRepository.save(payment);
        });
        return true;
    }

    public PaymentStatusResponse getStatus(String orderId, String firebaseUid) {
        Payment payment = paymentRepository.findById(orderId)
                .filter(item -> item.getFirebaseUid().equals(firebaseUid))
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        return new PaymentStatusResponse(payment.getOrderId(), payment.getStatus().name(), payment.getAmount());
    }

    private void requireConfiguration() {
        if (partnerCode.isBlank() || accessKey.isBlank() || secretKey.isBlank() || ipnUrl.isBlank()) {
            throw new IllegalStateException("MoMo credentials or IPN URL are not configured");
        }
    }

    private void fail(Payment payment, int code, String message) {
        payment.setStatus(Payment.Status.FAILED);
        payment.setResultCode(code);
        payment.setResultMessage(message);
        paymentRepository.save(payment);
    }

    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign MoMo request", e);
        }
    }

    private static String value(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        return java.security.MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }
}
