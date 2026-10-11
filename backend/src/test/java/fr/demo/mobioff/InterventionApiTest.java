package fr.demo.mobioff;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest
@AutoConfigureMockMvc
class InterventionApiTest {
    @Autowired MockMvc mvc;
    @Test void listContainsFiveFictionalInterventions() throws Exception {
        mvc.perform(get("/api/interventions")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
    }
    @Test void missingAndInvalidRequestsHaveConsistentStatuses() throws Exception {
        mvc.perform(get("/api/interventions/99999")).andExpect(status().isNotFound());
        mvc.perform(put("/api/interventions/45821").contentType(MediaType.APPLICATION_JSON)
                .content("{\"newEquipment\":\"\",\"comment\":\"\",\"status\":\"DONE\",\"version\":1}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/interventions/45821").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }
    @Test void updateIncrementsVersionAndRejectsStaleWrites() throws Exception {
        String body = "{\"newEquipment\":\"EQP-TEST\",\"comment\":\"Contrôle terminé\",\"status\":\"DONE\",\"version\":3}";
        mvc.perform(put("/api/interventions/45835").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(4));
        mvc.perform(put("/api/interventions/45835").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }
}
