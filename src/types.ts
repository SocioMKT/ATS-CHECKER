export interface ImpactLogro {
  original: string;
  sugerencia: string;
  explicacion: string;
}

export interface ParsedExperience {
  companyAndRole: string;
  bullets: string[];
}

export interface EvaluationResult {
  pasaFiltro: boolean;
  puntuacion: number;
  palabrasClaveFaltantes: string[];
  impactoYLogros: ImpactLogro[];
  alertasRojas: string[];
  textoRespuestaObligatoria: string;
  parsedName?: string;
  parsedTitle?: string;
  parsedContactInfo?: string;
  parsedSummary?: string;
  parsedExperiences?: ParsedExperience[];
  parsedSkills?: string[];
  extractedCvText?: string;
}

export interface BulletImprovement {
  version: string;
  explicacion: string;
}

export interface ImproveBulletResponse {
  mejoras: BulletImprovement[];
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  jobTitle: string;
  jobDescription: string;
  cvSnippet: string;
  result: EvaluationResult;
}
