package fr.demo.mobioff.controller;
import fr.demo.mobioff.dto.InterventionDto;
import fr.demo.mobioff.dto.UpdateInterventionDto;
import fr.demo.mobioff.service.InterventionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/interventions")
public class InterventionController {
    private final InterventionService service;
    public InterventionController(InterventionService service) { this.service = service; }
    @GetMapping public List<InterventionDto> list() { return service.list(); }
    @GetMapping("/{id}") public InterventionDto get(@PathVariable long id) { return service.get(id); }
    @PutMapping("/{id}") public InterventionDto update(@PathVariable long id, @Valid @RequestBody UpdateInterventionDto update) { return service.update(id, update); }
}
