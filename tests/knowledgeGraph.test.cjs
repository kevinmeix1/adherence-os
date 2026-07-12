const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { DEMO_CHECK_INS, evaluateCheckIn } = require("../app/lib/careEngine.ts");
const { scorePatientRisk } = require("../app/lib/edgeModel.ts");
const { buildAdherenceKnowledgeGraph } = require("../app/lib/knowledgeGraph.ts");

const patient = patients.find((candidate) => candidate.id === "maya-patel");

function buildCheckIn(scenario) {
  return {
    patientId: patient.id,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  };
}

function buildGraph(scenario) {
  const checkIn = buildCheckIn(scenario);
  const carePlan = evaluateCheckIn(patient, checkIn);
  const edgeRisk = scorePatientRisk(patient, checkIn);

  return buildAdherenceKnowledgeGraph({
    patient,
    checkIn,
    carePlan,
    edgeRisk,
    cohort: patients
  });
}

test("normal graph creates a coaching rescue path with valid edges", () => {
  const graph = buildGraph("normal");
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  assert.equal(graph.pathMode, "coaching");
  assert.equal(graph.rescuePath.length, 3);
  assert.ok(graph.nodes.some((node) => node.type === "intervention"));
  assert.ok(graph.nodes.some((node) => node.id === "safety-guardrail"));
  assert.ok(graph.nodes.some((node) => node.id === "clinician-handoff"));

  for (const edge of graph.edges) {
    assert.ok(nodeIds.has(edge.source), `missing source node ${edge.source}`);
    assert.ok(nodeIds.has(edge.target), `missing target node ${edge.target}`);
  }
});

test("escalation graph routes through safety guardrail and clinician handoff", () => {
  const graph = buildGraph("escalation");
  const safetyRoute = graph.mlFeatures.find((feature) => feature.id === "safety_route_state");

  assert.equal(graph.pathMode, "escalation");
  assert.equal(safetyRoute.value, 1);
  assert.equal(safetyRoute.displayValue, "Handoff draft");
  assert.deepEqual(
    graph.rescuePath.map((step) => step.nodeId).slice(-2),
    ["safety-guardrail", "clinician-handoff"]
  );
  assert.ok(
    graph.edges.some((edge) => edge.source === "risk" && edge.target === "safety-guardrail" && edge.status === "urgent"),
    "expected urgent risk-to-safety edge"
  );
});

test("evidence map exposes sorted graph scores and transparent diagnostics", () => {
  const graph = buildGraph("normal");
  const featureIds = graph.mlFeatures.map((feature) => feature.id);
  const centralityScores = graph.centrality.map((item) => item.score);
  const sortedScores = [...centralityScores].sort((a, b) => b - a);

  assert.deepEqual(centralityScores, sortedScores);
  assert.ok(["symptom", "routine", "biomarker"].includes(graph.topDriver.type));
  assert.equal(
    graph.nodeExplanations.find((item) => item.nodeId === graph.topDriver.nodeId)?.direction,
    "raises risk"
  );
  for (const nodeId of ["nausea", "hydration", "appetite-energy", "routine", "biomarkers"]) {
    const explanation = graph.nodeExplanations.find((item) => item.nodeId === nodeId);
    const edge = graph.edges.find((item) => item.source === nodeId && item.target === "risk");
    if (explanation?.direction === "raises risk") assert.match(edge?.label ?? "", /raises model risk/);
    if (explanation?.direction === "lowers risk") assert.match(edge?.label ?? "", /lowers model risk/);
  }
  assert.deepEqual(featureIds, [
    "top_driver_graph_score",
    "safety_route_state",
    "scenario_route_ratio",
    "recent_friction_index",
    "synthetic_tag_overlap"
  ]);
  assert.equal(graph.cohortMatches.length, patients.length - 1);
  assert.equal(graph.nodeExplanations.length, graph.nodes.length);
  assert.equal(graph.nodeExplanations.find((item) => item.nodeId === "routine").source, "model");
  assert.equal(graph.nodeExplanations.find((item) => item.nodeId === "safety-guardrail").source, "rule");
  const interventionExplanation = graph.nodeExplanations.find((item) => item.nodeId.startsWith("intervention-"));
  assert.equal(interventionExplanation.source, "simulation");
  assert.equal(graph.nodeExplanations.find((item) => item.nodeId === "risk").impactShare, 1);
  assert.equal(graph.routeAlternatives.length, 4);
  assert.equal(graph.routeAlternatives[0].status, "recommended");
  assert.ok(graph.routeAlternatives[0].absoluteReduction >= graph.routeAlternatives[1].absoluteReduction);
});

test("escalation explanation keeps the safety override outside the adherence model", () => {
  const graph = buildGraph("escalation");
  const safety = graph.nodeExplanations.find((item) => item.nodeId === "safety-guardrail");
  const modelExplanations = graph.nodeExplanations.filter((item) => item.source === "model");
  const simulationExplanations = graph.nodeExplanations.filter((item) => item.source === "simulation");

  assert.equal(safety.source, "rule");
  assert.equal(safety.direction, "override");
  assert.equal(safety.contribution, null);
  assert.match(safety.summary, /outside the ML score/i);
  assert.ok(graph.routeAlternatives.every((route) => route.status === "blocked-by-safety"));
  assert.ok(modelExplanations.length > 0);
  assert.ok(modelExplanations.every((item) => item.contribution === null && item.impactShare === 0));
  assert.ok(modelExplanations.every((item) => /attribution is withheld/i.test(item.summary)));
  assert.ok(simulationExplanations.every((item) => item.contribution === null && item.impactShare === 0));
});

test("model support and deterministic safety remain independent in all four states", () => {
  const cases = [
    {
      name: "supported and clear",
      checkIn: buildCheckIn("normal"),
      expectedSupport: "supported",
      expectedPath: "coaching",
      expectedRoutes: "ranked"
    },
    {
      name: "unsupported and clear",
      checkIn: { ...buildCheckIn("normal"), hydrationScore: 10, scenario: "custom" },
      expectedSupport: "out-of-support",
      expectedPath: "coaching",
      expectedRoutes: "not-ranked"
    },
    {
      name: "supported and safety-active",
      checkIn: { ...buildCheckIn("normal"), safetyFlags: ["thoughts-of-self-harm"], scenario: "custom" },
      expectedSupport: "supported",
      expectedPath: "escalation",
      expectedRoutes: "blocked-by-safety"
    },
    {
      name: "unsupported and safety-active",
      checkIn: buildCheckIn("escalation"),
      expectedSupport: "out-of-support",
      expectedPath: "escalation",
      expectedRoutes: "blocked-by-safety"
    }
  ];

  for (const item of cases) {
    const carePlan = evaluateCheckIn(patient, item.checkIn);
    const edgeRisk = scorePatientRisk(patient, item.checkIn);
    const graph = buildAdherenceKnowledgeGraph({ patient, checkIn: item.checkIn, carePlan, edgeRisk, cohort: patients });

    assert.equal(edgeRisk.support.status, item.expectedSupport, `${item.name}: support`);
    assert.equal(graph.pathMode, item.expectedPath, `${item.name}: path`);
    if (item.expectedRoutes === "ranked") {
      assert.equal(graph.routeAlternatives[0].status, "recommended", `${item.name}: first route`);
      assert.ok(
        graph.routeAlternatives.every((route) => route.status === "recommended" || route.status === "alternative"),
        `${item.name}: ranked routes`
      );
    } else {
      assert.ok(graph.routeAlternatives.every((route) => route.status === item.expectedRoutes), `${item.name}: routes`);
    }
    if (item.expectedSupport === "out-of-support" && item.expectedPath === "coaching") {
      assert.deepEqual(graph.rescuePath.map((step) => step.label), [graph.topDriver.label, "Model abstained", "Rules remain active"]);
      assert.ok(graph.rescuePath.every((step) => !/lower adherence risk/i.test(step.label)));
      assert.ok(graph.edges.filter((edge) => edge.source.startsWith("intervention-")).every((edge) => edge.status === "neutral"));
    }
  }
});
