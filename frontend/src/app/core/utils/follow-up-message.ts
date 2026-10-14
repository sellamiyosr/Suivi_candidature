/**
 * Génère un message de relance simple (template V1).
 * Isolé pour pouvoir brancher une IA plus tard sans toucher aux composants.
 */
export function generateFollowUpMessage(
  jobTitle: string,
  company: string,
  fullName: string
): string {
  const name = fullName.trim() || '[Votre nom]';
  return (
    `Bonjour,\n\n` +
    `Je me permets de revenir vers vous concernant ma candidature au poste de ${jobTitle} chez ${company}.\n\n` +
    `Je reste bien entendu disponible pour tout complément d'information.\n\n` +
    `Cordialement,\n` +
    `${name}`
  );
}

/** Prochaine relance à marquer (1 ou 2), ou null si les deux sont faites. */
export function nextFollowUpNumber(app: {
  followUp1Done: boolean;
  followUp2Done: boolean;
}): 1 | 2 | null {
  if (!app.followUp1Done) {
    return 1;
  }
  if (!app.followUp2Done) {
    return 2;
  }
  return null;
}

/** Libellé pour une relance due (aujourd'hui ou en retard). */
export function followUpDueLabel(app: {
  followUp1Done: boolean;
  followUp1Date: string | null;
  followUp2Date: string | null;
}): string {
  if (!app.followUp1Done) {
    return 'Relance 1 à faire';
  }
  return 'Relance 2 à faire';
}
