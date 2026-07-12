# Product Design References

Adherence OS uses established clinical-workflow patterns, then applies them to a new product problem: preventing chronic-care dropout while preserving human clinical ownership. The interface is an original implementation. No source screen, stylesheet, asset, or proprietary template was copied.

## Visual Direction: A Care Decision Ledger

The previous interface overused dark graph surfaces, soft cards, circular status treatments, and coloured badges. Those conventions made the prototype feel like a generic AI dashboard. The current design instead behaves like a working clinical record:

- flat white and warm-grey layers separated by rules, not shadows;
- compact case metadata set in monospace;
- a dense evidence map as the first substantial object;
- table-like summaries, explicit ownership, and plain status language;
- red reserved for deterministic escalation;
- one-shot node feedback with no scan line, glow, or looping animation.

This is intentionally quieter than a consumer wellness dashboard. The product should look built for repeated inspection and handoff, not for a marketing screenshot.

## NHS Digital Service Manual

References:

- [NHS digital service design system](https://service-manual.nhs.uk/design-system/index)
- [NHS summary list](https://service-manual.nhs.uk/design-system/components/summary-list/)
- [NHS task list](https://service-manual.nhs.uk/design-system/components/task-list)
- [NHS tabs](https://service-manual.nhs.uk/design-system/components/tabs)

Patterns adapted:

- use short labels and explicit states instead of decorative status UI;
- separate keys and values with stable rules so records scan quickly;
- make the pending task and its ownership visible;
- use tabs only for related information that repeat users switch between often.

Adherence OS translation: the local review set borrows task-list scanning without implying a connected inbox, the handoff is a summary record, and graph focus modes behave like compact inspection tabs.

## Carbon Design System

References:

- [Carbon data table guidance](https://carbondesignsystem.com/components/data-table/usage/)
- [Carbon colour and layer guidance](https://carbondesignsystem.com/elements/color/usage/)
- [Carbon content switcher guidance](https://carbondesignsystem.com/components/content-switcher/usage/)

Patterns adapted:

- give dense data the main content width instead of nesting it in decorative cards;
- keep row heights and column treatment consistent;
- use contrast shifts for major workflow boundaries, not on every component;
- identify AI involvement at the relevant evidence layer instead of branding the whole interface as AI.
- use one compact, high-contrast switcher for alternate views of the same evidence map.

Adherence OS translation: the model record, synthetic-cohort view, provenance rows, and metric register share one restrained data grammar. Model, simulation, rule, and context sources are labelled where they matter.

## OpenMRS O3

References:

- [OpenMRS O3 product demo](https://openmrs.org/demo/)
- [How OpenMRS O3 uses Carbon](https://openmrs.org/o3-the-new-openmrs-explained-and-the-investments-that-made-it-possible/)
- [OpenMRS patient-chart configuration](https://o3-docs.openmrs.org/en-US/docs/configure-o3/configure-the-patient-chart/)
- [OpenMRS workspace model](https://o3-docs.openmrs.org/en-US/docs/workspaces/)

Patterns adapted:

- optimise clinical navigation for repeat use;
- keep patient context present while moving between related workflows;
- use a shared system across patient chart, worklist, and technical evidence;
- make responsive behavior part of the workflow design rather than a scaled desktop afterthought.
- keep focused review work beside patient context on desktop and move it ahead of exploration when an urgent mobile action takes priority.

Adherence OS translation: Maya remains the active synthetic case across Decision map, Check-in, Review drafts, and Model record. The evidence inspector stays beside the map on desktop. The 320-pixel layout preserves the same decision order without horizontal overflow, while urgent actions move ahead of graph exploration.

## eMed Product Context

References:

- [eMed weight-management platform](https://www.emed.com/us)
- [eMed GLP-1 programme FAQ](https://www.emed.com/join/faq)

Product assumptions retained:

- at-home check-ins should be low friction;
- symptoms and adherence need longitudinal context;
- escalation should connect the patient to a clinical team asynchronously;
- licensed clinicians retain diagnosis and medication decisions.

Adherence OS translation: a short structured check-in feeds local risk inference and an evidence graph, while independent deterministic rules can stop coaching and prepare a review draft.

## Original Product Position

The result is not a general health dashboard and not a chatbot. It is a care decision ledger with one inspectable sequence:

1. Predict near-term adherence interruption risk.
2. Distinguish the highest-ranked context signal from the largest model contributor.
3. Compare one bounded tested action.
4. Let deterministic safety rules suppress coaching.
5. Hand a review draft and evidence record to a human clinician.

The visual system exists to make that sequence easier to trust. It does not imply clinical validation, causal effects, autonomous care, or production compliance.
