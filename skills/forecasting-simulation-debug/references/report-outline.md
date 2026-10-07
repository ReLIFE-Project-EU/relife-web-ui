# A readable report of the data handoffs

Use this outline for the report, adapting the stages to the observed execution.
The reader knows software but need not know building physics. They must be able to
trace an energy number backward through the calculation and locate a wrong input
or transformation. Keep the baseline walkthrough continuous. Explain a renovation
as changes to that same flow.

## Opening

State the building, location, scenarios, capture date, and result basis. Identify
the Web UI, Forecasting API, and installed pybuildingenergy versions and revisions
in a small table. Explain what the layers do in one sentence each if their roles
are not already clear from the walkthrough. Do not lead with hashes or audit logs.

## Each numbered step

Use a descriptive heading naming the component and action, for example
"The Forecasting API loads the selected building". Give the following information
in short paragraphs and, where useful, a small table. The labels may be explicit;
do not force all of this into a single table row.

**Data in.** Name the source, fields, meaningful values and units. Say whether the
source is a user choice, catalogue entry, earlier step, external service, or default.
For repeated values, group equivalent surfaces or summarize schedules. For hourly
arrays, give their content, coverage and a real sample rather than printing the array.

**What happens.** Name who performs the operation and explain it in ordinary
sentences. Describe lookups, substitutions, filtering, calculations or pass-through.
Define unfamiliar terms where needed. Connect formulas to named quantities and
show a numerical substitution when it helps explain an energy transformation.

**Data out.** Name the values or records produced, their units, and the next step
that consumes them. State unchanged values explicitly only when that resolves an
important question about provenance or possible modification.

**Check or issue.** Briefly state the evidence supporting this handoff. Place ignored
inputs, defaults and unexpected transformations here, with their consequence and
any uncertainty. Distinguish observing a mismatch from measuring its energy impact.
Source locations and raw records can live in the evidence index; essential values
and explanations belong in the report itself.

## Follow the whole path

- Start with what the user selected and what the UI actually sent. A displayed
  building property is not necessarily a transmitted request field.
- Show where the API gets the building and system configuration and what it passes
  to the engine. Avoid the unexplained label "prepared inputs".
- Explain external weather acquisition and schedule generation separately. If dates
  differ, explain which calendar controls weekdays/holidays and how records are paired.
  Explain any fallback in terms of the changed behavior, not just its HTTP status.
- Explain hourly demand in terms of heat entering/leaving the building, heat stored,
  and temperature targets. Use observed heating/cooling examples to connect effective
  inputs to outputs. Do not imply that illustrative samples reproduce every solver
  equation or that an unreconciled diagnostic is an exact energy balance.
- Explain removal of any initial settling period before annual aggregation. State
  which layer does it, how many records remain, and what a row's energy unit means.
- Walk from room demand to system consumption. Explain efficiency, useful recovered
  heat, cooling performance and electricity for pumps/controls as needed. Keep the
  intermediate values next to the calculation that produces them. If constant
  parameters permit an annual worked example, state why that aggregation is valid.
- Show the exact response fields used by the UI and its own arithmetic, including
  scaling and rounding. End with the actual displayed values and included end uses.

For a comparison, list only the changed inputs, their owner, and the resulting
output differences. Do not repeat the baseline explanation or add unrelated scenarios.

## Writing and final review

Use complete sentences for explanations. Reserve tables for comparable values;
avoid abbreviations, slash-separated lists and multiple ideas packed into one cell.
Explain why a technical fact matters instead of merely listing it. Keep peripheral
weather database names, full image digests and diagnostic logs in indexed evidence.
Use enough space to make the data flow understandable, without turning the report
into a catalogue of every internal variable.

Ask of the finished report:

1. What did the UI send, and where did the remaining inputs come from?
2. Who changes each important value, and why?
3. What does an engine output represent, and how is it turned into fuel/electricity?
4. Which calculations happen in the UI, and can its displayed numbers be recomputed?
5. Where could an incorrect input or transformation enter this particular flow?

If an answer requires chat history, another document, or guessing what an arrow or
abbreviation means, revise the corresponding step. Retain the small resource index
and archive layout specified in SKILL.md.
