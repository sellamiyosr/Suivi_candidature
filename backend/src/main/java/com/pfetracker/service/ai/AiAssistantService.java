package com.pfetracker.service.ai;

import com.pfetracker.entity.Application;
import com.pfetracker.entity.User;
import com.pfetracker.exception.ApiException;
import com.pfetracker.repository.ApplicationRepository;
import com.pfetracker.repository.UserCvRepository;
import com.pfetracker.repository.UserRepository;
import com.pfetracker.security.SecurityUtils;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Fonctions IA : message de relance personnalisé et analyse d'une offre. */
@Service
public class AiAssistantService {

    private static final int MAX_OFFER_CHARS = 6000;
    private static final int MAX_CV_CHARS = 5000;

    private final AiClient aiClient;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final UserCvRepository userCvRepository;

    public AiAssistantService(
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

    /* ------------------------------------------------------------ Relance */

    @Transactional(readOnly = true)
    public Map<String, String> generateFollowUp(Long applicationId) {
        User user = currentUser();
        Application app = ownedApplication(applicationId, user);

        if (app.isFollowUp1Done() && app.isFollowUp2Done()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Les deux relances sont déjà faites pour cette candidature : inutile d'en envoyer une troisième."
            );
        }
        int number = !app.isFollowUp1Done() ? 1 : 2;
        long days = app.getApplicationDate() == null
                ? -1
                : ChronoUnit.DAYS.between(app.getApplicationDate(), LocalDate.now());

        String system = """
                Tu rédiges des e-mails de relance de candidature (stage / PFE / alternance / emploi) pour un candidat.
                Style : français professionnel, chaleureux, concis (110 à 160 mots), sans flatterie excessive ni formule creuse.

                Règle absolue : utilise UNIQUEMENT les informations du poste et de l'offre fournies.
                - Montre que le candidat a lu l'offre : cite 1 ou 2 éléments concrets de l'offre (mission, projet, technologie, équipe).
                - N'invente RIEN sur le candidat : ni diplôme, ni stage, ni projet, ni expérience, ni compétence, ni langue.
                  Exprime seulement son intérêt et sa motivation pour CE poste.
                - N'invente aucun nom, date ou chiffre absent des données.
                Format de réponse OBLIGATOIRE, sans rien d'autre :
                OBJET: <objet de l'e-mail>
                ---
                <corps de l'e-mail, avec formule d'appel et signature "[Ton prénom]">
                """;

        StringBuilder prompt = new StringBuilder();
        prompt.append("Rédige la relance n°").append(number).append(" pour cette candidature.\n\n");
        prompt.append("Informations sur le poste :\n");
        appendLine(prompt, "Entreprise", app.getCompany());
        appendLine(prompt, "Poste", app.getJobTitle());
        appendLine(prompt, "Référence de l'offre", app.getReference());
        appendLine(prompt, "Domaine", app.getDomain());
        appendLine(prompt, "Plateforme", app.getPlatform());
        appendLine(prompt, "Lieu", app.getLocation());
        appendLine(prompt, "Type de contrat", app.getContractType() == null ? null : app.getContractType().name());
        appendLine(prompt, "Mode de travail", app.getWorkMode() == null ? null : app.getWorkMode().name());
        appendLine(prompt, "Début / durée", join(app.getStartDate(), app.getDuration()));
        appendLine(prompt, "Compétences demandées", app.getSkills());
        appendLine(prompt, "Contact (destinataire)", app.getContactName());
        if (days >= 0) {
            prompt.append("- Candidature envoyée il y a ").append(days).append(" jours\n");
        }
        if (app.getImportantElements() != null && !app.getImportantElements().isBlank()) {
            prompt.append("\nPoints clés de l'offre :\n").append(truncate(app.getImportantElements().trim(), 1500)).append("\n");
        }
        if (app.getDescription() != null && !app.getDescription().isBlank()) {
            prompt.append("\n<offre>\n").append(truncate(app.getDescription().trim(), 3500)).append("\n</offre>\n");
        }
        if (number == 2) {
            prompt.append("\nC'est la deuxième et dernière relance : reste courtois, rappelle brièvement la première relance.\n");
        }

        String raw = aiClient.complete(user, system, prompt.toString());
        return parseEmail(raw, app);
    }

    /* ------------------------------------------------------------ Analyse */

    @Transactional(readOnly = true)
    public Map<String, String> analyzeOffer(Long applicationId) {
        User user = currentUser();
        Application app = ownedApplication(applicationId, user);

        String offer = firstNonBlank(app.getDescription(), app.getImportantElements());
        if (offer == null || offer.length() < 80) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Description de l'offre trop courte : colle le texte de l'offre dans la candidature pour l'analyser."
            );
        }

        String cv = userCvRepository.findByUserId(user.getId())
                .map(c -> c.getExtractedText())
                .filter(t -> t != null && !t.isBlank())
                .orElse(null);

        String system = """
                Tu es un conseiller carrière qui aide un étudiant ingénieur à évaluer une offre et à y postuler.
                Réponds en français, de façon concrète et honnête, en t'appuyant uniquement sur les informations fournies.
                Structure ta réponse EXACTEMENT avec ces titres Markdown, et des puces courtes ("- ") sous chacun :
                ## En bref
                ## Ce qui correspond à ton profil
                ## Ce qui te manque
                ## Conseils pour ta candidature
                ## Points de vigilance
                Maximum 4 puces par section. Si une section ne s'applique pas, écris "- Rien à signaler".
                """;

        StringBuilder prompt = new StringBuilder("Analyse cette offre pour moi.\n\n");
        appendLine(prompt, "Entreprise", app.getCompany());
        appendLine(prompt, "Poste", app.getJobTitle());
        appendLine(prompt, "Lieu", app.getLocation());
        appendLine(prompt, "Contrat", app.getContractType() == null ? null : app.getContractType().name());
        appendLine(prompt, "Mode de travail", app.getWorkMode() == null ? null : app.getWorkMode().name());
        appendLine(prompt, "Début / durée", join(app.getStartDate(), app.getDuration()));
        appendLine(prompt, "Compétences demandées", app.getSkills());
        if (app.getMatchScore() != null) {
            prompt.append("- Score de correspondance par mots-clés : ").append(app.getMatchScore()).append("%\n");
        }
        prompt.append("\n<offre>\n").append(truncate(offer, MAX_OFFER_CHARS)).append("\n</offre>\n");
        if (cv != null) {
            prompt.append("\n<mon_cv>\n").append(truncate(cv, MAX_CV_CHARS)).append("\n</mon_cv>\n");
        } else if (user.getSkills() != null) {
            prompt.append("\nMes compétences (pas de CV fourni) : ").append(user.getSkills()).append("\n");
        } else {
            prompt.append("\nJe n'ai pas fourni de CV : analyse surtout l'offre elle-même.\n");
        }

        String analysis = aiClient.complete(user, system, prompt.toString());
        return Map.of("analysis", analysis, "usedCv", String.valueOf(cv != null));
    }

    /* ------------------------------------------------------------ Outils */

    /** Découpe "OBJET: ... --- corps" ; tolère les petites variations des modèles locaux. */
    static Map<String, String> parseEmail(String raw, Application app) {
        String text = raw.replace("\r", "").trim();
        String subject = null;
        String body = text;

        String[] lines = text.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim().replace("*", "");
            if (line.toLowerCase().startsWith("objet") || line.toLowerCase().startsWith("subject")) {
                int colon = line.indexOf(':');
                subject = colon >= 0 ? line.substring(colon + 1).trim() : null;
                StringBuilder rest = new StringBuilder();
                for (int j = i + 1; j < lines.length; j++) {
                    if (rest.length() == 0 && (lines[j].trim().isEmpty() || lines[j].trim().matches("-{3,}"))) {
                        continue;
                    }
                    rest.append(lines[j]).append("\n");
                }
                body = rest.toString().trim();
                break;
            }
        }
        if (subject == null || subject.isBlank()) {
            subject = "Suivi de ma candidature — " + app.getJobTitle();
        }
        Map<String, String> result = new LinkedHashMap<>();
        result.put("subject", subject);
        result.put("body", body);
        result.put("to", app.getContactEmail() == null ? "" : app.getContactEmail());
        return result;
    }

    private static void appendLine(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append("- ").append(label).append(" : ").append(value.trim()).append("\n");
        }
    }

    private static String join(String a, String b) {
        String r = ((a == null ? "" : a.trim()) + " " + (b == null ? "" : b.trim())).trim();
        return r.isEmpty() ? null : r;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "\n[…]";
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Application ownedApplication(Long id, User user) {
        return applicationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Application not found"));
    }
}
