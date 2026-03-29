package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
public class SecurityConfig {

    // ACEASTA ESTE METODA CARE LIPSEȘTE (adaug-o acum)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // Dezactivăm CSRF pentru simplitate în faza de dev
        .authorizeHttpRequests(auth -> auth
            // 1. Permitem tuturor să vadă pagina de login și fișierele de stil/imagini
            .requestMatchers("/login.html", "/auth.html","/api/auth/**", "/css/**", "/js/**", "/icons/**", "/data/**").permitAll()
            // 2. Orice altă pagină (inclusiv index.html cu harta) cere logare
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login.html") // Fișierul tău din folderul static
            .loginProcessingUrl("/login") // Endpoint-ul intern Spring
            .defaultSuccessUrl("/index.html", true) // Unde te trimite după succes
            .permitAll()
        )
        .logout(logout -> logout
            .logoutUrl("/logout")
            .logoutSuccessUrl("/login.html")
            .permitAll()
        );

    return http.build();
}
}