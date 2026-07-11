import { getModelArtifact } from "./edgeModel";
import { patients } from "./patients";

export function getHealthStatus() {
  const artifact = getModelArtifact();

  return {
    status: "ok" as const,
    service: "adherence-os",
    dataMode: "synthetic" as const,
    checks: {
      patients: patients.length,
      modelVersion: artifact.version,
      modelFeatures: artifact.features.length,
      modelArtifact: {
        version: artifact.version,
        trainedAt: artifact.trainedAt,
        generationSeed: artifact.cohort.generationSeed,
        cohortPatients: artifact.cohort.patients,
        samples: artifact.metrics.samples,
        features: artifact.features.length
      }
    }
  };
}
