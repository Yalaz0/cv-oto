export type CvEntry = {
  title: string;
  subtitle?: string;
  date?: string;
  location?: string;
  details: string[];
};

export type CvTemplateDocument = {
  locale: "tr-TR" | "en-US";
  basics: {
    name: string;
    title: string;
    email?: string;
    phone?: string;
    location?: string;
    url?: string;
    github?: string;
    linkedin?: string;
    image?: string;
  };
  summary?: string;
  education: CvEntry[];
  work: CvEntry[];
  skills: string[];
  languages: string[];
  projects: CvEntry[];
  references: CvEntry[];
  display?: {
    showLocation?: boolean;
    locationLabel?: "Şehir" | "Ülke" | "City" | "Country";
    locationValue?: string;
    showGithub?: boolean;
    showLinkedin?: boolean;
    showReferences?: boolean;
  };
};
