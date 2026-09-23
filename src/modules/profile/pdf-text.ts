// Conservative, offline extraction. Unrecognized text remains available for manual review.
export function parseResumeText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headings: Record<string, string> = {
    deneyim: "work",
    "iş deneyimi": "work",
    experience: "work",
    "work experience": "work",
    eğitim: "education",
    education: "education",
    projeler: "projects",
    projects: "projects",
    yetkinlikler: "skills",
    beceriler: "skills",
    skills: "skills",
    diller: "languages",
    languages: "languages",
    "profesyonel özet": "summary",
    summary: "summary",
    "professional summary": "summary",
  };
  const sections: Record<string, string[]> = {
    basics: [],
    work: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    summary: [],
  };
  let section = "basics";
  for (const line of lines) {
    const heading =
      headings[line.toLocaleLowerCase("tr-TR").replace(/:$/, " ").trim()];
    if (heading) section = heading;
    else sections[section].push(line);
  }
  const header = sections.basics.join("\n");
  const entries = (key: string) =>
    sections[key].length
      ? [{ name: sections[key][0], details: sections[key].slice(1).join("\n") }]
      : [];
  return {
    basics: {
      name: sections.basics[0] ?? "",
      email: header.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "",
      phone:
        header.match(
          /(?:\+\d{1,3}[ ()-]*)?\(?\d{3}\)?[ -]*\d{3}[ -]*\d{2}[ -]*\d{2}/,
        )?.[0] ?? "",
      summary: sections.summary.join("\n"),
    },
    work: entries("work"),
    education: entries("education"),
    projects: entries("projects"),
    skills: sections.skills.map((name) => ({ name })),
    languages: sections.languages.map((language) => ({ language })),
  };
}
