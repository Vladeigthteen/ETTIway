package com.example.demo.controller;

import com.example.demo.entity.MapData;
import com.example.demo.repository.MapDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/indoor")
public class IndoorMapController {

    @Autowired
    private MapDataRepository mapDataRepository;

    @PostMapping("/save")
    public ResponseEntity<String> saveIndoorMap(@RequestBody String indoorJson) {
        MapData mapData = mapDataRepository.findById(1L).orElse(new MapData());
        mapData.setId(1L);
        mapData.setIndoorJson(indoorJson);
        mapData.setUpdatedAt(LocalDateTime.now());
        mapDataRepository.save(mapData);
        return ResponseEntity.ok("Indoor map saved successfully.");
    }

    @GetMapping("/load")
    public ResponseEntity<String> loadIndoorMap() {
        Optional<MapData> mapDataOpt = mapDataRepository.findById(1L);
        if (mapDataOpt.isPresent() && mapDataOpt.get().getIndoorJson() != null) {
            return ResponseEntity.ok(mapDataOpt.get().getIndoorJson());
        }
        return ResponseEntity.ok("{}");
    }
}
