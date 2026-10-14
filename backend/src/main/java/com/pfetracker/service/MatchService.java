package com.pfetracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pfetracker.dto.match.MatchResult;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/**
 * Score ATS-like par mots-clés (sans IA). Isolé pour brancher une IA plus tard.
 */
@Service
public class MatchService {

    private static final String INSUFFICIENT_MARKER = "__INSUFFICIENT__";
    private static final int MIN_DICT_KEYWORDS_PREFERRED = 3;

    private static final Set<String> STOPWORDS = Set.of(
            "avec", "sans", "pour", "dans", "chez", "plus", "moins", "tres", "tout", "tous", "toute",
            "toutes", "cette", "ceux", "celle", "celles", "etre", "avoir", "faire", "nous", "vous",
            "leur", "leurs", "notre", "votre", "comme", "aussi", "dont", "ainsi", "entre", "apres",
            "avant", "selon", "sous", "vers", "une", "des", "les", "aux", "par", "sur",
            "the", "and", "for", "with", "from", "this", "that", "your", "our", "are", "will",
            "have", "has", "been", "into", "about", "over", "under", "recherchons", "recherche",
            "poste", "profil", "mission", "missions", "equipe", "societe", "entreprise", "candidat",
            "candidature", "experience", "ans", "annee", "annees", "mois", "bon", "bonne", "niveau",
            "maitrise", "connaissances", "connaissance", "idealement", "souhaite", "requis", "exige",
            "environnement", "projet", "projets", "travail", "capable", "permettant", "permet",
            "aujourdhui", "demain", "puis", "donc", "mais", "ou", "et", "si", "en", "de", "du", "la",
            "le", "un", "a", "d", "l", "au", "ce", "se", "ne", "pas", "qui", "que", "quoi"
    );

    private final ObjectMapper objectMapper;
    private List<KeywordEntry> dictionary = List.of();

    public MatchService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void loadDictionary() throws Exception {
        try (InputStream in = new ClassPathResource("keywords.json").getInputStream()) {
            dictionary = objectMapper.readValue(in, new TypeReference<List<KeywordEntry>>() {});
        }
        // Plus longs d'abord pour matcher « spring boot » avant « spring »
        dictionary = dictionary.stream()
                .sorted(Comparator.comparingInt((KeywordEntry k) -> -k.allForms().stream().mapToInt(String::length).max().orElse(0)))
                .toList();
    }

    /**
     * Détecte les compétences du dictionnaire présentes dans le texte du CV.
     */
    public List<String> extractKeywordsFromText(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String norm = normalize(text);
        List<String> found = new ArrayList<>();
        for (KeywordEntry entry : dictionary) {
            if (containsAny(norm, entry.allForms())) {
                found.add(entry.term);
            }
        }
        found.sort(String.CASE_INSENSITIVE_ORDER);
        return found;
    }

    public MatchResult compute(
            String jobTitle,
            String description,
            String skills,
            String importantElements,
            String cvText
    ) {
        if (cvText == null || cvText.isBlank()) {
            return MatchResult.unreadableCv();
        }

        String normTitle = normalize(jobTitle);
        String normSkills = normalize(skills);
        String normImportant = normalize(importantElements);
        String normDescription = normalize(description);
        String normOffer = join(normTitle, normSkills, normImportant, normDescription);
        String normCv = normalize(cvText);

        if (normOffer.isBlank()) {
            return MatchResult.insufficient();
        }

        Map<String, Integer> offerKeywords = new LinkedHashMap<>();
        for (KeywordEntry entry : dictionary) {
            if (!containsAny(normOffer, entry.allForms())) {
                continue;
            }
            int weight = 1;
            if (containsAny(normTitle, entry.allForms()) || containsAny(normSkills, entry.allForms())) {
                weight = 2;
            }
            offerKeywords.merge(entry.term, weight, Math::max);
        }

        // Fallback : tokens significatifs de l'offre (annonces FR peu techniques)
        if (offerKeywords.size() < MIN_DICT_KEYWORDS_PREFERRED) {
            for (String token : significantTokens(normOffer)) {
                offerKeywords.putIfAbsent(token, 1);
            }
        }

        if (offerKeywords.isEmpty()) {
            return MatchResult.insufficient();
        }

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        int foundWeight = 0;
        int totalWeight = 0;

        for (Map.Entry<String, Integer> e : offerKeywords.entrySet()) {
            totalWeight += e.getValue();
            KeywordEntry entry = findEntry(e.getKey());
            boolean inCv = entry != null
                    ? containsAny(normCv, entry.allForms())
                    : containsToken(normCv, e.getKey());
            if (inCv) {
                matched.add(e.getKey());
                foundWeight += e.getValue();
            } else {
                missing.add(e.getKey());
            }
        }

        int score = totalWeight == 0 ? 0 : (int) Math.round(100.0 * foundWeight / totalWeight);
        MatchResult result = new MatchResult();
        result.setScore(Math.min(100, Math.max(0, score)));
        result.setMatchedKeywords(matched);
        result.setMissingKeywords(missing);
        return result;
    }

    public void applyToApplication(
            com.pfetracker.entity.Application application,
            MatchResult result
    ) {
        if (result.isInsufficient()) {
            application.setMatchScore(null);
            application.setMatchedKeywords(INSUFFICIENT_MARKER);
            application.setMissingKeywords("");
            return;
        }
        if (result.getScore() == null && result.getMessage() != null) {
            // Pas de CV / CV illisible : ne marque pas "insufficient"
            application.setMatchScore(null);
            application.setMatchedKeywords(null);
            application.setMissingKeywords(null);
            return;
        }
        if (result.getScore() == null) {
            application.setMatchScore(null);
            application.setMatchedKeywords(null);
            application.setMissingKeywords(null);
            return;
        }
        application.setMatchScore(result.getScore());
        application.setMatchedKeywords(String.join(", ", result.getMatchedKeywords()));
        application.setMissingKeywords(String.join(", ", result.getMissingKeywords()));
    }

    public static boolean isInsufficientStored(String matchedKeywords) {
        return INSUFFICIENT_MARKER.equals(matchedKeywords);
    }

    public static String normalize(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        String lower = input.toLowerCase(Locale.ROOT);
        String decomposed = Normalizer.normalize(lower, Normalizer.Form.NFD);
        String noAccents = decomposed.replaceAll("\\p{M}+", "");
        String cleaned = noAccents.replaceAll("[^a-z0-9+#\\.]+", " ");
        return cleaned.trim().replaceAll("\\s+", " ");
    }

    private List<String> significantTokens(String normalizedOffer) {
        if (normalizedOffer.isBlank()) {
            return List.of();
        }
        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        for (String raw : normalizedOffer.split("\\s+")) {
            String t = raw.trim();
            if (t.length() < 4 || STOPWORDS.contains(t)) {
                continue;
            }
            // Ignorer pures chiffres
            if (t.matches("\\d+")) {
                continue;
            }
            tokens.add(t);
        }
        return new ArrayList<>(tokens);
    }

    private boolean containsToken(String haystack, String token) {
        if (haystack.isBlank() || token == null || token.isBlank()) {
            return false;
        }
        String n = normalize(token);
        if (n.isBlank()) {
            return false;
        }
        String padded = " " + haystack + " ";
        if (padded.contains(" " + n + " ")) {
            return true;
        }
        return n.length() >= 4 && haystack.contains(n);
    }

    private boolean containsAny(String haystack, Set<String> needles) {
        if (haystack.isBlank()) {
            return false;
        }
        String padded = " " + haystack + " ";
        for (String needle : needles) {
            String n = normalize(needle);
            if (n.isBlank()) {
                continue;
            }
            if (padded.contains(" " + n + " ")) {
                return true;
            }
            // termes collés type springboot déjà dans synonymes ; fallback substring si long
            if (n.length() >= 4 && haystack.contains(n)) {
                return true;
            }
        }
        return false;
    }

    private KeywordEntry findEntry(String term) {
        return dictionary.stream().filter(k -> k.term.equals(term)).findFirst().orElse(null);
    }

    private String join(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                if (!sb.isEmpty()) {
                    sb.append(' ');
                }
                sb.append(part);
            }
        }
        return sb.toString();
    }

    public static class KeywordEntry {
        public String term;
        public List<String> synonyms = new ArrayList<>();

        Set<String> allForms() {
            Set<String> forms = new LinkedHashSet<>();
            if (term != null) {
                forms.add(term);
            }
            if (synonyms != null) {
                forms.addAll(synonyms);
            }
            return forms;
        }
    }
}
