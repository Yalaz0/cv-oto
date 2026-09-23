import type { CvTemplateDocument } from "@/modules/template/types";
import { Entries, Header, SectionHeading, Skills } from "./reference-parts";

const labels = {
  "tr-TR": {
    education: "Eğitim",
    experience: "Deneyim",
    skills: "Yetkinlikler",
    languages: "Diller",
    projects: "Projeler",
    references: "Referanslar",
    summary: "Profesyonel Özet",
  },
  "en-US": {
    education: "Education",
    experience: "Experience",
    skills: "Skills",
    languages: "Languages",
    projects: "Projects",
    references: "References",
    summary: "Professional Summary",
  },
};

export function CvTemplate({ document }: { document: CvTemplateDocument }) {
  const copy = labels[document.locale];
  const display = document.display ?? {};
  return (
    <div data-template="mehmet-yalaz-v1">
      <article className="cv-document cv-fixed-page">
        <Header basics={document.basics} display={display} />
        <main>
          <section>
            {document.summary && (
              <>
                <SectionHeading>{copy.summary}</SectionHeading>
                <p className="cv-summary">{document.summary}</p>
              </>
            )}
          </section>
          <section>
            {document.work.length > 0 && (
              <>
                <SectionHeading>{copy.experience}</SectionHeading>
                <Entries entries={document.work} />
              </>
            )}
          </section>
          <section>
            {document.education.length > 0 && (
              <>
                <SectionHeading>{copy.education}</SectionHeading>
                <Entries entries={document.education} />
              </>
            )}
          </section>
        </main>
      </article>
      <article className="cv-document cv-fixed-page">
        <main>
          <section>
            {document.projects.length > 0 && (
              <>
                <SectionHeading>{copy.projects}</SectionHeading>
                <Entries entries={document.projects} />
              </>
            )}
          </section>
          <section>
            {document.skills.length + document.languages.length > 0 && (
              <>
                <SectionHeading>{copy.skills}</SectionHeading>
                <Skills
                  skills={document.skills}
                  languages={document.languages}
                />
              </>
            )}
          </section>
          {display.showReferences !== false &&
            document.references.length > 0 && (
              <section>
                <SectionHeading>{copy.references}</SectionHeading>
                <Entries entries={document.references} />
              </section>
            )}
        </main>
      </article>
    </div>
  );
}
