#!/usr/bin/env python3
import json
import sys
import os
import re

def normalize_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return " ".join(cleaned.split())

def validate_file(filepath: str, schema_path: str = "training/schemas/evaluation-example.schema.json") -> bool:
    if not os.path.exists(filepath):
        print(f"[-] File not found: {filepath}")
        return False

    print(f"[*] Validating dataset: {filepath}")
    
    schema = None
    if os.path.exists(schema_path):
        with open(schema_path, "r") as sf:
            schema = json.load(sf)
        print(f"[+] Loaded schema from {schema_path}")

    seen_ids = set()
    errors = []
    line_count = 0
    valid_count = 0

    with open(filepath, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, 1):
            line_str = line.strip()
            if not line_str:
                continue
            line_count += 1
            
            try:
                record = json.loads(line_str)
            except json.JSONDecodeError as e:
                errors.append(f"Line {idx}: Malformed JSON - {e}")
                continue

            # 1. Check Required Top-Level Keys
            required_top = [
                "example_id", "question_id", "question", "evaluated_skill",
                "difficulty", "candidate_transcript", "expected_concepts", "expert_evaluation"
            ]
            missing_top = [k for k in required_top if k not in record]
            if missing_top:
                errors.append(f"Line {idx} (ID: {record.get('example_id', 'UNKNOWN')}): Missing top-level fields: {missing_top}")
                continue

            example_id = record["example_id"]
            if example_id in seen_ids:
                errors.append(f"Line {idx}: Duplicate example_id detected: {example_id}")
            seen_ids.add(example_id)

            # 2. Check Difficulty Bounds
            diff = record.get("difficulty")
            if not isinstance(diff, int) or diff < 1 or diff > 4:
                errors.append(f"Line {idx} (ID: {example_id}): Invalid difficulty: {diff}. Must be integer between 1 and 4.")

            # 3. Check Expert Evaluation Object
            eval_obj = record.get("expert_evaluation")
            if not isinstance(eval_obj, dict):
                errors.append(f"Line {idx} (ID: {example_id}): expert_evaluation must be a dictionary.")
                continue

            required_eval = [
                "status", "technical_depth", "problem_solving", "practical_experience",
                "communication_clarity", "overall_score", "direct_quotes", "key_strengths",
                "gaps_identified", "scoring_rationale", "recommended_difficulty"
            ]
            missing_eval = [k for k in required_eval if k not in eval_obj]
            if missing_eval:
                errors.append(f"Line {idx} (ID: {example_id}): Missing expert_evaluation fields: {missing_eval}")
                continue

            status = eval_obj["status"]
            if status not in ["ANSWERED", "NO_ANSWER", "PARTIALLY_ANSWERED"]:
                errors.append(f"Line {idx} (ID: {example_id}): Invalid evaluation status: {status}")

            rec_diff = eval_obj.get("recommended_difficulty")
            if not isinstance(rec_diff, int) or rec_diff < 1 or rec_diff > 4:
                errors.append(f"Line {idx} (ID: {example_id}): Invalid recommended_difficulty: {rec_diff}. Must be 1-4.")

            # 4. Score Validation & No-Answer Invariance
            transcript = record.get("candidate_transcript", "")
            quotes = eval_obj.get("direct_quotes", [])

            td = eval_obj.get("technical_depth")
            ps = eval_obj.get("problem_solving")
            pe = eval_obj.get("practical_experience")
            cc = eval_obj.get("communication_clarity")
            overall = eval_obj.get("overall_score")

            if status == "NO_ANSWER":
                # In NO_ANSWER, all competency scores must be null
                if any(s is not None for s in [td, ps, pe, cc, overall]):
                    errors.append(f"Line {idx} (ID: {example_id}): For NO_ANSWER, all competency scores must be null (received: TD={td}, overall={overall}).")
                if len(quotes) > 0:
                    errors.append(f"Line {idx} (ID: {example_id}): For NO_ANSWER, direct_quotes must be empty (found {len(quotes)} quotes).")
            else:
                # In ANSWERED / PARTIALLY_ANSWERED, scores must be numbers between 1.0 and 5.0
                scores = [("technical_depth", td), ("problem_solving", ps), ("practical_experience", pe), ("communication_clarity", cc), ("overall_score", overall)]
                for sname, sval in scores:
                    if sval is None or not isinstance(sval, (int, float)) or sval < 1.0 or sval > 5.0:
                        errors.append(f"Line {idx} (ID: {example_id}): {sname} must be a number between 1.0 and 5.0 (got {sval}).")

                # Weighted score mathematical consistency check: 0.35*TD + 0.25*PS + 0.20*PE + 0.20*CC
                if all(isinstance(v, (int, float)) for v in [td, ps, pe, cc, overall]):
                    expected_overall = round(0.35 * td + 0.25 * ps + 0.20 * pe + 0.20 * cc, 2)
                    if abs(expected_overall - overall) > 0.05:
                        errors.append(
                            f"Line {idx} (ID: {example_id}): Inconsistent overall_score {overall}. "
                            f"Formula (0.35*{td} + 0.25*{ps} + 0.20*{pe} + 0.20*{cc}) yields {expected_overall}."
                        )

                # 5. Verbatim Evidence Quote Validation
                if not isinstance(quotes, list):
                    errors.append(f"Line {idx} (ID: {example_id}): direct_quotes must be an array of strings.")
                else:
                    norm_transcript = normalize_text(transcript)
                    for q in quotes:
                        if not isinstance(q, str) or not q.strip():
                            errors.append(f"Line {idx} (ID: {example_id}): Empty or non-string quote in direct_quotes.")
                            continue
                        norm_q = normalize_text(q)
                        if norm_q not in norm_transcript and q not in transcript:
                            errors.append(
                                f"Line {idx} (ID: {example_id}): Fabricated evidence! Quote '{q}' does not exist in candidate_transcript."
                            )

            valid_count += 1

    print("==================================================")
    print(f"Total lines processed : {line_count}")
    print(f"Valid examples         : {valid_count}")
    print(f"Errors found           : {len(errors)}")
    print("==================================================")

    if errors:
        print("Validation Failures:")
        for err in errors[:25]:
            print(f"  [X] {err}")
        if len(errors) > 25:
            print(f"  ... and {len(errors) - 25} more errors.")
        return False
    else:
        print("[+] SUCCESS: All dataset examples strictly conform to the rubric and schema.")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 training/validate_dataset.py <dataset.jsonl>")
        sys.exit(1)
    
    target_file = sys.argv[1]
    success = validate_file(target_file)
    sys.exit(0 if success else 1)
