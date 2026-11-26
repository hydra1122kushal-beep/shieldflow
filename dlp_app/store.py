import pandas as pd
import streamlit as st
from detector import evaluate_transfer

@st.cache_resource
def get_shared_store():
    return {"events": _seed_initial_events()}

def _seed_initial_events():
    seeds = [
        ("Aarav", "Email", "public_policy.txt", "all-staff@company.com", 435),
        ("Meera", "Email", "public_policy.txt", "all-staff@company.com", 480),
        ("Rohan", "Email", "project_plan.txt", "team@company.com", 400),
        ("Aarav", "Email", "project_plan.txt", "team@company.com", 435),
        ("Rohan", "Email", "public_policy.txt", "all-staff@company.com", 400),
        ("Rohan", "USB", "project_plan.txt", "PenDrive-USB-Inserted (Strictly Prohibited)", 400),
    ]
    return [evaluate_transfer(u, ch, fn, dst, avg, 0.5, 0.5) for u, ch, fn, dst, avg in seeds]

def get_events_df():
    store = get_shared_store()
    st.session_state["events"] = list(store["events"])
    if not store["events"]:
        return pd.DataFrame(columns=["time", "user", "channel", "file", "destination", "size", "score", "action", "reasons"])
    return pd.DataFrame(store["events"])

def add_event(event):
    store = get_shared_store()
    store["events"].insert(0, event)
    st.session_state["events"] = list(store["events"])

def reset_events():
    store = get_shared_store()
    store["events"] = []
    st.session_state["events"] = []

def get_user_avg_bytes(user):
    store = get_shared_store()
    allowed = [e["size"] for e in store["events"] if e["user"] == user and e["action"] == "ALLOW"]
    return round(sum(allowed) / len(allowed)) if allowed else 435
