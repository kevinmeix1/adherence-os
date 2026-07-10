import patientsData from "@/data/patients.json";
import { getModelArtifact } from "./edgeModel";

export function getHealthStatus() {
  const artifact = getModelArtifact();

  return {
    status: "ok" as const,
    service: "adherence-os",
    dataMode: "synthetic" as const,
    checks: {
      patients: patientsData.length,
      modelVersion: artifact.version,
      modelFeatures: artifact.features.length
    }
  };
}
