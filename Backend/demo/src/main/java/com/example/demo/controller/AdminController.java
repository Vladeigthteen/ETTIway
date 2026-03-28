package com.example.demo.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminController {

    @GetMapping("/login")
    public String login() {
        return "login.html";
    }

    @GetMapping("/success")
public String directAfterLogin(Authentication auth) {
    if (auth == null) return "redirect:/login";

    if (auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
        // În loc de pagina de test, trimitem la index.html cu parametrul edit
        return "redirect:/?edit=1"; 
    }
    
    // Trimitem studentul la harta normală
    return "redirect:/"; 
}

@GetMapping("/")
public String home() {
    // Aceasta va căuta index.html în folderul static
    return "index.html";
}
}