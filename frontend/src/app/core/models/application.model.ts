export type ApplicationStatus =
  | 'EN_ATTENTE'
  | 'RELANCE_1'
  | 'RELANCE_2'
  | 'ENTRETIEN'
  | 'OFFRE'
  | 'REFUSEE'
  | 'RETIREE';

export type Priority = 'BASSE' | 'MOYENNE' | 'HAUTE';

export interface Application {
  id: number;
  company: string;
  jobTitle: string;
  jobUrl: string | null;
  reference: string | null;
  platform: string | null;
  location: string | null;
  description: string | null;
  importantElements: string | null;
  skills: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  applicationDate: string | null;
  status: ApplicationStatus;
  priority: Priority;
  hasScreenshot: boolean;
  followUp1Date: string | null;
  followUp1Done: boolean;
  followUp1DoneDate: string | null;
  followUp2Date: string | null;
  followUp2Done: boolean;
  followUp2DoneDate: string | null;
  notes: string | null;
  matchScore: number | null;
  matchedKeywords: string | null;
  missingKeywords: string | null;
  matchInsufficient: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Statistics {
  total: number;
  pendingFollowUps: number;
  averageMatchScore: number | null;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface MatchResult {
  score: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  insufficient: boolean;
  message: string | null;
}

export interface CvInfo {
  fileName: string;
  uploadedAt: string;
  textExtracted: boolean;
  warning: string | null;
  detectedSkills: string[];
}

export interface UserProfile {
  email?: string | null;
  skills: string | null;
  skillsList: string[];
  emailRemindersEnabled: boolean;
  mailConfigured: boolean;
}

export interface ApplicationRequest {
  company: string;
  jobTitle: string;
  jobUrl?: string | null;
  reference?: string | null;
  platform?: string | null;
  location?: string | null;
  description?: string | null;
  importantElements?: string | null;
  skills?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactLinkedin?: string | null;
  applicationDate?: string | null;
  status?: ApplicationStatus;
  priority?: Priority;
  followUp1Date?: string | null;
  followUp2Date?: string | null;
  notes?: string | null;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  EN_ATTENTE: 'En attente',
  RELANCE_1: 'Relance 1',
  RELANCE_2: 'Relance 2',
  ENTRETIEN: 'Entretien',
  OFFRE: 'Offre',
  REFUSEE: 'Refusée',
  RETIREE: 'Retirée'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  BASSE: 'Basse',
  MOYENNE: 'Moyenne',
  HAUTE: 'Haute'
};

export const ALL_STATUSES: ApplicationStatus[] = [
  'EN_ATTENTE',
  'RELANCE_1',
  'RELANCE_2',
  'ENTRETIEN',
  'OFFRE',
  'REFUSEE',
  'RETIREE'
];
