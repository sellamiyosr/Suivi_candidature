export type ApplicationStatus =
  | 'EN_ATTENTE'
  | 'RELANCE_1'
  | 'RELANCE_2'
  | 'ENTRETIEN'
  | 'OFFRE'
  | 'REFUSEE'
  | 'RETIREE';

export type Priority = 'BASSE' | 'MOYENNE' | 'HAUTE';

export type ContractType = 'STAGE' | 'ALTERNANCE' | 'CDI' | 'CDD' | 'FREELANCE' | 'AUTRE';

export type WorkMode = 'SUR_SITE' | 'HYBRIDE' | 'TELETRAVAIL';

export interface Application {
  id: number;
  company: string;
  jobTitle: string;
  jobUrl: string | null;
  reference: string | null;
  platform: string | null;
  location: string | null;
  contractType: ContractType | null;
  workMode: WorkMode | null;
  startDate: string | null;
  duration: string | null;
  domain: string | null;
  companyLogoUrl: string | null;
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
  contractType?: ContractType | null;
  workMode?: WorkMode | null;
  startDate?: string | null;
  duration?: string | null;
  domain?: string | null;
  companyLogoUrl?: string | null;
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

export const CONTRACT_LABELS: Record<ContractType, string> = {
  STAGE: 'Stage',
  ALTERNANCE: 'Alternance',
  CDI: 'CDI',
  CDD: 'CDD',
  FREELANCE: 'Freelance',
  AUTRE: 'Autre'
};

export const ALL_CONTRACTS: ContractType[] = ['STAGE', 'ALTERNANCE', 'CDI', 'CDD', 'FREELANCE', 'AUTRE'];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  SUR_SITE: 'Sur site',
  HYBRIDE: 'Hybride',
  TELETRAVAIL: 'Télétravail'
};

export const ALL_WORK_MODES: WorkMode[] = ['SUR_SITE', 'HYBRIDE', 'TELETRAVAIL'];

/* Options prêtes pour <app-select> */
export interface Option {
  value: string;
  label: string;
  dot?: string;
  color?: string;
}

export const STATUS_OPTIONS: Option[] = ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dot: s }));

export const CONTRACT_OPTIONS: Option[] = ALL_CONTRACTS.map((c) => ({ value: c, label: CONTRACT_LABELS[c] }));

export const WORK_MODE_OPTIONS: Option[] = ALL_WORK_MODES.map((w) => ({ value: w, label: WORK_MODE_LABELS[w] }));

export const PRIORITY_OPTIONS: Option[] = [
  { value: 'HAUTE', label: 'Haute', color: 'var(--c-red)' },
  { value: 'MOYENNE', label: 'Moyenne', color: 'var(--c-amber)' },
  { value: 'BASSE', label: 'Basse', color: 'var(--c-grey)' }
];
