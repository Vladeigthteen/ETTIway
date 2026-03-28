package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/signup")
    public String signup(@RequestBody Map<String, String> data) {
        String username = data.get("username");
        String password = data.get("password");
        boolean isAdmin = Boolean.parseBoolean(data.get("isAdmin"));

        if (userRepository.findByUsername(username).isPresent()) {
            return "Eroare: Utilizatorul exista deja!";
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password)); // Criptăm parola neapărat!
        
        // Dacă bifa e pusă, primește ROLE_ADMIN, altfel ROLE_USER
        user.setRole(isAdmin ? "ROLE_ADMIN" : "ROLE_USER");

        userRepository.save(user);
        return "Cont creat cu succes ca " + (isAdmin ? "Admin" : "User") + "!";
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("authenticated", false));
        }

        String role = authentication.getAuthorities().stream()
            .findFirst()
            .map(grantedAuthority -> grantedAuthority.getAuthority())
            .orElse("ROLE_USER");

        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "username", authentication.getName(),
            "role", role
        ));
    }
}