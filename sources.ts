import type { SourceCitation } from "./types";

export const HEALTH_SOURCES: SourceCitation[] = [
  {
    id: "who-womens-health",
    title: "Women's health",
    url: "https://www.who.int/health-topics/women-s-health",
    publisher: "World Health Organization",
    reviewedAt: "2026-10-31",
    excerpt: "Women's health spans physical and mental health across the life course. Women may experience diseases differently and have distinct care needs at different stages of life.",
  },
  {
    id: "nhs-womens-health",
    title: "Women's health",
    url: "https://www.nhs.uk/womens-health/",
    publisher: "NHS",
    reviewedAt: "2026-10-31",
    excerpt: "The NHS women's health hub covers periods, pregnancy, menopause, vagina and vulva health, womb and ovary health, pelvic health, mental health and heart health.",
  },
  {
    id: "cdc-reproductive-health",
    title: "Women's reproductive health",
    url: "https://www.cdc.gov/reproductive-health/women-health/index.html",
    publisher: "Centers for Disease Control and Prevention",
    reviewedAt: "2026-10-31",
    excerpt: "CDC reproductive-health information covers contraception, depression, infertility and health from menarche through menopause. A healthcare provider is a good first step for concerns such as depression.",
  },
  {
    id: "nhs-pelvic-pain",
    title: "Pelvic pain",
    url: "https://www.nhs.uk/symptoms/pelvic-pain/",
    publisher: "NHS",
    reviewedAt: "2026-10-31",
    excerpt: "Seek immediate emergency help for severe or worsening pelvic pain, fainting, difficulty breathing, heavy vaginal bleeding or sudden confusion. Seek urgent help for pelvic pain with pregnancy, fever, vomiting, unusual bleeding or discharge.",
  },
];

const topicTerms: Record<string, string[]> = {
  period: ["period", "menstrual", "bleed", "cycle", "cramp"],
  pregnancy: ["pregnan", "missed period", "pregnancy", "baby", "postpartum"],
  pelvic: ["pelvic", "lower tummy", "lower abdomen", "ovary", "vagina", "discharge"],
  menopause: ["menopause", "hot flush", "hot flash", "perimenopause"],
  mental: ["sad", "anxious", "panic", "depress", "self harm", "suicide"],
};

export function retrieveSources(query: string, limit = 3): SourceCitation[] {
  const normalized = query.toLowerCase();
  const scored = HEALTH_SOURCES.map((source) => {
    const terms = Object.values(topicTerms).flat();
    const score = terms.reduce((total, term) => total + (normalized.includes(term) && source.excerpt.toLowerCase().includes(term) ? 2 : 0), 0);
    return { source, score };
  }).sort((a, b) => b.score - a.score);

  const selected = scored.filter(({ score }) => score > 0).slice(0, limit).map(({ source }) => source);
  return selected.length ? selected : HEALTH_SOURCES.slice(0, limit);
}
