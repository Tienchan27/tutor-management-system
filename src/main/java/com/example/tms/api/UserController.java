package com.example.tms.api;

import com.example.tms.api.dto.user.ProfileResponse;
import com.example.tms.api.dto.user.UpdateProfileRequest;
import com.example.tms.security.CurrentUserResolver;
import com.example.tms.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;
    private final CurrentUserResolver currentUserResolver;

    public UserController(UserService userService, CurrentUserResolver currentUserResolver) {
        this.userService = userService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/me/profile")
    public ProfileResponse getMyProfile() {
        return userService.getProfile(currentUserResolver.requireUserId());
    }

    @PatchMapping("/me/profile")
    public ProfileResponse updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(currentUserResolver.requireUserId(), request);
    }
}
