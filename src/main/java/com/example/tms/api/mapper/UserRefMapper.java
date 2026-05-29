package com.example.tms.api.mapper;

import com.example.tms.api.dto.common.UserRefResponse;
import com.example.tms.entity.User;

public final class UserRefMapper {

    private UserRefMapper() {
    }

    public static UserRefResponse toResponse(User user) {
        if (user == null) {
            return null;
        }
        return new UserRefResponse(user.getId(), user.getName(), user.getEmail());
    }
}
