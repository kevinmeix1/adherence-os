const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

async function check(path, validate) {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  await validate(response);
  console.log(`ok ${path}`);
}

await check("/", async (response) => {
  const html = await response.text();
  if (!html.includes("Adherence OS")) throw new Error("home page is missing the product name");
});

await check("/api/health", async (response) => {
  const payload = await response.json();
  if (payload.status !== "ok" || payload.dataMode !== "synthetic") {
    throw new Error("health response did not report a ready synthetic demo");
  }
});

await check("/patients", async (response) => {
  const html = await response.text();
  if (!html.includes("Patient overview") || !html.includes("Maya Patel")) {
    throw new Error("patient directory is missing expected synthetic records");
  }
});

await check("/patients/maya-patel", async (response) => {
  const html = await response.text();
  if (!html.includes("Eight-week timeline") || !html.includes("Next recommended action")) {
    throw new Error("patient record is missing its decision summary");
  }
});

console.log(`smoke checks passed for ${baseUrl}`);
