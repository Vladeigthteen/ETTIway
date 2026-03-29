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
    // 1. Publice
    .requestMatchers("/login.html", "/auth.html", "/api/auth/**", "/css/**", "/js/**", "/icons/**", "/data/**").permitAll()
    
    // 2. DOAR PENTRU ADMIN (Adaugă linia asta!)
    // Aceasta va proteja fișierul și orice parametru gen ?edit=1
    .requestMatchers("/api/admin/**").hasRole("ADMIN") 
    
    // 3. Restul paginilor (index.html etc.) cer doar să fii logat
    .anyRequest().authenticated()
)
        .formLogin(form -> form
            .loginPage("/login.html") // Fișierul tău din folderul static
            .loginProcessingUrl("/login") // Endpoint-ul intern Spring
            .defaultSuccessUrl("/success", true) // Trimite-l la metoda care VERIFICĂ rolul, nu direct la fișier
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