import io
import pandas as pd
import streamlit as st
import plotly.express as px
from detector import APPROVED_DESTINATIONS, analyze_content, evaluate_transfer, load_mock_file
from alerts import render_alert_banner, trigger_vibration_and_sound
from store import add_event, get_events_df, get_user_avg_bytes, reset_events

st.set_page_config(page_title="SentinelDLP — Avishkar'26 PS-17", layout="wide")

st.markdown(
    '''
    <style>
    .stApp { background-color: #f6faf7; color: #0d2116; }
    section[data-testid="stSidebar"] { background-color: #ffffff; border-right: 1px solid #d6e4da; }
    .stButton > button[kind="primary"] { background-color: #15803d; border-color: #15803d; color: #ffffff; }
    </style>
    ''',
    unsafe_allow_html=True,
)

if "role" not in st.session_state:
    st.session_state["role"] = "Landing"
if "employee_name" not in st.session_state:
    st.session_state["employee_name"] = "Aarav"
if "latest_alert" not in st.session_state:
    st.session_state["latest_alert"] = None
if "uploaded_files" not in st.session_state:
    st.session_state["uploaded_files"] = {}

with st.sidebar:
    st.title("SentinelDLP")
    if st.button("Switch user"):
        st.session_state["role"] = "Landing"
        st.rerun()
    if st.button("Enable alerts", type="primary"):
        trigger_vibration_and_sound("arm")
        st.success("Audio and vibration alerts armed.")
    st.divider()
    st.error("🚫 SAY NO TO PENDRIVE: Authorised Pen Drive removed. Immediate alert on USB insertion.")
    st.divider()
    w1 = st.slider("W1 (Content Weight)", 0.0, 1.0, 0.5, 0.05)
    w2 = st.slider("W2 (Behaviour Weight)", 0.0, 1.0, 0.5, 0.05)

if st.session_state["role"] == "Landing":
    st.header("Data Exfiltration Detection & Prevention (DLP)")
    st.caption("Avishkar'26 PS-17 · Presidio + Regex + Pandas CSV Upload Scanner & Say No To Pendrive Zero-Trust Policy.")
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Employee Page")
        emp = st.selectbox("Act as Employee", ["Aarav", "Meera", "Rohan"])
        if st.button("Enter Employee Page", type="primary"):
            st.session_state["employee_name"] = emp
            st.session_state["role"] = "Employee"
            st.rerun()
    with col2:
        st.subheader("Security Analyst Page")
        if st.button("Enter Security Analyst Page", type="primary"):
            st.session_state["role"] = "Analyst"
            st.rerun()

elif st.session_state["role"] == "Employee":
    user = st.session_state["employee_name"]
    st.header(f"Employee Workstation — {user}")
    if st.session_state["latest_alert"]:
        render_alert_banner(st.session_state["latest_alert"])

    uploaded = st.file_uploader("Upload CSV or Text File for Presidio + Pandas DLP Verification", type=["csv", "tsv", "txt"])
    if uploaded is not None:
        raw_content = uploaded.getvalue().decode("utf-8", errors="replace")
        st.session_state["uploaded_files"][uploaded.name] = raw_content
        score, reasons = analyze_content(uploaded.name, raw_content)
        st.success(f"Verified '{uploaded.name}' ({len(raw_content)} bytes) — Content Risk Score: {score}/100")
        if uploaded.name.lower().endswith(".csv"):
            try:
                df_up = pd.read_csv(io.StringIO(raw_content))
                st.dataframe(df_up.head(20), use_container_width=True)
            except Exception:
                pass

    files = list(st.session_state["uploaded_files"].keys()) + list(APPROVED_DESTINATIONS.keys())
    col_form, col_preview = st.columns(2)
    with col_form:
        filename = st.selectbox("Select File (Uploaded or Mock)", files)
        raw_override = st.session_state["uploaded_files"].get(filename)
        approved = APPROVED_DESTINATIONS.get(filename, "finance@company.com")

        if st.button("🚨 Insert Pen Drive (Say No To Pendrive — Immediate Alert)"):
            avg_b = get_user_avg_bytes(user)
            result = evaluate_transfer(
                user,
                "USB",
                filename,
                "PenDrive-USB-Inserted (Strictly Prohibited)",
                avg_b,
                w1,
                w2,
                raw_text=raw_override,
            )
            add_event(result)
            st.session_state["latest_alert"] = result
            trigger_vibration_and_sound("usb_immediate")
            st.rerun()

        dest = st.selectbox(
            "Recipient Email",
            [approved, "ops-audit@company.com", "audit-partner@trusted-partner.com", "someone@gmail.com", "unknown_drop@external-unverified.net"],
        )

        if st.button("Submit Email Transfer", type="primary"):
            avg_b = get_user_avg_bytes(user)
            result = evaluate_transfer(user, "Email", filename, dest, avg_b, w1, w2, raw_text=raw_override)
            add_event(result)
            if result["action"] == "ALLOW":
                st.session_state["latest_alert"] = None
                st.success("Email Sent")
            else:
                st.session_state["latest_alert"] = result
                trigger_vibration_and_sound("emp")
                st.rerun()

    with col_preview:
        if raw_override is not None:
            text, size_b = raw_override, len(raw_override.encode("utf-8"))
        else:
            text, size_b = load_mock_file(filename)
        st.caption(f"{filename} ({size_b} bytes) · Approved: {approved}")
        st.code(text[:3000], language="text")

else:
    st.header("Security Analyst Dashboard")
    if st.session_state["latest_alert"]:
        render_alert_banner(st.session_state["latest_alert"])

    if st.button("Reset demo"):
        reset_events()
        st.session_state["latest_alert"] = None
        st.rerun()

    @st.fragment(run_every=3)
    def live_analyst_panel():
        df = get_events_df()
        c1, c2, c3 = st.columns(3)
        c1.metric("Total Events", len(df))
        c2.metric("Review Count", int((df["action"] == "REVIEW").sum()) if not df.empty else 0)
        c3.metric("Blocked Count", int((df["action"] == "BLOCK").sum()) if not df.empty else 0)

        if df.empty:
            st.info("No events recorded.")
            return

        def row_style(row):
            colors = {"ALLOW": "background-color: #ecfdf5", "REVIEW": "background-color: #fffbeb", "BLOCK": "background-color: #fef2f2"}
            return [colors.get(row["action"], "")] * len(row)

        display_cols = ["time", "user", "channel", "file", "destination", "size", "score", "action"]
        st.dataframe(df[display_cols].style.apply(row_style, axis=1), use_container_width=True)

        tab1, tab2 = st.tabs(["Alert Drill-Down", "Channel Chart"])
        with tab1:
            options = [f"{i}: {r['time']} | {r['user']} | {r['file']} ({r['action']} {r['score']})" for i, r in df.iterrows()]
            picked = st.selectbox("Select event", options)
            idx = int(picked.split(":")[0])
            ev = df.iloc[idx]
            st.write(f"**Score:** {ev['score']}/100 | **Action:** {ev['action']}")
            for r in ev["reasons"]:
                st.write(f"- {r}")
        with tab2:
            counts = df.groupby(["channel", "action"]).size().reset_index(name="attempts")
            fig = px.bar(counts, x="channel", y="attempts", color="action", barmode="stack",
                         title="Exfiltration attempts by channel",
                         color_discrete_map={"ALLOW": "#15803d", "REVIEW": "#d97706", "BLOCK": "#dc2626"})
            st.plotly_chart(fig, use_container_width=True)

    live_analyst_panel()
