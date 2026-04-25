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
        .csrf(csrf -> csrf
            .ignoringRequestMatchers("/api/graph/**") // Dezactivăm CSRF special pentru rutele de graph (POST/DELETE din JavaScript)
            .disable() // Notă: Dacă activezi CSRF-ul global pe viitor, șterge `.disable()` și lasă doar rândul de mai sus
        )
        .authorizeHttpRequests(auth -> auth
    // 1. Publice
    .requestMatchers("/login.html", "/auth.html", "/api/auth/**", "/css/**", "/js/**", "/icons/**", "/data/**").permitAll()
    
    // API-ul de Graph public sau poți schimba în .hasRole("ADMIN") dacă este necesar
    .requestMatchers("/api/graph/**").permitAll()
    
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