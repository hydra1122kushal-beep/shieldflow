import io
import os
import re
from datetime import datetime
import pandas as pd

try:
    from presidio_analyzer import AnalyzerEngine
    PRESIDIO_ENGINE = AnalyzerEngine()
except Exception:
    PRESIDIO_ENGINE = None

APPROVED_DESTINATIONS = {
    "public_policy.txt": "all-staff@company.com",
    "project_plan.txt": "team@company.com",
    "customer_cards.txt": "finance@company.com",
    "finance_report.txt": "finance@company.com",
    "hr_records.txt": "hr@company.com",
}

SENSITIVE_COL_REGEX = re.compile(
    r"(account|customer_id|balance|ssn|pan|card|credit_card|aadhaar|salary|routing|iban|phone|email|cvv)",
    re.IGNORECASE,
)

def load_mock_file(filename, base_dir="mock_files"):
    path = os.path.join(base_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    return text, len(text.encode("utf-8"))

def analyze_content(filename, text):
    reasons = []
    score = 0
    if "[CONFIDENTIAL]" in text:
        score += 35
        reasons.append((35, "Tagged [CONFIDENTIAL] security label"))
    if "[FINANCIAL_DATA]" in text:
        score += 35
        reasons.append((35, "Tagged [FINANCIAL_DATA] restricted treasury label"))
    if "[INTERNAL ONLY]" in text:
        score += 25
        reasons.append((25, "Tagged [INTERNAL ONLY] sensitivity label"))

    cards = re.findall(r"\b(?:\d{4}[-\s]?){3}\d{4}\b", text)
    if cards:
        pts = min(65, len(cards) * 4 + 5)
        score += pts
        reasons.append((pts, f"{len(cards)} credit card numbers detected (Presidio CREDIT_CARD)"))

    ssns = re.findall(r"\b\d{3}-\d{2}-\d{4}\b", text)
    if ssns:
        pts = min(55, len(ssns) * 4 + 7)
        score += pts
        reasons.append((pts, f"{len(ssns)} SSN numbers detected (Presidio US_SSN)"))

    pans = re.findall(r"\b[A-Z]{5}\d{4}[A-Z]\b", text)
    if pans:
        pts = min(50, len(pans) * 4 + 8)
        score += pts
        reasons.append((pts, f"{len(pans)} Indian PAN numbers detected (Presidio IN_PAN)"))

    accts = re.findall(r"\bACCT-\d{6,14}\b", text)
    abas = re.findall(r"\bABA-\d{9}\b", text)
    if accts or abas:
        pts = min(60, (len(accts) + len(abas)) * 3 + 5)
        score += pts
        reasons.append((pts, f"{len(accts)} bank accounts and {len(abas)} routing numbers"))

    if filename.lower().endswith(".csv") or "," in text:
        try:
            df = pd.read_csv(io.StringIO(text))
            sens_cols = [str(c) for c in df.columns if SENSITIVE_COL_REGEX.search(str(c))]
            if sens_cols:
                pts = min(45, len(sens_cols) * 10 + 10)
                score += pts
                reasons.append((pts, f"Pandas DataFrame detected sensitive columns {sens_cols} ({len(df)} rows)"))
        except Exception:
            pass

    if PRESIDIO_ENGINE is not None:
        try:
            hits = PRESIDIO_ENGINE.analyze(text=text[:5000], language="en")
            if hits and score == 0:
                pts = min(50, len(hits) * 5)
                score += pts
                reasons.append((pts, f"Presidio Analyzer matched {len(hits)} PII entities"))
        except Exception:
            pass

    phones = re.findall(r"\+\d{1,2}-\d{3}-\d{3}-\d{4}\b", text)
    if phones:
        pts = min(18, round(len(phones) * 1.5))
        score += pts
        reasons.append((pts, f"{len(phones)} employee phone numbers"))

    return min(100, score), reasons

def evaluate_transfer(user, channel, filename, destination, user_avg_bytes, w1=0.5, w2=0.5, raw_text=None):
    if raw_text is not None:
        text = raw_text
        size_bytes = len(text.encode("utf-8"))
    else:
        text, size_bytes = load_mock_file(filename)
    approved = APPROVED_DESTINATIONS.get(filename, "finance@company.com")
    content_score, content_reasons = analyze_content(filename, text)

    behaviour_score = 0
    beh_reasons = []
    hard_violation = False

    if channel == "Email":
        if destination == approved:
            beh_reasons.append((0, f"Approved destination ({approved})"))
        elif destination.endswith("@company.com"):
            behaviour_score += 10
            beh_reasons.append((10, f"Other internal address ({destination}) instead of {approved}"))
        elif "trusted-partner.com" in destination:
            behaviour_score += 40
            beh_reasons.append((40, f"Verified partner ({destination}) differs from {approved}"))
        elif "gmail.com" in destination or "external" in destination:
            behaviour_score += 90
            hard_violation = True
            beh_reasons.append((90, f"VIOLATION: External/personal email ({destination}) instead of {approved}"))
    else:
        # SAY NO TO PENDRIVE: Authorised Pen Drive removed. Immediate 100-risk violation!
        destination = "PenDrive-USB-Inserted (Strictly Prohibited)"
        behaviour_score = 100
        hard_violation = True
        beh_reasons.append((100, "SAY NO TO PENDRIVE: Immediate alert on Pen Drive / USB insertion (0 authorised pen drives allowed)"))

    ratio = round(size_bytes / max(1, user_avg_bytes), 1)
    if ratio >= 3.0:
        pts = 25 if ratio >= 5.0 else 20
        behaviour_score += pts
        beh_reasons.append((pts, f"File size {ratio}x user average ({size_bytes} B vs {user_avg_bytes} B)"))

    behaviour_score = min(100, behaviour_score)
    leak_score = 100 if channel == "USB" else min(100, round(content_score * w1 + behaviour_score * w2))

    if channel == "USB" or leak_score >= 71 or hard_violation:
        tier = "BLOCK"
    elif leak_score >= 31:
        tier = "REVIEW"
    else:
        tier = "ALLOW"

    all_reasons = sorted([r for r in content_reasons + beh_reasons if r[0] > 0], key=lambda x: -x[0])
    if not all_reasons:
        all_reasons = [(0, f"Public document sent to approved destination ({approved})")]

    return {
        "time": datetime.now().strftime("%H:%M:%S"),
        "user": user,
        "channel": channel,
        "file": filename,
        "destination": destination,
        "size": size_bytes,
        "content_score": content_score,
        "behaviour_score": behaviour_score,
        "score": leak_score,
        "action": tier,
        "hard_violation": hard_violation,
        "reasons": [r[1] for r in all_reasons],
    }
