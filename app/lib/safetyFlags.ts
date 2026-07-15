export const SAFETY_FLAG_IDS = [
  "chest-or-breathing",
  "faint-or-severe-dizziness",
  "severe-abdominal-pain",
  "unable-to-keep-fluids-down",
  "overdose-or-poisoning",
  "pregnancy-concern",
  "self-harm-thoughts",
  "cannot-stay-safe"
] as const;

export type SafetyFlagId = (typeof SAFETY_FLAG_IDS)[number];

export const SAFETY_FLAG_OPTIONS: ReadonlyArray<{
  id: SafetyFlagId;
  label: string;
}> = [
  { id: "chest-or-breathing", label: "Chest pain or difficulty breathing" },
  { id: "faint-or-severe-dizziness", label: "Fainted or severely dizzy" },
  { id: "severe-abdominal-pain", label: "Severe or worsening stomach pain" },
  { id: "unable-to-keep-fluids-down", label: "Unable to keep fluids down" },
  { id: "overdose-or-poisoning", label: "Possible overdose or poisoning" },
  { id: "pregnancy-concern", label: "Pregnancy concern" },
  { id: "self-harm-thoughts", label: "Thoughts of self-harm" },
  { id: "cannot-stay-safe", label: "Might act now or cannot stay safe" }
];

export const SAFETY_FLAG_RULE_LABELS: Record<SafetyFlagId, string> = {
  "chest-or-breathing": "chest pain or breathing difficulty",
  "faint-or-severe-dizziness": "fainting or severe dizziness",
  "severe-abdominal-pain": "severe abdominal pain",
  "unable-to-keep-fluids-down": "unable to keep fluids down",
  "overdose-or-poisoning": "possible overdose or poisoning",
  "pregnancy-concern": "pregnancy concern",
  "self-harm-thoughts": "self-harm language",
  "cannot-stay-safe": "immediate self-harm language"
};
