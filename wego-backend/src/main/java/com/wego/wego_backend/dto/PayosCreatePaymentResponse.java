package com.wego.wego_backend.dto;

public record PayosCreatePaymentResponse(String orderCode, String checkoutUrl, String qrCode) {
}
