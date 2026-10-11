package fr.demo.mobioff.dto;
import jakarta.validation.constraints.*;
public record UpdateInterventionDto(
        @NotBlank @Size(max = 40) String newEquipment,
        @NotNull @Size(max = 1000) String comment,
        @NotNull InterventionDto.Status status,
        @NotNull @PositiveOrZero Long version) { }
