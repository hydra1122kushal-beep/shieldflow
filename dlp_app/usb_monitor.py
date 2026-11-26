import subprocess
import time
import json

# 1. Your Authorized Device (TECNO POVA 6 Neo 5G via Charger Cable)
AUTHORIZED_DEVICES = [
    {
        "name": "TECNO POVA 6 Neo 5G",
        "vid": "0E8D",
        "pid": "2008",
        "serial": "13161314A6041832"
    }
]

# 2. Internal Laptop Hardware to Ignore (Camera, Bluetooth, Root Hubs)
IGNORED_PREFIXES = (
    "USB\\ROOT_HUB",
    "USB\\VID_04CA&PID_7070",  # Integrated Camera / Composite
    "USB\\VID_8087&PID_0A2B",  # Intel Wireless Bluetooth
)

def get_connected_usb_devices():
    ps_command = (
        "Get-PnpDevice -PresentOnly | "
        "Where-Object { $_.InstanceId -match '^USB\\\\' } | "
        "Select-Object FriendlyName, InstanceId | ConvertTo-Json"
    )
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_command],
        capture_output=True, text=True
    )
    if not result.stdout.strip():
        return []
    data = json.loads(result.stdout)
    return data if isinstance(data, list) else [data]

def parse_instance_id(instance_id):
    # Example format: USB\VID_0E8D&PID_2008\13161314A6041832
    parts = instance_id.split("\\")
    if len(parts) < 3 or "VID_" not in parts[1] or "PID_" not in parts[1]:
        return None, None, None
    
    vid_pid = parts[1].split("&")
    vid = vid_pid[0].replace("VID_", "")
    pid = vid_pid[1].replace("PID_", "")
    serial = parts[2]
    return vid, pid, serial

def is_authorized(vid, pid, serial):
    for dev in AUTHORIZED_DEVICES:
        if (dev["vid"].lower() == vid.lower() and
            dev["pid"].lower() == pid.lower() and
            dev["serial"].lower() == serial.lower()):
            return True
    return False

def block_device(instance_id):
    ps_block = f'Disable-PnpDevice -InstanceId "{instance_id}" -Confirm:$false'
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_block], capture_output=True)

def monitor_usb():
    print("=== USB Access Control Active (Press Ctrl+C to stop) ===\n")
    seen_devices = set()

    while True:
        devices = get_connected_usb_devices()
        current_ids = set()

        for dev in devices:
            inst_id = dev.get("InstanceId", "")
            name = dev.get("FriendlyName", "Unknown USB Device")
            current_ids.add(inst_id)

            # Skip internal laptop components or already-processed devices
            if inst_id.startswith(IGNORED_PREFIXES) or inst_id in seen_devices:
                continue

            vid, pid, serial = parse_instance_id(inst_id)
            if not vid:
                continue

            seen_devices.add(inst_id)

            if is_authorized(vid, pid, serial):
                print(f"[AUTHORIZED]   {name}")
                print(f"               VID: {vid} | PID: {pid} | Serial: {serial}")
                print("               Status: Access Granted\n")
            else:
                print(f"[UNAUTHORIZED] {name}")
                print(f"               VID: {vid} | PID: {pid} | Serial: {serial}")
                print("               Action: Blocking device now...")
                block_device(inst_id)
                print("               Status: BLOCKED!\n")

        # Reset unplugged devices so re-plugging triggers a fresh check
        seen_devices = seen_devices.intersection(current_ids)
        time.sleep(1.5)

if __name__ == "__main__":
    monitor_usb()
