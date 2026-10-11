package fr.demo.mobioff.dto;
public record InterventionDto(long id, String type, String client, String address,
        String currentEquipment, String newEquipment, String comment,
        Status status, Priority priority, long version) {
    public enum Status { TODO, IN_PROGRESS, DONE }
    public enum Priority { HIGH, NORMAL }
}
