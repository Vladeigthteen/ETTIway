package com.example.demo.repository;

import com.example.demo.entity.MapData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MapDataRepository extends JpaRepository<MapData, Long> {
}