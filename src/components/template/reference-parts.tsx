import type { CvEntry, CvTemplateDocument } from "@/modules/template/types";

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="cv-section-heading">{children}</h2>;
}

export function Entries({ entries }: { entries: CvEntry[] }) {
  return entries.map((entry, index) => (
    <article
      className="cv-entry"
      key={`${entry.title}-${entry.date}-${index.toString()}`}
    >
      <div className="cv-entry-heading">
        <strong>{entry.title}</strong>
        {entry.date && <span>{entry.date}</span>}
      </div>
      {entry.subtitle && <p className="cv-subtitle">{entry.subtitle}</p>}
      {entry.location && <p className="cv-entry-location">{entry.location}</p>}
      {entry.details.length > 0 && (
        <div className="cv-entry-details">
          {entry.details.map((detail, detailIndex) => (
            <p key={`${detail}-${detailIndex.toString()}`}>{detail}</p>
          ))}
        </div>
      )}
    </article>
  ));
}

export function Header({
  basics,
  display,
}: Pick<CvTemplateDocument, "basics" | "display">) {
  const location = display?.locationValue ?? basics.location;
  const rows = [
    location &&
      display?.showLocation !== false &&
      `${display?.locationLabel ?? "Adres"}: ${location}`,
    basics.phone && `Telefon: ${basics.phone}`,
    basics.email && `E-mail: ${basics.email}`,
    display?.showGithub !== false &&
      basics.github &&
      `GitHub: ${basics.github}`,
    display?.showLinkedin !== false &&
      basics.linkedin &&
      `Linkedin: ${basics.linkedin}`,
    basics.url,
  ].filter((row): row is string => typeof row === "string" && row.length > 0);
  return (
    <header className="cv-header">
      <div className="cv-header-identity">
        {basics.image && (
          // biome-ignore lint/performance/noImgElement: The same authenticated image URL must render in preview and Chromium print.
          <img alt="" className="cv-photo" src={basics.image} />
        )}
        <div>
          <h1>{basics.name}</h1>
          {basics.title && <p>{basics.title}</p>}
        </div>
      </div>
      <address className="cv-contact">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </address>
    </header>
  );
}

export function Skills({
  skills,
  languages,
}: Pick<CvTemplateDocument, "skills" | "languages">) {
  return (
    <>
      {skills.length > 0 && (
        <div className="cv-plain-list">
          {skills.map((skill) => (
            <p key={skill}>{skill}</p>
          ))}
        </div>
      )}
      {languages.length > 0 && (
        <div className="cv-plain-list">
          {languages.map((language) => (
            <p key={language}>{language}</p>
          ))}
        </div>
      )}
    </>
  );
}
