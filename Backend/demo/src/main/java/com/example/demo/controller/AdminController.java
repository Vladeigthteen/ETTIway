package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminController {

    // Această metodă verifică dacă parametrul edit=1 este prezent
    @GetMapping("/")
    public String checkEditMode(@RequestParam(name = "edit", required = false) String edit) {
        if ("1".equals(edit)) {
            return "Acces confirmat! Ești în modul de editare admin.";
        }
        return "Ești pe pagina principală (mod vizualizare).";
    }
}