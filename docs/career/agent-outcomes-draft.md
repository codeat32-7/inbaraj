# Draft: outcomes for the Rocketlane AI agents

Status: DRAFT, not on the site. Nothing here is published.

Rules for this draft
- Plain wording is taken from what Inbaraj has said. Anything in **[brackets]** is a blank only Inbaraj can fill with a real figure or fact.
- Do not publish a bracket. If a blank can't be filled truthfully, delete that clause and keep the rest.
- Metrics must be ones Inbaraj can explain in an interview (how measured, over what period).

## What we can already say safely (from what Inbaraj told us)

| Agent | Outcome we know is true |
|---|---|
| Sales-to-implementation handover | Built on Nitro and now used by the whole team |
| Kickoff deck generator | Built on Nitro and now used by the whole team |
| Workshop planner | Built on Nitro and now used by the whole team (prep before and recap after each workshop) |
| Solution design agent | Produces the design document for every customer |
| UAT agent | Produces test scripts and cases from the design doc, scope doc, emails, and call transcripts |
| Form-to-Sheets agent | Form responses could not be reported on; moving them into Rocketlane Sheets made reporting possible |
| Configuration agent (POC) | Validated by the product team |
| Atlas | Approved solutions are reusable across implementations; retired features are flagged instead of recommended |

## Draft card: "Nitro · Agents the team runs on" (outcome version)

- **Sales-to-Implementation Handover:** Replaces the manually written handover with one generated from the deal context; used by the whole implementation team. **[time per handover before to after]**
- **Kickoff Deck Generator:** Produces each customer's kickoff deck for the team to refine instead of building from scratch. **[time saved per kickoff / number of kickoffs run]**
- **Workshop Planner:** Prepares every workshop session beforehand and writes the recap after, so sessions start prepared and follow-ups go out consistently. **[time saved / any change in follow-up speed]**
- **Solution Design Agent:** Gives every customer a design document in the same structure, drafted from the project inputs. **[time to first draft / consistency outcome]**
- **UAT Agent:** Drafts test scripts and cases straight from the design doc, scope doc, emails, and transcripts, so testing starts from a complete set rather than a blank page. **[time saved / test cases per project]**
- **Form-to-Sheets Agent:** Moves form responses into Rocketlane Sheets, which makes them reportable. Reporting on form responses was not possible before. **[who uses the reports / how many forms or projects]**

Adoption line to add under the card (only if true): "Used by **[N]** implementation managers across **[N]** projects."

## Draft card: "Nitro · Configuration agent (POC)" (outcome version)

- **Problem:** Native settings, notifications, and automations had to be configured manually in the platform after every design document.
- **Solution:** A Nitro Workforce agent reads the design document, works out the required configuration, and uses Browserbase to apply it in the platform.
- **Outcome:** Proof of concept validated by the product team. **[effort removed per customer, e.g. "about X hours of manual setup per implementation"]**

## Draft card: "Atlas" (outcome additions)

Add one bullet to the existing six:
- **Impact:** Implementation managers can search how a use case was solved before, instead of solving it from scratch. **[use cases captured / solutions approved / number of questions answered / number of active users]**

## Draft bullet changes (the short bullets above the cards)

- "Built the Nitro agents Rocketlane's implementation team now uses across the project lifecycle..." becomes
  "Built and rolled out Nitro agents now used by the whole implementation team across handover, kickoff, workshops, design, and UAT, cutting **[X]** per project."
- "Built Atlas, an AI knowledge system..." becomes
  "Built Atlas so any implementation manager can find how a use case was solved before, with **[N]** approved solutions in the knowledge base."

## Questions for Inbaraj (answer what you can; skip what you can't)

1. **Adoption:** how many people on the team use the agents, and since when?
2. **Time:** for each agent, roughly how long did the task take before, and after? A range is fine, e.g. "2 hours down to 20 minutes".
3. **Volume:** how many handovers, kickoff decks, or workshops have been generated so far?
4. **Quality:** any change in consistency, rework, or customer feedback you can point to?
5. **Atlas:** how many use cases captured, solutions approved, or questions answered? Who has used it?
6. **Config agent:** how long does manual configuration take per customer today?
7. **Anything the product or leadership team said** about these (for example the POC validation), if it's something you can quote or paraphrase.
