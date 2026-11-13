package com.pfetracker.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.pfetracker.entity.Application;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AiAssistantParseTest {

    private Application app() {
        Application a = new Application();
        a.setJobTitle("Stage Java");
        a.setContactEmail("rh@acme.com");
        return a;
    }

    @Test
    void parsesStandardFormat() {
        Map<String, String> r = AiAssistantService.parseEmail(
                "OBJET: Relance candidature Stage Java\n---\nBonjour Madame,\n\nJe me permets…\n\n[Ton prénom]", app());
        assertEquals("Relance candidature Stage Java", r.get("subject"));
        assertTrue(r.get("body").startsWith("Bonjour Madame"));
        assertEquals("rh@acme.com", r.get("to"));
    }

    @Test
    void toleratesMarkdownBoldAndNoSeparator() {
        Map<String, String> r = AiAssistantService.parseEmail(
                "**Objet :** Suivi de candidature\n\nBonjour,\nmerci.", app());
        assertEquals("Suivi de candidature", r.get("subject"));
        assertEquals("Bonjour,\nmerci.", r.get("body"));
    }

    @Test
    void fallsBackWhenNoSubject() {
        Map<String, String> r = AiAssistantService.parseEmail("Bonjour,\nje relance.", app());
        assertEquals("Suivi de ma candidature — Stage Java", r.get("subject"));
        assertEquals("Bonjour,\nje relance.", r.get("body"));
    }
}
