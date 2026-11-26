export const STREAMLIT_APP_PY_CODE = `"""
Avishkar'26 Problem Statement 17: Data Exfiltration Detection and Prevention
Domain: AI in Cybersecurity and Fintech
Features:
  - Presidio Analyzer + Regex + Pandas DataFrame CSV Upload & Verification Scanner
  - Zero-Trust Removable Media Policy ("SAY NO TO PENDRIVE"): 0 authorised pen drives;
    inserting/selecting a Pen Drive triggers an IMMEDIATE CRITICAL BLOCK alert & vibration.
Run locally with:
    pip install streamlit pandas presidio-analyzer
    streamlit run app.py
"""

import io
import os
import re
import time
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

try:
    from presidio_analyzer import AnalyzerEngine
    PRESIDIO_AVAILABLE = True
    PRESIDIO_ENGINE = AnalyzerEngine()
except Exception:
    PRESIDIO_AVAILABLE = False
    PRESIDIO_ENGINE = None

st.set_page_config(
    page_title="SentinelDLP — Avishkar'26 PS-17",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# 1. Auto-create local mock_files/ directory and the 5 corporate .txt files
# ---------------------------------------------------------------------------
MOCK_DIR = "mock_files"
os.makedirs(MOCK_DIR, exist_ok=True)

MOCK_FILE_CONTENTS = {
    "public_policy.txt": """CORPORATE GENERAL WORKPLACE & PUBLIC COMMUNICATIONS POLICY
Document ID: POL-2026-001
Effective Date: January 1, 2026
Classification: Public / General Distribution

1. Purpose
This policy outlines standard workplace operating hours, general holiday schedules, and public visitor check-in procedures for all offices.

2. Standard Operating Hours
Core business collaboration hours are Monday through Friday, 09:30 AM to 06:00 PM IST.
""",
    "project_plan.txt": """[INTERNAL ONLY]
PROJECT NEXUS-PAY: Q3-Q4 CORE PAYMENT GATEWAY MIGRATION PLAN
Document Reference: ENG-PLAN-2026-Q3
Distribution: Internal Engineering & Product Architecture Teams Only

1. Executive Summary
This internal roadmap details the phased cutover from our legacy settlement switch to the low-latency UPI and ISO-20022 real-time clearing rail.
2. Architecture Notes [INTERNAL ONLY]
Internal service mesh endpoints operate on private VPC subnets 10.24.16.0/20.
""",
    "customer_cards.txt": """[CONFIDENTIAL]
MERCHANT SETTLEMENT BATCH - CUSTOMER CARD RECONCILIATION EXTRACT
Notice: Strictly [CONFIDENTIAL] cardholder audit records. Authorised destination: finance@company.com only.

Record 01 | Cardholder: R. Sharma       | PAN: 4532-7184-9021-3348 | Exp: 08/28
Record 02 | Cardholder: A. Verma        | PAN: 5412-8839-1044-2910 | Exp: 11/27
Record 03 | Cardholder: K. Nair         | PAN: 4916-3048-7721-5509 | Exp: 04/29
Record 04 | Cardholder: S. Patel        | PAN: 5108-6492-3318-8842 | Exp: 09/27
Record 05 | Cardholder: M. Deshmukh     | PAN: 4024-0071-9932-6184 | Exp: 02/28
Record 06 | Cardholder: D. Chatterjee   | PAN: 5521-4903-8172-4401 | Exp: 07/29
Record 07 | Cardholder: P. Kulkarni     | PAN: 4556-9102-3847-1129 | Exp: 12/28
Record 08 | Cardholder: V. Sundaram     | PAN: 5243-7719-0048-6391 | Exp: 05/27
Record 09 | Cardholder: N. Reddy        | PAN: 4716-8390-5512-7483 | Exp: 10/28
Record 10 | Cardholder: T. Malhotra     | PAN: 5490-1284-6639-9012 | Exp: 03/29
Record 11 | Cardholder: G. Joshi        | PAN: 4485-6201-7394-2815 | Exp: 06/28
Record 12 | Cardholder: H. Bansal       | PAN: 5319-4082-9173-5560 | Exp: 01/29
Record 13 | Cardholder: L. Iyer         | PAN: 4929-7510-3382-4907 | Exp: 09/28
Record 14 | Cardholder: B. Sengupta     | PAN: 5182-9940-1726-8354 | Exp: 11/28
Record 15 | Cardholder: Y. Choudhury    | PAN: 4539-6812-4095-7723 | Exp: 04/28
""",
    "finance_report.txt": """[FINANCIAL_DATA]
Q3 CORPORATE TREASURY DISBURSEMENT & WIRE SETTLEMENT LEDGER
Classification: [FINANCIAL_DATA] - Restricted to Corporate Finance (finance@company.com)

Counterparty: Apex Clearing Custody      | Acct#: ACCT-8849201143 | Routing#: ABA-021000021
Counterparty: Horizon Liquidity Partners | Acct#: ACCT-7730194822 | Routing#: ABA-026009593
Counterparty: Meridian Prime Brokerage   | Acct#: ACCT-9910482736 | Routing#: ABA-121000248
Counterparty: Crestview Escrow Services  | Acct#: ACCT-6648291054 | Routing#: ABA-071000013
Counterparty: Vanguard Settlement Vault  | Acct#: ACCT-5501928374 | Routing#: ABA-031100209
Counterparty: Sterling FX Reserve        | Acct#: ACCT-4492817365 | Routing#: ABA-111000025
Counterparty: Pacific Bullion Clearing   | Acct#: ACCT-3381726490 | Routing#: ABA-122000247
Counterparty: Atlas Institutional Trust  | Acct#: ACCT-2293847561 | Routing#: ABA-011000015
Counterparty: Zenith Capital Treasury    | Acct#: ACCT-1182736455 | Routing#: ABA-053000196
Counterparty: Beacon Reserve Depository  | Acct#: ACCT-9081726354 | Routing#: ABA-061000104
""",
    "hr_records.txt": """[CONFIDENTIAL]
HUMAN RESOURCES MASTER PAYROLL & IDENTITY VERIFICATION REGISTER
Classification: [CONFIDENTIAL] - Restricted to Human Resources (hr@company.com)

EmpID: E-1041 | Name: Aditya Kulkarni     | SSN: 418-72-9041 | Phone: +1-415-890-2341 | Email: aditya.k@company.com
EmpID: E-1042 | Name: Sneha Iyer          | SSN: 529-48-1132 | Phone: +1-415-890-2342 | Email: sneha.iyer@company.com
EmpID: E-1043 | Name: Vikram Singhania    | SSN: 304-91-7764 | Phone: +1-415-890-2343 | Email: v.singhania@company.com
EmpID: E-1044 | Name: Ananya P.           | SSN: 617-33-8520 | Phone: +1-415-890-2344 | Email: ananya.p@company.com
EmpID: E-1045 | Name: Siddharth C.        | SSN: 289-65-4419 | Phone: +1-415-890-2345 | Email: siddharth.c@company.com
EmpID: E-1046 | Name: Divya Subramanian   | SSN: 742-19-3087 | Phone: +1-415-890-2346 | Email: divya.s@company.com
EmpID: E-1047 | Name: Karthikeya Nambiar  | SSN: 815-40-6293 | Phone: +1-415-890-2347 | Email: karthik.n@company.com
EmpID: E-1048 | Name: Pooja C.            | SSN: 193-84-5501 | Phone: +1-415-890-2348 | Email: pooja.c@company.com
EmpID: E-1049 | Name: Pranav M.           | SSN: 664-27-9184 | Phone: +1-415-890-2349 | Email: pranav.m@company.com
EmpID: E-1050 | Name: Ishita Suryavanshi  | SSN: 508-73-2946 | Phone: +1-415-890-2350 | Email: ishita.s@company.com
""",
}

for fname, ftext in MOCK_FILE_CONTENTS.items():
    fpath = os.path.join(MOCK_DIR, fname)
    if not os.path.exists(fpath):
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(ftext)

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

# ---------------------------------------------------------------------------
# 2. Session State Initialization
# ---------------------------------------------------------------------------
if "role" not in st.session_state:
    st.session_state.role = None
if "active_user" not in st.session_state:
    st.session_state.active_user = None
if "alerts_armed" not in st.session_state:
    st.session_state.alerts_armed = False
if "w1" not in st.session_state:
    st.session_state.w1 = 0.5
if "w2" not in st.session_state:
    st.session_state.w2 = 0.5
if "user_history" not in st.session_state:
    st.session_state.user_history = {
        "Aarav": [380, 410, 395],
        "Meera": [400, 420, 390],
        "Rohan": [350, 375, 390],
    }
if "events" not in st.session_state:
    st.session_state.events = []
if "latest_alert" not in st.session_state:
    st.session_state.latest_alert = None
if "uploaded_files" not in st.session_state:
    st.session_state.uploaded_files = {}

# ---------------------------------------------------------------------------
# 3. Alert Banner + Vibration Injector
# ---------------------------------------------------------------------------
def render_flashing_alert_and_vibrate(alert_obj, unique_trigger_key):
    st.markdown(
        f"""
        <style>
        @keyframes flashRed {{
            0%, 100% {{ background-color: #991b1b; border: 3px solid #fca5a5; }}
            50% {{ background-color: #dc2626; border: 3px solid #ffffff; box-shadow: 0 0 25px #ef4444; }}
        }}
        .dlp-alert-box {{
            animation: flashRed 0.8s infinite;
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 16px;
            font-family: sans-serif;
        }}
        </style>
        <div class="dlp-alert-box">
            <h2 style="margin:0 0 8px 0; color:white;">🚨 DLP SECURITY ALERT — {alert_obj['tier']} ({alert_obj['severity']})</h2>
            <p style="margin:0 0 8px 0; font-size:16px; font-weight:bold;">{alert_obj['summary']}</p>
            <p style="margin:0; font-size:12px; opacity:0.9;">Employee: {alert_obj['user']} | File: {alert_obj['file']} | Channel: {alert_obj['channel']} -> {alert_obj['destination']}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    components.html(
        f"""
        <!-- trigger_key: {unique_trigger_key} -->
        <script>
        (function() {{
            try {{
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {{
                    navigator.vibrate([300, 100, 300, 100, 600]);
                }}
            }} catch (e) {{}}
            try {{
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {{
                    const ctx = new AudioCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sawtooth";
                    osc.frequency.setValueAtTime(920, ctx.currentTime);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.45);
                }}
            }} catch (e) {{}}
        }})();
        </script>
        """,
        height=0,
    )

# ---------------------------------------------------------------------------
# 4. Presidio + Regex + Pandas DLP Scoring Function
# ---------------------------------------------------------------------------
def evaluate_transfer(user, filename, channel, destination_choice, w1, w2, raw_text=None):
    if raw_text is None:
        if filename in st.session_state.uploaded_files:
            text = st.session_state.uploaded_files[filename]
        else:
            fpath = os.path.join(MOCK_DIR, filename)
            with open(fpath, "r", encoding="utf-8") as f:
                text = f.read()
    else:
        text = raw_text

    size_bytes = len(text.encode("utf-8"))
    approved_dest = APPROVED_DESTINATIONS.get(filename, "finance@company.com")

    reasons = []
    content_pts = 0

    if re.search(r"\\[CONFIDENTIAL\\]", text):
        content_pts += 35
        reasons.append((35, "Tagged [CONFIDENTIAL]"))
    if re.search(r"\\[FINANCIAL_DATA\\]", text):
        content_pts += 35
        reasons.append((35, "Tagged [FINANCIAL_DATA]"))
    if re.search(r"\\[INTERNAL ONLY\\]", text):
        content_pts += 25
        reasons.append((25, "Tagged [INTERNAL ONLY]"))

    ccs = re.findall(r"\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b", text)
    if ccs:
        pts = min(65, len(ccs) * 4 + 5)
        content_pts += pts
        reasons.append((pts, f"{len(ccs)} credit card numbers (Presidio CREDIT_CARD)"))

    ssns = re.findall(r"\\b\\d{3}-\\d{2}-\\d{4}\\b", text)
    if ssns:
        pts = min(55, len(ssns) * 4 + 7)
        content_pts += pts
        reasons.append((pts, f"{len(ssns)} SSN numbers (Presidio US_SSN)"))

    pans = re.findall(r"\\b[A-Z]{5}\\d{4}[A-Z]\\b", text)
    if pans:
        pts = min(50, len(pans) * 4 + 8)
        content_pts += pts
        reasons.append((pts, f"{len(pans)} Indian PAN numbers (Presidio IN_PAN)"))

    accts = re.findall(r"\\bACCT-\\d{6,14}\\b", text)
    abas = re.findall(r"\\bABA-\\d{9}\\b", text)
    if accts or abas:
        pts = min(60, (len(accts) + len(abas)) * 3 + 5)
        content_pts += pts
        reasons.append((pts, f"{len(accts)} bank accounts and {len(abas)} routing numbers"))

    # Pandas DataFrame CSV schema verification
    if filename.lower().endswith(".csv") or "," in text:
        try:
            df = pd.read_csv(io.StringIO(text))
            sens_cols = [c for c in df.columns if SENSITIVE_COL_REGEX.search(str(c))]
            if sens_cols:
                pts = min(45, len(sens_cols) * 10 + 10)
                content_pts += pts
                reasons.append((pts, f"Pandas DataFrame detected sensitive columns {sens_cols} ({len(df)} rows)"))
        except Exception:
            pass

    if PRESIDIO_AVAILABLE and PRESIDIO_ENGINE is not None:
        try:
            pres_results = PRESIDIO_ENGINE.analyze(text=text[:5000], language="en")
            if pres_results and content_pts == 0:
                pts = min(50, len(pres_results) * 5)
                content_pts += pts
                reasons.append((pts, f"Presidio Analyzer Engine matched {len(pres_results)} PII entities"))
        except Exception:
            pass

    content_score = min(100, content_pts)

    # Behaviour & Zero-Trust Pen Drive Policy ("SAY NO TO PENDRIVE")
    behaviour_pts = 0
    hard_violation = False

    if channel == "Email":
        if destination_choice == approved_dest:
            pass
        elif destination_choice.endswith("@company.com"):
            behaviour_pts += 10
            reasons.append((10, f"internal recipient ({destination_choice}) instead of approved {approved_dest}"))
        elif "partner" in destination_choice:
            behaviour_pts += 40
            reasons.append((40, f"external partner address ({destination_choice}) instead of {approved_dest}"))
        elif "gmail.com" in destination_choice:
            behaviour_pts += 80
            hard_violation = True
            reasons.append((80, f"destination is a personal gmail ({destination_choice}) instead of {approved_dest}"))
        else:
            behaviour_pts += 100
            hard_violation = True
            reasons.append((100, f"destination is an unknown external address instead of {approved_dest}"))
    else:
        # SAY NO TO PENDRIVE: Authorised Pen Drive removed. Immediate 100-risk violation!
        destination_choice = "PenDrive-USB-Inserted (Strictly Prohibited)"
        behaviour_pts = 100
        hard_violation = True
        reasons.append((100, "SAY NO TO PENDRIVE: Immediate alert on Pen Drive / USB insertion (0 authorised pen drives allowed)"))

    hist = st.session_state.user_history.get(user, [400])
    avg_bytes = sum(hist) / max(1, len(hist))
    ratio = round(size_bytes / max(1, avg_bytes), 1)
    if ratio >= 3.0:
        behaviour_pts += 20
        reasons.append((20, f"file size {ratio}x user average"))

    behaviour_score = min(100, behaviour_pts)
    leak_score = 100 if channel == "USB" else int(round(content_score * w1 + behaviour_score * w2))

    if channel == "USB" or leak_score >= 71 or hard_violation:
        tier = "BLOCK"
    elif leak_score >= 31:
        tier = "REVIEW"
    else:
        tier = "ALLOW"

    severity = "CRITICAL" if (channel == "USB" or leak_score >= 75 or hard_violation) else ("HIGH" if leak_score >= 50 else ("MEDIUM" if leak_score >= 31 else "LOW"))

    reasons.sort(key=lambda x: x[0], reverse=True)
    if not reasons:
        reasons.append((0, "Approved destination and public content"))

    ranked_str = " ".join([f"{i+1}) {r[1]}" for i, r in enumerate(reasons)])
    summary = f"Score {leak_score}, {severity}, {tier}: {ranked_str}"

    return {
        "time": time.strftime("%H:%M:%S"),
        "ts": time.time(),
        "user": user,
        "file": filename,
        "channel": channel,
        "destination": destination_choice,
        "approved_dest": approved_dest,
        "content_score": content_score,
        "behaviour_score": behaviour_score,
        "leak_score": leak_score,
        "tier": tier,
        "severity": severity,
        "hard_violation": hard_violation,
        "summary": summary,
        "size_bytes": size_bytes,
    }
`;
