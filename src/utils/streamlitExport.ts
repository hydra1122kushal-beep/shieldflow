export const STREAMLIT_APP_PY_CODE = `"""
Avishkar'26 Problem Statement 17: Data Exfiltration Detection and Prevention
Domain: AI in Cybersecurity and Fintech
Run locally with:
    pip install streamlit pandas
    streamlit run app.py
"""

import os
import re
import time
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="SentinelDLP — Avishkar'26 PS-17",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# 1. Auto-create local mock_files/ directory and the 5 required .txt files
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

# Approved original destination dictionary
APPROVED_DESTINATIONS = {
    "public_policy.txt": "all-staff@company.com",
    "project_plan.txt": "team@company.com",
    "customer_cards.txt": "finance@company.com",
    "finance_report.txt": "finance@company.com",
    "hr_records.txt": "hr@company.com",
}

# ---------------------------------------------------------------------------
# 2. Session State Initialization
# ---------------------------------------------------------------------------
if "role" not in st.session_state:
    st.session_state.role = None  # None | "Employee" | "Analyst"
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

# ---------------------------------------------------------------------------
# 3. Alert Banner + Vibration Injector (st.markdown & st.components.v1.html)
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
            <p style="margin:0; font-size:12px; opacity:0.9;">Employee: {alert_obj['user']} | File: {alert_obj['file']} | Channel: {alert_obj['channel']} -> {alert_obj['destination']} | Vibration works on Android Chrome.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Inject JS vibration + Web Audio beep with unique timestamp comment so it re-runs every time
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
# 4. Explainable DLP Scoring Function
# ---------------------------------------------------------------------------
def evaluate_transfer(user, filename, channel, destination_choice, w1, w2):
    fpath = os.path.join(MOCK_DIR, filename)
    with open(fpath, "r", encoding="utf-8") as f:
        text = f.read()
    size_bytes = len(text.encode("utf-8"))
    approved_dest = APPROVED_DESTINATIONS[filename]

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
        reasons.append((pts, f"{len(ccs)} credit card numbers"))

    ssns = re.findall(r"\\b\\d{3}-\\d{2}-\\d{4}\\b", text)
    if ssns:
        pts = min(55, len(ssns) * 4 + 7)
        content_pts += pts
        reasons.append((pts, f"{len(ssns)} SSN-like numbers"))

    accts = re.findall(r"\\bACCT-\\d{8,12}\\b", text)
    abas = re.findall(r"\\bABA-\\d{9}\\b", text)
    if accts or abas:
        pts = min(60, (len(accts) + len(abas)) * 3 + 5)
        content_pts += pts
        reasons.append((pts, f"{len(accts)} bank account and {len(abas)} routing numbers"))

    phones = re.findall(r"\\+\\d{1,2}-\\d{3}-\\d{3}-\\d{4}\\b", text)
    if phones:
        content_pts += 15
        reasons.append((15, f"{len(phones)} phone numbers"))

    content_score = min(100, content_pts)

    # Behaviour & Volume
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
        if "Registered-USB-01" in destination_choice:
            behaviour_pts += 20
            reasons.append((20, "copied to Registered-USB-01"))
        else:
            behaviour_pts += 100
            hard_violation = True
            reasons.append((100, "unauthorised Unknown-USB (unregistered) used"))

    hist = st.session_state.user_history.get(user, [400])
    avg_bytes = sum(hist) / max(1, len(hist))
    ratio = round(size_bytes / max(1, avg_bytes), 1)
    if ratio >= 3.0:
        behaviour_pts += 20
        reasons.append((20, f"file size {ratio}x user average"))

    behaviour_score = min(100, behaviour_pts)
    leak_score = int(round(content_score * w1 + behaviour_score * w2))

    if leak_score >= 71 or hard_violation:
        tier = "BLOCK"
    elif leak_score >= 31:
        tier = "REVIEW"
    else:
        tier = "ALLOW"

    severity = "CRITICAL" if (leak_score >= 75 or hard_violation) else ("HIGH" if leak_score >= 50 else ("MEDIUM" if leak_score >= 31 else "LOW"))

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

# ---------------------------------------------------------------------------
# 5. Sidebar Controls (Switch User, Enable Alerts, Analyst Weights)
# ---------------------------------------------------------------------------
with st.sidebar:
    st.title("🛡️ SentinelDLP")
    st.caption("Avishkar'26 Problem Statement 17")

    if st.button("🔊 Enable alerts (Arm vibration & sound)"):
        st.session_state.alerts_armed = True
        components.html(
            "<script>if('vibrate' in navigator){navigator.vibrate(100);}</script>",
            height=0,
        )
        st.success("Alerts armed! (Vibration works on Android Chrome)")

    if st.session_state.role is not None:
        st.info(f"Logged in as: **{st.session_state.active_user}** ({st.session_state.role})")
        if st.button("🔄 Switch user"):
            st.session_state.role = None
            st.session_state.active_user = None
            st.rerun()

    st.divider()
    st.subheader("Analyst Weight Tuning")
    st.session_state.w1 = st.slider("W1 (Content Weight)", 0.0, 1.0, st.session_state.w1, 0.05)
    st.session_state.w2 = st.slider("W2 (Behaviour Weight)", 0.0, 1.0, st.session_state.w2, 0.05)

# ---------------------------------------------------------------------------
# 6. Views: Landing Screen | Employee Page | Security Analyst Page
# ---------------------------------------------------------------------------
if st.session_state.role is None:
    st.header("Avishkar'26 PS-17: Data Exfiltration Detection & Prevention")
    st.write("Select a passwordless demo persona below to enter the DLP system. Tap **Enable alerts** in the sidebar first to arm mobile vibration and audio.")
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("1. Employee Page")
        emp = st.selectbox("Act as (Employee)", ["Aarav", "Meera", "Rohan"])
        if st.button("Enter as Employee", type="primary"):
            st.session_state.role = "Employee"
            st.session_state.active_user = emp
            st.rerun()
    with col2:
        st.subheader("2. Security Analyst Page")
        analyst = st.selectbox("Act as (Security Analyst)", ["Priya (SOC Lead)", "Vikram (DLP Analyst)"])
        if st.button("Enter as Security Analyst", type="primary"):
            st.session_state.role = "Analyst"
            st.session_state.active_user = analyst
            st.rerun()

elif st.session_state.role == "Employee":
    st.header(f"👤 Employee Console — Acting as {st.session_state.active_user}")

    if st.session_state.latest_alert:
        render_flashing_alert_and_vibrate(st.session_state.latest_alert, f"emp_{st.session_state.latest_alert['ts']}")

    selected_file = st.selectbox("Select Mock File (from local mock_files/)", list(MOCK_FILE_CONTENTS.keys()))
    approved = APPROVED_DESTINATIONS[selected_file]
    st.caption(f"Original (Approved) Destination for **{selected_file}**: \`{approved}\`")

    with st.expander("Preview Mock File Content"):
        with open(os.path.join(MOCK_DIR, selected_file), "r", encoding="utf-8") as f:
            st.code(f.read(), language="text")

    channel = st.radio("Select Channel (Two Actions Only)", ["Email", "USB"], horizontal=True)

    if channel == "Email":
        recipient_options = [
            approved,
            "team@company.com" if approved != "team@company.com" else "finance@company.com",
            "audit-partner@trusted-partner.com",
            "someone@gmail.com (personal_gmail)",
            "Unknown external address",
        ]
        dest_choice = st.selectbox("Action 1 — Send Email Recipient", recipient_options)
    else:
        dest_choice = st.selectbox("Action 2 — Copy to USB Device", ["Registered-USB-01", "Unknown-USB (unregistered)"])

    if st.button("Submit Transfer Check", type="primary"):
        res = evaluate_transfer(
            st.session_state.active_user,
            selected_file,
            channel,
            dest_choice,
            st.session_state.w1,
            st.session_state.w2,
        )
        st.session_state.events.insert(0, res)
        if res["tier"] == "ALLOW":
            st.session_state.latest_alert = None
            st.session_state.user_history[st.session_state.active_user].append(res["size_bytes"])
            msg = "Email Sent" if channel == "Email" else "File copied to USB"
            st.success(f"✅ {msg} — {res['summary']}")
        else:
            st.session_state.latest_alert = res
            st.error(f"🛑 Blocked / Held for review — {res['summary']}")
            st.rerun()

elif st.session_state.role == "Analyst":
    st.header(f"🛡️ Security Analyst Dashboard — {st.session_state.active_user}")

    if st.session_state.latest_alert:
        render_flashing_alert_and_vibrate(st.session_state.latest_alert, f"analyst_{st.session_state.latest_alert['ts']}")

    if not st.session_state.events:
        st.info("No transfer events recorded yet. Switch to an Employee persona to trigger Email or USB transfers.")
    else:
        df = pd.DataFrame(st.session_state.events)
        st.dataframe(
            df[["time", "user", "file", "channel", "destination", "content_score", "behaviour_score", "leak_score", "tier", "summary"]],
            use_container_width=True,
        )
`;
