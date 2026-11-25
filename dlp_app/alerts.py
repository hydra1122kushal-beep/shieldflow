import time
import streamlit as st
import streamlit.components.v1 as components

def render_alert_banner(event):
    reasons_html = "".join(f"<li>{r}</li>" for r in event["reasons"])
    st.markdown(
        f'''
        <style>
        @keyframes dlpFlash {{
          0%, 100% {{ background-color: #b91c1c; border-color: #fca5a5; }}
          50% {{ background-color: #dc2626; border-color: #ffffff; }}
        }}
        .dlp-alert-box {{
          animation: dlpFlash 0.85s infinite;
          color: #ffffff;
          padding: 18px 22px;
          border-radius: 10px;
          border: 2px solid #fca5a5;
          margin-bottom: 16px;
        }}
        </style>
        <div class="dlp-alert-box">
          <strong>{event["action"]} — Score {event["score"]}/100</strong><br/>
          <span>{event["user"]} | {event["channel"]} | {event["file"]} -> {event["destination"]}</span>
          <ol style="margin-top:8px;margin-bottom:0;">{reasons_html}</ol>
        </div>
        ''',
        unsafe_allow_html=True,
    )

def trigger_vibration_and_sound(key_suffix=""):
    ts = int(time.time() * 1000)
    components.html(
        f'''
        <script>
        (function() {{
          try {{
            if (navigator && navigator.vibrate) {{
              navigator.vibrate([300, 100, 300, 100, 600]);
            }}
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) {{
              var ctx = new Ctx();
              var osc = ctx.createOscillator();
              var gain = ctx.createGain();
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.12, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.35);
            }}
          }} catch (e) {{}}
        }})();
        </script>
        <div data-ts="{ts}-{key_suffix}"></div>
        ''',
        height=0,
    )
