package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.*;
import com.wego.wego_backend.repository.UserRepository;
import com.wego.wego_backend.service.UserService;
import com.wego.wego_backend.service.UserAiProfileService;
import com.wego.wego_backend.service.AccountDeletionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserAiProfileService userAiProfileService;
    private final AccountDeletionService accountDeletionService;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String keyword
    ) {
        return ResponseEntity.ok(
                userService.searchUsers(keyword)
        );
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {

        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.getMyProfile(firebaseUid)
        );
    }

    @GetMapping("/me/ai-profile")
    public ResponseEntity<?> getMyAiProfile(Authentication authentication) {
        return ResponseEntity.ok(
                userAiProfileService.syncFromPersonalChats(
                        authentication.getName()
                )
        );
    }

    @GetMapping("/me/hobbies")
    public ResponseEntity<?> getMyHobbies(Authentication authentication) {
        return ResponseEntity.ok(
                userService.getHobbyPreferences(authentication.getName())
        );
    }

    @PutMapping("/me/hobbies")
    public ResponseEntity<?> saveMyHobbies(
            @RequestBody HobbyPreferencesRequest request,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        Map<String, Object> preferences =
                userService.saveHobbyPreferences(firebaseUid, request);
        userAiProfileService.invalidate(firebaseUid);
        return ResponseEntity.ok(preferences);
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMyAccount(Authentication authentication) {
        accountDeletionService.deleteAccount(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMyProfile(

            @RequestParam String name,
            @RequestParam(required = false) MultipartFile avatar,

            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.updateMyProfile(firebaseUid, name, avatar)
        );
    }

    @PostMapping("/save-fcm-token")
    public ResponseEntity<?> saveFcmToken(
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();
        String token = body.get("fcmToken");

        userService.saveFcmToken(firebaseUid, token);

        return ResponseEntity.ok("Token saved");
    }

    @PostMapping("/suggest-place")
    public ResponseEntity<?> suggestPlace(
            @RequestBody SuggestPlaceRequest request,
            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.suggest(
                        firebaseUid,
                        request.getKeyword()
                )
        );
    }

    @PutMapping("/push-token")
    public ResponseEntity<?> updatePushToken(
            Authentication authentication,
            @RequestBody PushTokenRequest request
    ){

        String firebaseUid = authentication.getName();

        userService.updatePushToken(
                firebaseUid,
                request.getExpoPushToken()
        );

        return ResponseEntity.ok().build();
    }

    @PatchMapping("/notification-setting")
    public ResponseEntity<?> updateNotificationSetting(
            @RequestBody UpdateNotificationSettingRequest request,
            Authentication authentication
    ) {

        userService.updateNotificationSetting(
                authentication.getName(),
                request.getEnabled()
        );

        return ResponseEntity.ok().build();
    }

    @PatchMapping("/location-sharing")
    public ResponseEntity<?> updateLocationSharing(

            @RequestBody UpdateLocationSharingRequest request,

            Authentication authentication
    ) {

        userService.updateLocationSharing(

                authentication.getName(),

                request.getEnabled()
        );

        return ResponseEntity.ok().build();
    }
}
