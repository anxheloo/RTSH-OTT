#!/usr/bin/env python3
"""
Read-only probe of the Google Play Android Publisher API chain.

Proves, WITHOUT uploading or publishing anything:
  1. the service-account key is valid and can mint an OAuth token
  2. the Android Publisher API is enabled on the Cloud project
  3. the service account has Play Console permission on the package

Method: request a deliberately non-existent edit id. The *error we get back*
is the signal:
  404 -> authenticated + authorized + API enabled (the edit just isn't there)  = PASS
  403 "accessNotConfigured"       -> API not enabled on the Cloud project
  403 "permissionDenied"          -> service account lacks Play Console rights
  401 / invalid_grant             -> bad or revoked key

No edit is created. Nothing is written.
"""

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

KEY = sys.argv[1] if len(sys.argv) > 1 else "rtsh-ott-5016e1d0e915.json"
PKG = sys.argv[2] if len(sys.argv) > 2 else "al.rtsh.tani"
SCOPE = "https://www.googleapis.com/auth/androidpublisher"
TOKEN_URI = "https://oauth2.googleapis.com/token"


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def main() -> int:
    with open(KEY) as fh:
        sa = json.load(fh)

    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {
        "iss": sa["client_email"],
        "scope": SCOPE,
        "aud": TOKEN_URI,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = f"{b64url(json.dumps(header).encode())}.{b64url(json.dumps(claims).encode())}"

    # Sign with openssl; the private key lives in a 0600 temp file that is
    # removed in the finally block, so it never lingers on disk.
    pem = tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False)
    try:
        os.chmod(pem.name, 0o600)
        pem.write(sa["private_key"])
        pem.close()
        sig = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", pem.name],
            input=signing_input.encode(),
            capture_output=True,
            check=True,
        ).stdout
    finally:
        os.unlink(pem.name)

    assertion = f"{signing_input}.{b64url(sig)}"

    body = urllib.parse.urlencode(
        {"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion}
    ).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(TOKEN_URI, data=body)) as resp:
            token = json.load(resp)["access_token"]
    except urllib.error.HTTPError as err:
        print("FAIL  [1] token exchange rejected — key is invalid, revoked, or clock-skewed")
        print(err.read().decode()[:600])
        return 1
    print("PASS  [1] service-account key is valid — access token minted")

    url = (
        "https://androidpublisher.googleapis.com/androidpublisher/v3/"
        f"applications/{PKG}/edits/probe-nonexistent-edit-id"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        urllib.request.urlopen(req)
        print("?     [2] unexpected 200 — an edit with that id somehow exists")
        return 0
    except urllib.error.HTTPError as err:
        payload = err.read().decode()
        detail = json.loads(payload).get("error", {}) if payload.strip().startswith("{") else {}
        reason = json.dumps(detail.get("errors", detail.get("status", "")))
        # 404 (edit absent) and 400 INVALID_ARGUMENT (edit id malformed) are BOTH
        # passes: to reach either, Google had to accept the token, resolve the
        # package, and confirm the caller's permission on it. An auth or
        # API-enablement failure short-circuits with 401/403 long before this.
        if err.code == 404 or (err.code == 400 and "Invalid edit ID" in payload):
            print("PASS  [2] Android Publisher API is ENABLED on the Cloud project")
            print(f"PASS  [3] service account is AUTHORIZED on {PKG}")
            print("\n==> submit chain is READY. `eas submit -p android` will authenticate.")
            return 0
        if err.code == 403 and "accessNotConfigured" in payload:
            print("FAIL  [2] Android Publisher API is NOT ENABLED on the Cloud project")
            print("      fix: enable it at console.cloud.google.com for project", sa["project_id"])
            return 1
        if err.code in (401, 403):
            print(f"FAIL  [3] HTTP {err.code} — service account not authorized for {PKG}")
            print("      reason:", reason or payload[:400])
            return 1
        print(f"?     unexpected HTTP {err.code}: {payload[:400]}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
