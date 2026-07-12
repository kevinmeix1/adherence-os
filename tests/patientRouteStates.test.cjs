const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const PatientsError = require("../app/patients/error.tsx").default;
const PatientsLoading = require("../app/patients/loading.tsx").default;
const PatientNotFound = require("../app/patients/[patientId]/not-found.tsx").default;
const PatientDetailPage = require("../app/patients/[patientId]/page.tsx").default;
const AppNotFound = require("../app/not-found.tsx").default;
const PatientsPage = require("../app/patients/page.tsx").default;

test("patient directory exposes complete table and record-link semantics", () => {
  const html = renderToStaticMarkup(React.createElement(PatientsPage));

  assert.match(html, /role="table"/);
  assert.match(html, /aria-colcount="6"/);
  assert.match(html, /aria-rowcount="4"/);
  assert.equal((html.match(/role="columnheader"/g) ?? []).length, 6);
  assert.equal((html.match(/role="row"/g) ?? []).length, 4);
  assert.equal((html.match(/role="cell"/g) ?? []).length, 18);
  assert.match(html, /aria-label="Open Maya Patel patient record"/);
});

test("patient record with unsupported features withholds the ML risk number", async () => {
  const element = await PatientDetailPage({ params: Promise.resolve({ patientId: "james-oconnor" }) });
  const html = renderToStaticMarkup(element);

  assert.match(html, /ML abstained outside marginal feature bounds/);
  assert.doesNotMatch(html, /\d+% ML adherence risk/);
});

test("global not-found state returns users to the product or patient overview", () => {
  const html = renderToStaticMarkup(React.createElement(AppNotFound));

  assert.match(html, /Page not found/);
  assert.match(html, /Adherence OS synthetic demo/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/patients"/);
});

test("unknown patient state explains the synthetic boundary and recovery link", () => {
  const html = renderToStaticMarkup(React.createElement(PatientNotFound));

  assert.match(html, /Patient not found/);
  assert.match(html, /not part of the synthetic demo cohort/);
  assert.match(html, /href="\/patients"/);
  assert.match(html, /Return to patient overview/);
});

test("patient directory error state offers retry and a Decision map exit", () => {
  const html = renderToStaticMarkup(React.createElement(PatientsError, { error: new Error("synthetic test"), reset() {} }));

  assert.match(html, /Patient directory unavailable/);
  assert.match(html, /<button>[\s\S]*Retry<\/button>/);
  assert.match(html, /href="\/"/);
  assert.match(html, /Return to Decision map/);
});

test("patient loading state exposes busy semantics", () => {
  const html = renderToStaticMarkup(React.createElement(PatientsLoading));

  assert.match(html, /aria-busy="true"/);
  assert.match(html, /directory-loading-bar/);
  assert.match(html, /directory-loading-table/);
});
