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
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(request -> "1".equals(request.getParameter("edit"))).authenticated()
                .anyRequest().permitAll()
            )
            // În SecurityConfig.java
.formLogin(form -> form
    .loginPage("/login.html") // <--- Calea către fișierul tău HTML din folderul 'static'
    .loginProcessingUrl("/login") // <--- Endpoint-ul intern pe care Spring îl folosește pentru a procesa datele (nu trebuie modificat)
    .defaultSuccessUrl("/success", true) // <--- Unde trimite utilizatorul după login (am făcut ruta asta în AdminController)
    .failureUrl("/login.html?error=true")
    .permitAll() // <--- Permite tuturor să vadă pagina de login
)
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login.html")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            );

        return http.build();
    }
}