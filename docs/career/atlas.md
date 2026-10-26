# Atlas — AI-Powered Implementation Knowledge and Solution Intelligence System

> Source of truth for Atlas (Rocketlane). Provided by Inbaraj. Resume copy about Atlas in
> `data/base.json` and `data/ground-truth.json` must stay consistent with this document.
> Do not add details listed under "Details Not Yet Specified" unless Inbaraj provides them.

## 1. Project Overview

- **Project name:** Atlas
- **Company:** Rocketlane
- **Purpose:** Build a centralized, AI-powered repository of implementation use cases, customer-specific solutions, technical decisions, and reusable implementation knowledge.
- **Problem being solved:** Implementation Managers (IMs) solve similar customer problems independently. Knowledge is scattered across individual employees' experience, call transcripts, support tickets, Slack discussions, and unstructured documents.
- **Core objective:** Capture implementation knowledge, structure it into reusable solutions, and make it searchable and contextually relevant across customers and projects.
- **Primary users:** Implementation Managers, technical implementation teams, and administrators.
- **Core principle:** Preserve historical implementation knowledge while validating solutions against the latest available product information before recommending them.

## 2. Problem Statement

- Implementation knowledge is siloed across individual Implementation Managers.
- There is no single, well-structured repository for documenting how implementation use cases were solved.
- Solutions are often buried in customer calls, internal meetings, support tickets, Slack conversations, and project documents.
- Existing documentation can be difficult to search, navigate, and reuse.
- The same problems may be solved repeatedly by different implementation teams.
- Previously successful solutions may become outdated when Rocketlane features, APIs, or recommended implementation approaches change.
- Sending the entire documentation corpus to an LLM at runtime is impractical because of context-window limits, cost, and irrelevant information.
- There is a need for human validation to ensure that AI-generated use cases and solutions are accurate.
- There is also a need to identify incorrect AI responses systematically and improve the system over time.

## 3. Input Data Sources

Atlas connects to multiple sources containing customer discussions, implementation activities, technical documentation, and product knowledge.

### A. Customer and Internal Conversations

- **Avoma:** Customer call transcripts and internal meeting transcripts.
- **Freshdesk:** Customer support tickets containing problem descriptions, use cases, troubleshooting discussions, and proposed solutions.
- **Slack:** Internal discussions containing technical decisions, implementation approaches, workarounds, and product-related clarifications.

### B. Documentation and Knowledge Repositories

- **Notion:** Internal technical documentation, engineering documentation, and other internal knowledge.
- **Solution documents:** Documents describing how specific customer problems were solved.
- **Design documents:** Documents describing proposed technical designs and implementation approaches.
- **Scope documents:** Documents describing customer requirements and implementation scope.
- **Public Rocketlane documentation:** Publicly available Rocketlane product documentation, including documentation related to AI and product capabilities.
- **Public API documentation:** API specifications and documentation used to understand available capabilities and integration approaches.

### C. Rocketlane Implementation Projects

- Rocketlane is a Professional Services Automation (PSA) platform.
- Rocketlane implementations for customers are managed within Rocketlane itself.
- Each customer has a dedicated implementation project in Rocketlane.
- These projects contain implementation-related information and activities.
- Atlas can connect to the Rocketlane instance to retrieve relevant implementation knowledge.

## 4. Technology and Architecture

### A. Atlas Application

- Atlas is the application built using Lovable.
- It acts as the user-facing interface for searching implementation knowledge and retrieving solutions.
- It connects to the relevant data sources and the Supermemory knowledge layer.
- It provides access to previously approved customer solutions and validates those solutions against current information.

### B. Supermemory

- Supermemory is used to index and store knowledge from documentation and other sources.
- It enables retrieval of relevant information instead of sending the entire knowledge base to the LLM.
- It stores approved implementation use cases and solutions.
- It supports retrieving historical knowledge relevant to a particular query.
- It supports ranking/re-ranking retrieved information and managing evolving knowledge and versions.
- It can be updated with information indicating that a previously available feature or solution has changed or been retired.

### C. Anthropic

- Anthropic is used to host/run the agent responsible for processing implementation inputs and generating use cases and solutions.

### D. Backend Agent

- A separate agent is hosted in the application backend.
- It handles user queries and searches across the available knowledge sources.
- It uses appropriate skills, instructions, and logic to retrieve and validate information.
- It implements the query cache, relevance checks, and feedback-related workflows.

### E. Important Architectural Principle

- Do not pass all available documentation to the LLM at runtime.
- Index the knowledge in Supermemory and retrieve relevant information based on the current task or question.
- Combine retrieved knowledge with the context of the customer's implementation problem.
- Validate historical solutions against current product and implementation information before returning recommendations.

## 5. Workflow 1: Generating Customer Use Cases and Solutions

**Trigger:** A customer call is completed or relevant support-ticket information becomes available.

### Processing Steps

1. Retrieve the relevant call transcript from Avoma or ticket information from Freshdesk.
2. Send the input to the use-case-generation agent.
3. Analyze the discussion to identify:
   - Customer problems.
   - Business requirements.
   - Use cases discussed.
   - Expected implementation outcomes.
   - Constraints and dependencies.
   - Solutions explicitly discussed during the conversation.
4. Retrieve relevant Rocketlane product and technical knowledge from Supermemory.
5. Use the retrieved knowledge to interpret the conversation in the context of Rocketlane's capabilities.
6. Generate structured use cases for the customer.
7. Associate proposed solutions with the relevant use cases when possible.

### Solution Generation Logic

- **Case A — A solution was explicitly discussed:** Capture the solution from the source discussion and use relevant product knowledge to interpret it.
- **Case B — No solution was discussed:** Attempt to identify a suitable solution using the available Rocketlane product documentation, technical knowledge, and relevant prior implementation experience.
- **Case C — Insufficient information:** The system should distinguish a proposed solution from a confirmed or previously implemented solution. It should not present an inferred solution as something that was explicitly agreed upon.

### Output

For each customer, Atlas generates structured use cases containing the problem or requirement, the context in which it was discussed, and the solution or proposed approach where available.

## 6. Workflow 2: Human-in-the-Loop Approval

1. After implementation work has progressed or been completed, the Implementation Manager reviews the generated use cases and solutions.
2. The Implementation Manager can approve or revise the generated content.
3. Approved content becomes reusable implementation knowledge.
4. Approved solutions are saved in Supermemory.
5. Future users can search for similar use cases and retrieve the approved solution, including the customer implementation where it was used.

### Purpose

- Maintain human oversight over AI-generated knowledge.
- Improve accuracy and reliability.
- Distinguish validated solutions from unreviewed AI suggestions.
- Convert individual implementation experience into organizational knowledge.

## 7. Workflow 3: Searching for Existing Solutions

**Trigger:** A user asks Atlas how a particular implementation problem or use case was solved.

### Processing Steps

1. Receive the user's question.
2. Check the query cache for a sufficiently relevant previous response.
3. If no suitable cached response exists, search Supermemory for matching approved solutions and related knowledge.
4. Identify the relevant historical implementation, customer context, and solution.
5. Validate the retrieved solution against current information from connected sources, where relevant.
6. Generate an answer that explains the historical approach and its current applicability.
7. Provide relevant context about whether the solution remains supported, has changed, or has been retired.

### Expected Answer

Atlas should help users understand:

- Whether a similar use case has been handled previously.
- Which customer implementation used the solution.
- How the problem was solved.
- Why the approach was used, when the source material establishes the rationale.
- Whether the approach is still applicable.
- What the current recommended approach is if the historical solution is no longer valid.

## 8. Workflow 4: Validating Historical Solutions Against Current Knowledge

### Problem

A solution that worked in the past may no longer be valid because Rocketlane's product features, APIs, implementation patterns, or supported integrations change over time.

### Data Sources Used for Validation

- Supermemory's approved implementation solutions.
- Internal Notion documentation.
- Internal Slack discussions.
- Rocketlane implementation projects.
- Public product documentation.
- Public API documentation.
- Other connected internal knowledge sources.

### Processing Logic

1. Retrieve the historical approved solution.
2. Identify the product capabilities, features, APIs, or dependencies involved.
3. Search the relevant current sources for changes that could affect the solution.
4. Determine whether the historical approach is still applicable based on the available evidence.
5. Return the historical approach alongside any relevant changes and the current recommended approach.

### Example: Retired Scheduled Jobs

- **Historical approach:** A solution used scheduled jobs or scheduled automations within Rocketlane.
- **Subsequent change:** That capability was retired or is no longer the supported approach.
- **Current approach in the example:** Cron jobs are handled directly in Marketo.
- **Expected Atlas response:** Explain that the historical implementation used Rocketlane's scheduled jobs, but the capability has since changed and the current approach is to use Marketo.

This is an illustrative example of how Atlas should preserve historical knowledge without recommending an outdated solution as current guidance.

### Important Distinction

- Historical knowledge answers: "How was this solved before?"
- Current knowledge answers: "How should this be solved now?"
- Atlas combines both to produce a contextually relevant answer.

## 9. Workflow 5: Query Caching

### Objective

Reduce repeated searches, improve response speed, and avoid unnecessary retrieval and agent execution for questions that have already been answered well.

### Processing Logic

1. A user submits a question.
2. Atlas checks the query cache before executing the full retrieval workflow.
3. If a cached response has a relevance score of 95% or higher, the system can return the cached answer.
4. If no suitable cached response exists, the agent performs the required knowledge retrieval and answer generation.
5. User feedback on the response is captured.
6. Positive and negative feedback is associated with the relevant cached response or answer record.

### Cache Feedback Categories

- Positive feedback: The user marks the response as useful.
- Negative feedback: The user marks the response as incorrect or unhelpful.

### Expected Benefit

- Reduce duplicate retrieval operations.
- Improve response latency.
- Reduce unnecessary processing costs.
- Reuse previously successful responses when the query is sufficiently similar.

### Important Consideration

Cached answers must not bypass current-information validation when the underlying solution may have changed. The cache should be invalidated, refreshed, or revalidated when relevant product knowledge changes.

## 10. Workflow 6: Negative Feedback and Answer Validation

### Objective

Identify incorrect AI-generated answers, classify failure patterns, and provide administrators with a structured review process.

### Processing Steps

1. A user submits negative feedback on an Atlas response.
2. Atlas asks the user to provide a reason for the negative feedback.
3. The system records the response and the feedback reason.
4. A validator agent analyzes the feedback and the answer.
5. The validator agent classifies the likely failure category.
6. The issue is added to an administrative review queue.
7. An administrator reviews the flagged answer and identifies the underlying cause.
8. The administrator determines the appropriate corrective action.

### Example Failure Categories

- **Data miss:** Required information was missing from the connected or indexed sources.
- **Context miss:** Relevant information existed, but the agent failed to understand or apply the context correctly.
- **Other classification:** Additional categories can be introduced as needed based on observed failure patterns.

### Potential Administrative Actions

- Connect an additional data source.
- Correct or update existing source information.
- Remove an irrelevant or unsuitable data source from the workflow.
- Improve retrieval instructions or relevance logic.
- Modify agent skills or prompts.
- Improve the solution-generation workflow.
- Correct an incorrect or outdated approved solution.
- Improve cache matching or invalidation logic.

### Expected Benefit

Create a feedback-driven quality improvement process instead of treating incorrect responses as isolated incidents.

## 11. Knowledge Lifecycle

Atlas manages implementation knowledge across its lifecycle:

1. **Capture:** Collect information from calls, tickets, Slack, documents, and Rocketlane projects.
2. **Interpret:** Identify the customer use case, problem, requirements, and any discussed solution.
3. **Enrich:** Retrieve relevant product and technical knowledge from Supermemory.
4. **Generate:** Create structured use cases and solution proposals.
5. **Validate:** Allow the Implementation Manager to approve or revise the content.
6. **Store:** Save approved solutions in Supermemory.
7. **Retrieve:** Reuse historical solutions when similar questions arise.
8. **Verify:** Check historical solutions against current information.
9. **Respond:** Return the most relevant answer, with historical context and current applicability.
10. **Learn:** Capture user feedback and route incorrect responses for administrative review.
11. **Improve:** Refine knowledge sources, retrieval logic, agent skills, and cache behavior.

## 12. Core Components and Responsibilities

| Component | Primary Responsibility |
|---|---|
| Atlas application | User interface and orchestration of knowledge search and solution retrieval |
| Lovable | Application-building platform used to build Atlas |
| Supermemory | Knowledge indexing, storage, retrieval, ranking/re-ranking, and evolving knowledge management |
| Anthropic-hosted agent | Processes source inputs and generates structured customer use cases and solutions |
| Backend agent | Handles user queries, retrieval workflows, validation logic, and cache-related processing |
| Avoma | Customer and internal call transcripts |
| Freshdesk | Customer support tickets |
| Slack | Internal discussions and implementation knowledge |
| Notion | Internal technical and product documentation |
| Rocketlane | Customer implementation project data |
| Public Rocketlane documentation | Product capability reference |
| Public API documentation | API and integration reference |
| Query cache | Reuses sufficiently relevant previous answers |
| Validator agent | Analyzes negatively rated answers and classifies likely failure causes |
| Admin review queue | Enables human review and corrective action for incorrect responses |

## 13. Key Design Principles

- **Centralized knowledge:** Make implementation knowledge available across teams instead of keeping it siloed.
- **Reuse over repetition:** Reuse approved solutions instead of independently solving the same problems.
- **Retrieval instead of full-context loading:** Retrieve relevant knowledge rather than supplying the entire documentation corpus to the LLM.
- **Source-grounded generation:** Use customer discussions and technical documentation to support generated use cases and solutions.
- **Human oversight:** Require Implementation Manager approval or revision before treating generated solutions as approved knowledge.
- **Historical traceability:** Preserve which customer implementation used a particular solution.
- **Freshness validation:** Verify historical solutions against current product information before recommending them.
- **Feedback-driven improvement:** Use negative feedback to identify gaps and improve the system.
- **Operational efficiency:** Use query caching to avoid unnecessary repeated processing.
- **Knowledge evolution:** Allow outdated features and approaches to be identified and updated.

## 14. End-to-End Architecture Summary

### Knowledge Ingestion and Approval

Source systems → Transcript/ticket/document processing → Use-case-generation agent → Supermemory retrieval for product context → Structured use cases and solutions → Implementation Manager review → Approved solutions stored in Supermemory.

### User Query and Solution Retrieval

User question → Query cache → If cache hit meets the relevance threshold, return the cached answer subject to freshness requirements → Otherwise, retrieve relevant approved solutions from Supermemory → Validate against current connected sources → Generate the answer → Capture user feedback.

### Quality Improvement

Negative feedback → Feedback-reason analysis → Validator agent → Failure classification → Admin review queue → Corrective action on sources, knowledge, skills, retrieval logic, or caching.

## 15. Business Value

- Reduces dependence on individual employees' undocumented knowledge.
- Makes previously solved implementation problems discoverable.
- Reduces duplicated research and problem-solving across Implementation Managers.
- Improves consistency in customer implementation approaches.
- Preserves institutional knowledge when employees change roles or leave.
- Helps teams distinguish historical solutions from current recommendations.
- Makes AI-generated implementation knowledge subject to human validation.
- Creates a systematic process for investigating incorrect answers.
- Improves search efficiency through caching and targeted retrieval.
- Builds a reusable implementation intelligence layer across customer projects.

## 16. Important Context for Future LLM Discussions

When discussing Atlas, retain these distinctions:

- Atlas is an implementation knowledge and solution intelligence system, not merely a chatbot.
- Its inputs include conversations, support tickets, internal discussions, documentation, and Rocketlane project data.
- Supermemory provides the indexed knowledge layer; it is not the entire Atlas application.
- The use-case-generation agent and the backend user-query agent have distinct responsibilities.
- Generated solutions can originate from customer discussions or be inferred from the knowledge base. These must not be conflated.
- Implementation Manager approval is the human validation step that turns generated content into approved reusable knowledge.
- Approved historical solutions are retrieved first and then checked against current knowledge where relevant.
- Historical success does not automatically mean that a solution is currently supported.
- Query caching uses a 95% relevance threshold as described in the current design, but current-information changes must still be handled.
- Negative feedback drives a separate validation and administrative improvement workflow.
- The system's goal is to create a continuously improving organizational repository of implementation knowledge.

## 17. Details Not Yet Specified

Do not invent these details in future discussions unless they are subsequently provided:

- Exact embedding model and embedding configuration.
- Exact vector database or underlying Supermemory storage implementation.
- Detailed ingestion scheduling, event triggers, and retry mechanisms.
- Exact source-specific API and authentication configurations.
- Formal schema for a use case, solution, or approved knowledge record.
- Exact ranking and freshness-validation algorithms.
- Exact cache storage technology, expiration policy, and invalidation implementation.
- Exact agent evaluation metrics and production accuracy.
- Exact permission model, tenant isolation, and data retention policies.
- Whether all source integrations operate in real time or through scheduled synchronization.

These are open technical details, not confirmed implementation capabilities.

## 18. One-Sentence Description

Atlas is an AI-powered implementation knowledge system that converts customer conversations, support tickets, internal discussions, documentation, and project data into reusable, human-approved solutions, then retrieves and validates those solutions against current product knowledge to help implementation teams solve customer problems consistently and efficiently.
