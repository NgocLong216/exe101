package com.wego.wego_backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateGroupRequest {

    private String title;

    private String description;

    private String groupPhoto;
}