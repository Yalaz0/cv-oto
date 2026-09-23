import type { CvEntry, CvTemplateDocument } from "@/modules/template/types";

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

function Entry({ entry }: { entry: CvEntry }) {
  return (
    <article className="cv-entry">
      <div className="cv-entry-heading">
        <div>
          <h3>{entry.title}</h3>
          {entry.subtitle && <p className="cv-subtitle">{entry.subtitle}</p>}
        </div>
        <div className="cv-entry-meta">
          {entry.date && <p>{entry.date}</p>}
          {entry.location && <p>{entry.location}</p>}
        </div>
      </div>
      {entry.details.length > 0 && (
        <ul>
          {entry.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cv-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function CvTemplate({ document }: { document: CvTemplateDocument }) {
  const copy = labels[document.locale];
  return (
    <article className="cv-document" data-template="mehmet-yalaz-v1">
      <header className="cv-header">
        {document.basics.image && (
          // biome-ignore lint/performance/noImgElement: Print template needs an unoptimized same-origin image.
          <img alt="" className="cv-photo" src={document.basics.image} />
        )}
        <div className="cv-identity">
          <h1>{document.basics.name}</h1>
          <p>{document.basics.title}</p>
        </div>
        <address className="cv-contact">
          {[
            document.basics.email,
            document.basics.phone,
            document.basics.location,
            document.basics.url,
          ]
            .filter(Boolean)
            .map((item) => (
              <span key={item}>{item}</span>
            ))}
        </address>
      </header>
      <main className="cv-content">
        <div className="cv-primary">
          {document.summary && (
            <Section title={copy.summary}>
              <p className="cv-summary">{document.summary}</p>
            </Section>
          )}
          {document.education.length > 0 && (
            <Section title={copy.education}>
              {document.education.map((entry) => (
                <Entry entry={entry} key={`${entry.title}-${entry.date}`} />
              ))}
            </Section>
          )}
          {document.work.length > 0 && (
            <Section title={copy.experience}>
              {document.work.map((entry) => (
                <Entry entry={entry} key={`${entry.title}-${entry.date}`} />
              ))}
            </Section>
          )}
          {document.projects.length > 0 && (
            <Section title={copy.projects}>
              {document.projects.map((entry) => (
                <Entry entry={entry} key={`${entry.title}-${entry.date}`} />
              ))}
            </Section>
          )}
        </div>
        <aside className="cv-sidebar">
          {document.skills.length > 0 && (
            <Section title={copy.skills}>
              <ul className="cv-tags">
                {document.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </Section>
          )}
          {document.languages.length > 0 && (
            <Section title={copy.languages}>
              <ul className="cv-simple-list">
                {document.languages.map((language) => (
                  <li key={language}>{language}</li>
                ))}
              </ul>
            </Section>
          )}
          {document.references.length > 0 && (
            <Section title={copy.references}>
              {document.references.map((entry) => (
                <Entry entry={entry} key={entry.title} />
              ))}
            </Section>
          )}
        </aside>
      </main>
    </article>
  );
}
