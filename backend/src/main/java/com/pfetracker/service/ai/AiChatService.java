package com.pfetracker.service.ai;

import com.pfetracker.entity.Application;
import com.pfetracker.entity.ApplicationStatus;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.ApplicationRepository;
import com.pfetracker.repository.UserCvRepository;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import com.pfetracker.service.ai.AiClient.Turn;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chatbot "Assistant" : répond aux questions de l'utilisateur sur ses candidatures.
 * Accès en lecture seule : un résumé compact du compte est injecté dans le contexte à chaque question,
 * plus le détail des offres citées par leur nom d'entreprise.
 */
@Service
public class AiChatService {

    private static final int MAX_TURNS = 16;
    private static final int MAX_TURN_CHARS = 4000;
    private static final int MAX_APPS_IN_CONTEXT = 150;
    private static final int MAX_DETAILED_APPS = 2;
    private static final int MAX_DETAIL_CHARS = 2500;
    private static final int MAX_CV_CHARS = 2500;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AiClient aiClient;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final UserCvRepository userCvRepository;

    public AiChatService(
            AiClient aiClient,
            UserRepository userRepository,
            ApplicationRepository applicationRepository,
            UserCvRepository userCvRepository
    ) {
        this.aiClient = aiClient;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.userCvRepository = userCvRepository;
    }

    @Transactional(readOnly = true)
    public String reply(List<Turn> history) {
        List<Turn> turns = sanitize(history);
        User user = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        List<Application> apps = applicationRepository.findByUserIdOrderByApplicationDateDescCreatedAtDesc(user.getId());

        String question = turns.get(turns.size() - 1).content();
        String system = SYSTEM_PROMPT
                + "\n\n" + accountContext(user, apps)
                + detailsForMentionedCompanies(apps, question);

        return aiClient.chat(user, system, turns);
    }

    private static final String SYSTEM_PROMPT = """
            Tu es « l'Assistant » de PFE Tracker, une application où un étudiant suit ses candidatures
            (stage, PFE, alternance, emploi). Tu as accès en LECTURE aux données de son compte, fournies plus bas.

            Ce que tu fais :
            - Répondre aux questions sur ses candidatures, relances, statistiques et offres, à partir des données.
            - Donner des conseils concrets de recherche de stage, de relance, de préparation d'entretien, de CV.
            - Aider à rédiger un message, une lettre, une réponse à un recruteur.

            Règles :
            - Réponds dans la langue de l'utilisateur (français par défaut ; s'il écrit en tunisien/derja, réponds en
              français simple ou en derja selon son style).
            - Base-toi UNIQUEMENT sur les données fournies pour tout ce qui concerne son compte. Si une info manque,
              dis-le simplement. N'invente jamais de candidature, de date, de chiffre ou d'expérience.
            - Tu ne peux rien modifier dans l'application : si on te demande de changer un statut, d'ajouter ou de supprimer
              une candidature, explique en une phrase où le faire dans l'interface.
            - Quand tu cites une candidature, mets un lien Markdown vers sa page : [Entreprise — Poste](#/applications/ID).
            - Réponses courtes et structurées : quelques phrases ou des puces « - ». Utilise **gras** avec parcimonie.
            """;

    /* ------------------------------------------------------------ Contexte du compte */

    private String accountContext(User user, List<Application> apps) {
        LocalDate today = LocalDate.now();
        StringBuilder sb = new StringBuilder("=== DONNÉES DU COMPTE ===\n");
        sb.append("Date du jour : ")
                .append(today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.FRENCH)).append(' ')
                .append(today.format(DATE)).append('\n');
        if (user.getSkills() != null && !user.getSkills().isBlank()) {
            sb.append("Compétences du profil : ").append(user.getSkills()).append('\n');
        }
        userCvRepository.findByUserId(user.getId())
                .map(cv -> cv.getExtractedText())
                .filter(t -> t != null && !t.isBlank())
                .ifPresentOrElse(
                        cv -> sb.append("Extrait du CV :\n").append(truncate(cv.trim(), MAX_CV_CHARS)).append('\n'),
                        () -> sb.append("CV : aucun CV enregistré.\n")
                );

        // Statistiques
        Map<ApplicationStatus, Integer> byStatus = new EnumMap<>(ApplicationStatus.class);
        int answered = 0;
        int scoreSum = 0;
        int scoreCount = 0;
        List<Application> dueFollowUps = new ArrayList<>();
        for (Application a : apps) {
            byStatus.merge(a.getStatus(), 1, Integer::sum);
            if (a.getStatus() == ApplicationStatus.ENTRETIEN
                    || a.getStatus() == ApplicationStatus.OFFRE
                    || a.getStatus() == ApplicationStatus.REFUSEE) {
                answered++;
            }
            if (a.getMatchScore() != null) {
                scoreSum += a.getMatchScore();
                scoreCount++;
            }
            LocalDate next = nextFollowUpDate(a);
            if (next != null && !next.isAfter(today)) {
                dueFollowUps.add(a);
            }
        }
        sb.append("\nStatistiques : ").append(apps.size()).append(" candidature(s)");
        byStatus.forEach((status, n) -> sb.append(", ").append(n).append(' ').append(statusLabel(status)));
        if (!apps.isEmpty()) {
            sb.append(". Taux de réponse : ").append(Math.round(answered * 100.0 / apps.size())).append('%');
        }
        if (scoreCount > 0) {
            sb.append(". Compatibilité moyenne : ").append(Math.round((double) scoreSum / scoreCount)).append('%');
        }
        sb.append(".\n");

        sb.append("Relances à faire aujourd'hui ou en retard : ");
        if (dueFollowUps.isEmpty()) {
            sb.append("aucune.\n");
        } else {
            sb.append('\n');
            for (Application a : dueFollowUps) {
                sb.append("- #").append(a.getId()).append(' ').append(a.getCompany())
                        .append(" — ").append(a.getJobTitle())
                        .append(" (prévue le ").append(nextFollowUpDate(a).format(DATE)).append(")\n");
            }
        }

        // Liste compacte
        sb.append("\nCandidatures (id | entreprise | poste | statut | date | contrat | mode | lieu | compatibilité | prochaine relance | plateforme | email recruteur) :\n");
        int shown = 0;
        for (Application a : apps) {
            if (shown++ >= MAX_APPS_IN_CONTEXT) {
                sb.append("… (").append(apps.size() - MAX_APPS_IN_CONTEXT).append(" candidatures plus anciennes non listées)\n");
                break;
            }
            LocalDate next = nextFollowUpDate(a);
            sb.append('#').append(a.getId())
                    .append(" | ").append(a.getCompany())
                    .append(" | ").append(a.getJobTitle())
                    .append(" | ").append(statusLabel(a.getStatus()))
                    .append(" | ").append(a.getApplicationDate() == null ? "—" : a.getApplicationDate().format(DATE))
                    .append(" | ").append(a.getContractType() == null ? "—" : a.getContractType().name())
                    .append(" | ").append(a.getWorkMode() == null ? "—" : a.getWorkMode().name())
                    .append(" | ").append(orDash(a.getLocation()))
                    .append(" | ").append(a.getMatchScore() == null ? "—" : a.getMatchScore() + "%")
                    .append(" | ").append(next == null ? (a.isFollowUp2Done() ? "relances faites" : "—") : next.format(DATE))
                    .append(" | ").append(orDash(a.getPlatform()))
                    .append(" | ").append(a.getContactEmail() == null ? "non" : "oui")
                    .append('\n');
        }
        if (apps.isEmpty()) {
            sb.append("(aucune candidature pour l'instant)\n");
        }
        return sb.toString();
    }

    /** Ajoute le détail des offres dont l'entreprise est citée dans la question. */
    private String detailsForMentionedCompanies(List<Application> apps, String question) {
        String q = normalize(question);
        StringBuilder sb = new StringBuilder();
        int added = 0;
        for (Application a : apps) {
            if (added >= MAX_DETAILED_APPS) break;
            String company = normalize(a.getCompany());
            if (company.length() >= 3 && q.contains(company)) {
                sb.append("\n=== DÉTAIL #").append(a.getId()).append(" — ").append(a.getCompany()).append(" ===\n");
                appendField(sb, "Poste", a.getJobTitle());
                appendField(sb, "Domaine", a.getDomain());
                appendField(sb, "Début / durée", join(a.getStartDate(), a.getDuration()));
                appendField(sb, "Compétences demandées", a.getSkills());
                appendField(sb, "Mots-clés manquants vs CV", a.getMissingKeywords());
                appendField(sb, "Contact", a.getContactName());
                appendField(sb, "Notes perso", a.getNotes());
                appendField(sb, "Points clés", a.getImportantElements());
                if (a.getDescription() != null && !a.getDescription().isBlank()) {
                    sb.append("Description : ").append(truncate(a.getDescription().trim(), MAX_DETAIL_CHARS)).append('\n');
                }
                added++;
            }
        }
        return sb.toString();
    }

    /* ------------------------------------------------------------ Outils */

    private static List<Turn> sanitize(List<Turn> history) {
        if (history == null || history.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Message vide.");
        }
        List<Turn> clean = new ArrayList<>();
        for (Turn t : history) {
            if (t == null || t.content() == null || t.content().isBlank()) continue;
            String role = "assistant".equals(t.role()) ? "assistant" : "user";
            // Fusionne deux tours consécutifs du même rôle (les API exigent l'alternance)
            if (!clean.isEmpty() && clean.get(clean.size() - 1).role().equals(role)) {
                Turn prev = clean.remove(clean.size() - 1);
                clean.add(new Turn(role, prev.content() + "\n\n" + t.content()));
            } else {
                clean.add(new Turn(role, truncate(t.content().trim(), MAX_TURN_CHARS)));
            }
        }
        // Garde les derniers échanges, en commençant par un message utilisateur
        if (clean.size() > MAX_TURNS) {
            clean = new ArrayList<>(clean.subList(clean.size() - MAX_TURNS, clean.size()));
        }
        while (!clean.isEmpty() && !"user".equals(clean.get(0).role())) {
            clean.remove(0);
        }
        if (clean.isEmpty() || !"user".equals(clean.get(clean.size() - 1).role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Le dernier message doit venir de l'utilisateur.");
        }
        return clean;
    }

    private static LocalDate nextFollowUpDate(Application a) {
        if (!a.isFollowUp1Done()) return a.getFollowUp1Date();
        if (!a.isFollowUp2Done()) return a.getFollowUp2Date();
        return null;
    }

    private static String statusLabel(ApplicationStatus s) {
        if (s == null) return "—";
        return switch (s) {
            case EN_ATTENTE -> "en attente";
            case RELANCE_1 -> "relance 1";
            case RELANCE_2 -> "relance 2";
            case ENTRETIEN -> "entretien";
            case OFFRE -> "offre reçue";
            case REFUSEE -> "refusée";
            case RETIREE -> "retirée";
        };
    }

    private static String normalize(String s) {
        if (s == null) return "";
        return java.text.Normalizer.normalize(s.toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim();
    }

    private static void appendField(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append(label).append(" : ").append(truncate(value.trim(), 600)).append('\n');
        }
    }

    private static String join(String a, String b) {
        String r = ((a == null ? "" : a.trim()) + " " + (b == null ? "" : b.trim())).trim();
        return r.isEmpty() ? null : r;
    }

    private static String orDash(String s) {
        return s == null || s.isBlank() ? "—" : s.trim();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + " […]";
    }
}
