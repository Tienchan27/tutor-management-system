package com.example.tms.api.mapper;

import com.example.tms.api.dto.session.SessionListItemResponse;
import com.example.tms.entity.Session;

public final class SessionMapper {

    private SessionMapper() {
    }

    public static SessionListItemResponse toListItemResponse(Session session) {
        return new SessionListItemResponse(
                session.getId(),
                session.getTutorClass().getId(),
                session.getDate(),
                session.getDurationHours(),
                session.getTuitionAtLog(),
                session.getSalaryRateAtLog(),
                session.getPayrollMonth(),
                session.getNote()
        );
    }
}
