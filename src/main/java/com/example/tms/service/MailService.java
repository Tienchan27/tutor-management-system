package com.example.tms.service;

import com.example.tms.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final JavaMailSender mailSender;
    private final Environment environment;

    public MailService(JavaMailSender mailSender, Environment environment) {
        this.mailSender = mailSender;
        this.environment = environment;
    }

    private boolean isTestProfile() {
        return environment.acceptsProfiles(Profiles.of("test"));
    }

    public void sendOtpEmail(String to, String otp) {
        if (isTestProfile()) {
            // In unit/integration tests we don't rely on an external SMTP server.
            log.debug("Skip OTP email sending in test profile for {}", to);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Your Tutor Management System OTP");
            message.setText("Your OTP code is: " + otp + ". It expires in 5 minutes.");
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("OTP email sending failed for {}: {}", to, ex.getMessage(), ex);
            throw new ApiException("Failed to deliver OTP email. Please try again later.");
        }
    }

    public void sendPasswordResetOtp(String to, String otp) {
        if (isTestProfile()) {
            log.debug("Skip password reset OTP email sending in test profile for {}", to);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Reset your Tutor Management System password");
            message.setText(
                    "Your password reset code is: " + otp + ". It expires in 5 minutes. "
                            + "If you did not request this, you can ignore this email."
            );
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Password reset email sending failed for {}: {}", to, ex.getMessage(), ex);
            throw new ApiException("Failed to deliver password reset email. Please try again later.");
        }
    }

    public void sendTutorInvitationEmail(String to) {
        if (isTestProfile()) {
            log.debug("Skip tutor invitation email sending in test profile for {}", to);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Tutor invitation from Tutor Management System");
            message.setText("You have been invited as a tutor. Please sign in or register with this email to activate your tutor access.");
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Tutor invitation email sending failed for {}: {}", to, ex.getMessage(), ex);
            throw new ApiException("Failed to deliver invitation email. Please try again later.");
        }
    }

    public void sendStudentInvitationEmail(String to) {
        if (isTestProfile()) {
            log.debug("Skip student invitation email sending in test profile for {}", to);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Student invitation from Tutor Management System");
            message.setText("You have been added to a class. Please sign in with Google or register this email to access your student workspace.");
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Student invitation email sending failed for {}: {}", to, ex.getMessage(), ex);
            throw new ApiException("Failed to deliver invitation email. Please try again later.");
        }
    }

    /**
     * Best-effort email for operational notifications.
     * This must never break the primary business operation.
     */
    public void sendNotificationEmail(String to, String subject, String content) {
        if (isTestProfile()) {
            log.debug("Skip notification email sending in test profile for {}", to);
            return;
        }
        if (to == null || to.isBlank()) {
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject == null ? "Notification" : subject);
            message.setText(content == null ? "" : content);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Notification email sending failed for {}: {}", to, ex.getMessage());
        }
    }
}
