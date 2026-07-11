# Technical Architecture

Adherence OS is a browser-first prototype for at-home GLP-1 adherence support. It separates prediction, safety, explanation, and communication so each layer can be inspected during the demo.

```mermaid
flowchart LR
    A["60-second home check-in"] --> B["Deterministic safety engine"]
    A --> C["Local edge ML model"]
    H["8-week patient history"] --> C
    H --> D["Knowledge graph builder"]
    C --> D
    B --> D
    D --> E["Weighted evidence path"]
    C --> F["Bootstrap spread + support gate"]
    F --> M["Sensitivity + bounded what-if rescoring"]
    E --> G["Patient care moment"]
    M --> G
    B --> I["Clinician handoff"]
    G --> J["Optional OpenAI structured output"]
    J --> K["Schema validation + safety override"]
    K --> L["Patient and clinician views"]
    B --> L
```

## Intelligence Layers

### 1. Edge ML

- Every index-week row predicts a planned adherence event in the following week; same-row outcomes cannot enter its features.
- Patients are isolated into deterministic 70/15/15 training, validation, and test partitions.
- A monotonic consensus logistic model and 16 patient-bootstrap members are trained on 12,000 synthetic GLP-1 patient-weeks with projected-gradient sign constraints.
- The model, bootstrap members, support bounds, held-out metrics, and parity fixtures are exported to `data/adherence-model.json`.
- Inference runs locally in the browser over 14 structured features.
- The UI exposes exact signed log-odds decomposition, bootstrap model spread, one-feature-at-a-time sensitivity, reliability bins, and transparent what-if score changes.
- Numeric route ranking abstains if the observed or simulated vector is outside the training-only 0.5th-99.5th percentile support bounds.

### 2. Knowledge Graph

- Patient, symptom, routine, biomarker, risk, intervention, safety, and clinician nodes are assembled for the current check-in.
- Weighted graph scoring identifies the most connected active driver in this authored evidence map.
- A rescue path connects that driver to the strongest what-if action or to the safety handoff.
- Every node declares its provenance as model attribution, bounded simulation, deterministic rule, or patient context.
- Decision-path, selected-neighbourhood, attribution, and all-signal modes keep the live graph readable during inspection.
- Support routes are ranked only when observed and simulated vectors remain inside synthetic support; an active safety rule marks every route as blocked.
- This graph is an inspectable decision representation, not a learned graph model or causal graph.

### 3. Safety Engine

- No diagnosis.
- No medication start, stop, or dose-change advice.
- Red flags activate clinician or urgent-care escalation.
- The safety result is independent of the adherence prediction and can override it.

### 4. Optional LLM Layer

- The API asks OpenAI for schema-constrained care-plan output.
- Zod validates the response shape.
- The complete deterministic plan is recomputed after generation; provider wording does not survive the current MVP merge.
- If the API is unavailable or invalid, the local engine returns a complete fallback plan.

## Demo Reliability

- All three patients and eight weeks of history are synthetic and checked into the repository.
- Normal and escalation scenarios are deterministic.
- The core demo works without a network connection or API key.
- The optional OpenAI path demonstrates schema-constrained provider integration, but does not alter the user-facing plan in the current safety-first MVP.

## Prototype Limits

- The model metrics describe synthetic data and are not evidence of clinical performance.
- The graph is an explainable decision representation, not a validated causal model.
- Intervention simulations mutate explicit feature assumptions and rescore the model; they are not estimates of treatment effect.
- Local sensitivity varies one bounded feature at a time; it is not a confidence interval or clinical uncertainty estimate.
- Production deployment would require clinical validation, governance, monitoring, privacy review, and integration with eMed workflows.
