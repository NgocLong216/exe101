package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class QueryCountResponse {

    private long totalQueries;
}