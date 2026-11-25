import os
import re
from datetime import datetime

APPROVED_DESTINATIONS = {
    "public_policy.txt": "all-staff@company.com",
    "project_plan.txt": "team@company.com",
    "customer_cards.txt": "finance@company.com",
    "finance_report.txt": "finance@company.com",
    "hr_records.txt": "hr@company.com",
}

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
        reasons.append((pts, f"{len(cards)} credit card numbers detected"))

    ssns = re.findall(r"\b\d{3}-\d{2}-\d{4}\b", text)
    if ssns:
        pts = min(55, len(ssns) * 4 + 7)
        score += pts
        reasons.append((pts, f"{len(ssns)} SSN numbers detected"))

    accts = re.findall(r"\bACCT-\d{8,12}\b", text)
    abas = re.findall(r"\bABA-\d{9}\b", text)
    if accts or abas:
        pts = min(60, (len(accts) + len(abas)) * 3 + 5)
        score += pts
        reasons.append((pts, f"{len(accts)} bank accounts and {len(abas)} routing numbers"))

    phones = re.findall(r"\+\d{1,2}-\d{3}-\d{3}-\d{4}\b", text)
    if phones:
        pts = min(18, round(len(phones) * 1.5))
        score += pts
        reasons.append((pts, f"{len(phones)} employee phone numbers"))

    return min(100, score), reasons

def evaluate_transfer(user, channel, filename, destination, user_avg_bytes, w1=0.5, w2=0.5):
    text, size_bytes = load_mock_file(filename)
    approved = APPROVED_DESTINATIONS[filename]
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
        if destination == "Registered-USB-01":
            behaviour_score += 20
            beh_reasons.append((20, "Copied to Registered-USB-01"))
        else:
            behaviour_score += 100
            hard_violation = True
            beh_reasons.append((100, f"VIOLATION: Unregistered USB ({destination})"))

    ratio = round(size_bytes / max(1, user_avg_bytes), 1)
    if ratio >= 3.0:
        pts = 25 if ratio >= 5.0 else 20
        behaviour_score += pts
        beh_reasons.append((pts, f"File size {ratio}x user average ({size_bytes} B vs {user_avg_bytes} B)"))

    behaviour_score = min(100, behaviour_score)
    leak_score = min(100, round(content_score * w1 + behaviour_score * w2))

    if leak_score >= 71 or hard_violation:
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
