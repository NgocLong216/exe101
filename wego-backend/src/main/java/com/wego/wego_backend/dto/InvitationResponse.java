package com.wego.wego_backend.dto;

import java.util.UUID;

public record InvitationResponse(
        UUID memberId,
        UUID groupId,
        String groupTitle
) {}
