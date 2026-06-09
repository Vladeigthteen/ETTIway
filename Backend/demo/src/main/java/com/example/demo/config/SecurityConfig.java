package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpMethod;


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
        .csrf(csrf -> csrf.disable())  // Privat prin Tailscale - vezi nota
        .authorizeHttpRequests(auth -> auth
            // 1. Resurse publice (login, signup, statice)
            .requestMatchers("/login.html", "/auth.html", "/api/auth/**",
                             "/css/**", "/js/**", "/icons/**", "/Icons/**", "/data/**").permitAll()
            
            // 2. API Graph: GET (load) public, POST/DELETE (save/erase) doar ADMIN
            .requestMatchers(HttpMethod.GET, "/api/graph/**").authenticated()
            .requestMatchers(HttpMethod.POST, "/api/graph/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/graph/**").hasRole("ADMIN")
            
            // 3. API Indoor: GET (load) autentificat, POST (save) doar ADMIN
            .requestMatchers(HttpMethod.GET, "/api/indoor/**").authenticated()
            .requestMatchers(HttpMethod.POST, "/api/indoor/**").hasRole("ADMIN")
            
            // 4. Rute rezervate administratorului
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            
            // 5. Restul paginilor cer doar autentificare
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login.html")
            .loginProcessingUrl("/login")
            .defaultSuccessUrl("/success", true)
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