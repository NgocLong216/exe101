package com.wego.wego_backend.dto;

public record PaymentStatusResponse(String orderId, String status, long amount) {
}
