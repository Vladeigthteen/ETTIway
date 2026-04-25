package com.example.demo.controller;

import com.example.demo.entity.MapData;
import com.example.demo.repository.MapDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/graph")
public class GraphController {

    @Autowired
    private MapDataRepository mapDataRepository;

    @PostMapping("/save")
    public ResponseEntity<String> saveGraph(@RequestBody String graphJson) {
        MapData mapData = mapDataRepository.findById(1L).orElse(new MapData());
        mapData.setId(1L);
        mapData.setGraphJson(graphJson);
        mapData.setUpdatedAt(LocalDateTime.now());
        mapDataRepository.save(mapData);
        return ResponseEntity.ok("Graph saved successfully.");
    }

    @GetMapping("/load")
    public ResponseEntity<String> loadGraph() {
        Optional<MapData> mapDataOpt = mapDataRepository.findById(1L);
        if (mapDataOpt.isPresent() && mapDataOpt.get().getGraphJson() != null) {
            return ResponseEntity.ok(mapDataOpt.get().getGraphJson());
        }
        return ResponseEntity.ok("{}"); // Default empty JSON object
    }

    @DeleteMapping("/erase")
    public ResponseEntity<String> eraseGraph() {
        if (mapDataRepository.existsById(1L)) {
            mapDataRepository.deleteById(1L);
            return ResponseEntity.ok("Graph erased successfully.");
        }
        return ResponseEntity.ok("No graph found to erase.");
    }
}