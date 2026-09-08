# AI Visual Interviewer — LLM Training & Customization Foundation

Welcome to the LLM Training Data Foundation for the **AI Visual Interviewer** platform. This directory establishes the data governance, schemas, validation pipelines, and benchmark datasets for future model fine-tuning and evaluation intelligence.

---

## 1. Directory Purpose & Structure

The `training/` directory manages the end-to-end dataset lifecycle for technical interviewer dialogue and evidence-based candidate assessment models.

```text
training/
├── raw/                      # Immutable upstream source datasets (e.g. Vetta parquet)
├── curated/                  # Normalized, filtered, and deduplicated intermediate records
├── schemas/                  # Formal JSON Schemas defining example formats
│   ├── evaluation-example.schema.json
│   └── interviewer-example.schema.json
├── evaluations/              # Dataset audits, distributional reports, and benchmark metrics
│   └── vetta-analysis.json
├── rubric.json               # Official 4-dimension weighted technical evaluation rubric
├── validate_dataset.py       # Automated quality validation & anti-hallucination auditor
├── train.jsonl               # Gold verified training split
├── validation.jsonl          # Gold verified validation split
├── test.jsonl                # Gold verified hold-out test split
└── README.md                 # Training governance documentation (this file)
```

---

## 2. Dataset Tiers & Provenance Lifecycle

To prevent synthetic drift and ensure evaluation integrity, data progresses through strict tiers:

1. **Raw Data (`training/raw/`)**:
   - Upstream third-party datasets preserved in original immutable formats.
   - Never fed directly into model fine-tuning pipelines.
2. **Curated Data (`training/curated/`)**:
   - Cleaned, deduplicated, and domain-filtered candidate records.
3. **Gold / Expert Labels**:
   - High-confidence benchmark examples labeled, verified, or audited by human technical experts.
   - Verbatim evidence quotes mathematically verified against transcripts.
4. **Splits (`train.jsonl`, `validation.jsonl`, `test.jsonl`)**:
   - Partitioned datasets strictly conforming to the `evaluation-example.schema.json` schema.

---

## 3. Why Public Interview Datasets Cannot Be Blindly Fine-Tuned

Public conversational datasets (such as open-source interviewer transcripts) cannot be used as-is for training technical evaluation engines because:
- **No Verbatim Evidence Requirement**: Public sets often award arbitrary ratings without tying scores to verbatim transcript quotes.
- **Mismatched Rubrics**: Public datasets use inconsistent grading criteria (e.g. generic sentiment or politeness) rather than standardized competency weights.
- **Hallucinated Ground Truth**: Blindly adopting unverified LLM responses introduces hallucinations, fake strengths, and incorrect technical assumptions into the training distribution.

> [!IMPORTANT]
> **Dataset Provenance Notice:**
> The Vetta dataset currently stored in `training/raw` is source material for interviewer/question-generation behavior, not automatically approved evaluator training data.

---

## 4. Interviewer vs. Evaluator Training Data

Our LLM architecture separates two distinct models/tasks:

| Attribute | Interviewer Model | Evaluator Model |
| :--- | :--- | :--- |
| **Primary Goal** | Natural technical question delivery, conversational flow, adaptive probing. | Objective, evidence-based rubric scoring and gap identification. |
| **Input Schema** | `schemas/interviewer-example.schema.json` | `schemas/evaluation-example.schema.json` |
| **Input Content** | Candidate profile, target skill, difficulty, conversation history. | Candidate verbatim audio transcript, question text, rubric definition. |
| **Output** | Verbal interview prompt or follow-up question. | Scores (1.0-5.0), verbatim quotes, strengths, gaps, adaptation decision. |
| **Architecture Rule**| FSM strictly dictates *when* questions are asked; LLM only formulates natural phrasing. | Evaluator scores feed deterministic recruiter reports; LLM never makes hiring decisions. |

---

## 5. Evidence-First Scoring Requirements

Our evaluation framework enforces a **zero-hallucination evidence rule**:
1. **Verbatim Quote Verification**: Every score awarded under `ANSWERED` status must be accompanied by non-empty `direct_quotes`.
2. **Transcript Substring Guarantee**: Every string in `direct_quotes` must exist verbatim within `candidate_transcript`.
3. **Deterministic Weight Calculation**:
   $$\text{overall\_score} = 0.35 \times \text{TD} + 0.25 \times \text{PS} + 0.20 \times \text{PE} + 0.20 \times \text{CC}$$
   Any deviation $> 0.05$ is flagged as a validation failure.

---

## 6. Explicit NO_ANSWER Handling

Candidate silence, pass responses (*"I don't know"*), or empty audio submissions must **never** be assigned a competency score of `1.0`.

- **Status**: `NO_ANSWER`
- **Scores**: `technical_depth`, `problem_solving`, `practical_experience`, `communication_clarity`, and `overall_score` must all be `null`.
- **Direct Quotes**: Must be empty `[]`.
- **Rationale**: Setting scores to `null` prevents confusing an unattempted question with an attempted response demonstrating low technical competency.

---

## 7. Quality Validation Utility

The training pipeline includes `training/validate_dataset.py` to audit JSONL splits against schema, mathematical formulas, and verbatim quotes:

```bash
# Validate training split
python3 training/validate_dataset.py training/train.jsonl

# Validate validation split
python3 training/validate_dataset.py training/validation.jsonl

# Validate test split
python3 training/validate_dataset.py training/test.jsonl
```

---

## 8. Data Privacy & Anonymization

1. **Zero PII**: Training examples must not contain candidate names, emails, phone numbers, location data, or organizational references.
2. **Synthetic Identities**: All benchmark data uses standardized placeholder personas (e.g. `Candidate`).
3. **No Audio Leakage**: Raw audio recordings are stored in private S3/local storage and never bundled into public training sets.
