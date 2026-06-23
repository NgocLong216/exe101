package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class InviteLinkResponse {

    private String inviteCode;

    private String inviteLink;
}
