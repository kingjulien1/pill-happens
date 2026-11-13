import type { MedicationCategory } from "./medication-categories";

const mentalHealth = {
  title: "Mental health medications · NIMH",
  href: "https://www.nimh.nih.gov/health/topics/mental-health-medications",
};
const painRelief = {
  title: "Pain relievers · MedlinePlus",
  href: "https://medlineplus.gov/painrelievers.html",
};

/** Editorial primers, not descriptions inferred from a user's medication names.
 * Sources reviewed 2026-11-12. Product-specific details belong to its own label. */
export const MEDICATION_CATEGORY_NOTES: Record<
  MedicationCategory,
  {
    overview: string;
    source?: { title: string; href: string };
  }
> = {
  benzodiazepine: {
    overview:
      "Benzodiazepines are one family of anti-anxiety medicines. A family name describes a group; the individual product and ingredient identify the medication itself.",
    source: mentalHealth,
  },
  opioid: {
    overview:
      "Opioids include prescription pain medicines such as morphine and oxycodone. Pain Relief is a broader label, so a saved medication may appear in both groups.",
    source: painRelief,
  },
  antidepressant: {
    overview:
      "Antidepressants include several medication families. They are used for depression and may also be prescribed for other conditions, so a category alone does not describe someone's diagnosis.",
    source: mentalHealth,
  },
  antipsychotic: {
    overview:
      "Antipsychotic medicines are used for psychosis and some other mental health conditions. This group includes both older and newer medication families.",
    source: mentalHealth,
  },
  "sleep-aid": {
    overview:
      "Sleep aids span different medicines, including prescription hypnotics and some antihistamine products. This purpose-based label can overlap other categories in your library.",
    source: {
      title: "Medicines for sleep · MedlinePlus",
      href: "https://medlineplus.gov/ency/patientinstructions/000758.htm",
    },
  },
  stimulant: {
    overview:
      "Prescription stimulants can increase alertness and attention. They may be prescribed for conditions including ADHD and narcolepsy; the ingredient distinguishes the individual medicine.",
    source: mentalHealth,
  },
  "mood-stabilizer": {
    overview:
      "Mood stabilizers are commonly used for bipolar disorder and some other mood conditions. Lithium and some anticonvulsant medicines belong within this broad treatment grouping.",
    source: mentalHealth,
  },
  "pain-relief": {
    overview:
      "Pain relievers include several kinds of medicine, such as acetaminophen, anti-inflammatory medicines and opioids. The category groups a purpose, while ingredients and strengths remain distinct.",
    source: painRelief,
  },
  "anti-inflammatory": {
    overview:
      "Nonsteroidal anti-inflammatory drugs, or NSAIDs, are one family used for pain and inflammation. This category can overlap Pain Relief without making the two labels identical.",
    source: painRelief,
  },
  allergy: {
    overview:
      "Allergy care includes different medicines and treatments. This is a broad purpose-based category in your library, so its saved products may use different ingredients and forms.",
    source: {
      title: "Allergy · MedlinePlus",
      href: "https://medlineplus.gov/allergy.html",
    },
  },
  digestive: {
    overview:
      "Stomach & Digestion is a broad journal grouping for the products you choose to file here. Individual ingredients and forms keep those different products identifiable.",
    source: {
      title: "Digestive diseases · MedlinePlus",
      href: "https://medlineplus.gov/digestivediseases.html",
    },
  },
  thyroid: {
    overview:
      "Thyroid conditions can involve too much or too little thyroid hormone, and their treatments differ. Your ingredient label helps distinguish the medication within this broad category.",
    source: {
      title: "Thyroid diseases · MedlinePlus",
      href: "https://medlineplus.gov/thyroiddiseases.html",
    },
  },
  hormone: {
    overview:
      "Hormones are chemical messengers involved in many body processes. This broad journal label gathers the hormone medications you select, while preserving their individual ingredients and preparations.",
    source: {
      title: "Hormones · MedlinePlus",
      href: "https://medlineplus.gov/hormones.html",
    },
  },
  cardiovascular: {
    overview:
      "Blood pressure medicines work in several different ways. Heart & Blood Pressure is a broader journal label, keeping each saved product and its recorded amounts separate.",
    source: {
      title: "Blood pressure medicines · MedlinePlus",
      href: "https://medlineplus.gov/bloodpressuremedicines.html",
    },
  },
  antibiotic: {
    overview:
      "Antibiotics target bacterial infections and come in different forms and routes. The saved ingredient identifies the particular medicine within this category.",
    source: {
      title: "Antibiotics · MedlinePlus",
      href: "https://medlineplus.gov/antibiotics.html",
    },
  },
  anticonvulsant: {
    overview:
      "Some anticonvulsant medicines are also used as mood stabilizers. Your categories can reflect that overlap while each medication keeps its own history.",
    source: mentalHealth,
  },
  diabetes: {
    overview:
      "Diabetes treatment can include insulin and other medicines used to manage blood glucose. This journal category keeps the products you label here individually identifiable.",
    source: {
      title: "Diabetes medicines · MedlinePlus",
      href: "https://medlineplus.gov/diabetesmedicines.html",
    },
  },
  supplement: {
    overview:
      "A place for the vitamins and supplements you choose to record. Ingredients, product names and quantities remain attached to each saved entry rather than being treated as one shared dose.",
    source: {
      title: "Drugs, herbs and supplements · MedlinePlus",
      href: "https://medlineplus.gov/druginformation.html",
    },
  },
  other: {
    overview:
      "The useful catch-all: products that do not fit your other labels, or that you prefer to organize later. Their forms, ingredients and full recorded histories still stay connected.",
  },
};
