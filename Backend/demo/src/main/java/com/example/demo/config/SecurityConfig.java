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

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())  
        .authorizeHttpRequests(auth -> auth
            
            .requestMatchers("/login.html", "/auth.html", "/api/auth/**",
                             "/css/**", "/js/**", "/icons/**", "/Icons/**", "/data/**").permitAll()
            
            
            .requestMatchers(HttpMethod.GET, "/api/graph/**").authenticated()
            .requestMatchers(HttpMethod.POST, "/api/graph/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.DELETE, "/api/graph/**").hasRole("ADMIN")
            
            
            .requestMatchers(HttpMethod.GET, "/api/indoor/**").authenticated()
            .requestMatchers(HttpMethod.POST, "/api/indoor/**").hasRole("ADMIN")
            
           
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            
            
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