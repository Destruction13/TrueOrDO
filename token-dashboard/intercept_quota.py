"""
mitmproxy addon script:
Watches for requests to cloudcode-pa.googleapis.com and logs the full URL + Authorization header + decoded body.
Run with:
    mitmdump -s intercept_quota.py --listen-port 8080 --ssl-insecure
"""

import json
import re


def request(flow):
    host = flow.request.host
    if 'cloudcode-pa' in host or 'googleapis' in host:
        url = flow.request.pretty_url
        auth = flow.request.headers.get("Authorization", "(none)")[:80]
        content_type = flow.request.headers.get("Content-Type", "")
        
        print(f"\n{'='*60}")
        print(f"[REQUEST] {flow.request.method} {url}")
        print(f"Auth: {auth}")
        print(f"Content-Type: {content_type}")
        
        if flow.request.content:
            # gRPC-Web: skip 5-byte frame header
            body = flow.request.content
            if len(body) > 5:
                body = body[5:]
            readable = ''.join(chr(b) if 32 <= b < 127 else '.' for b in body)
            print(f"Body (ASCII): {readable[:300]}")
        
        # Save to a file for use in server.js
        with open("captured_api.txt", "a", encoding="utf-8") as f:
            f.write(f"URL: {url}\n")
            f.write(f"Auth: {auth}\n\n")


def response(flow):
    host = flow.request.host
    if 'cloudcode-pa' in host or 'googleapis' in host:
        print(f"\n[RESPONSE] {flow.response.status_code} for {flow.request.pretty_url}")
        
        body = flow.response.content
        # Skip gRPC-Web frame prefix (5 bytes) if present
        if body and len(body) > 5 and body[0] == 0:
            body = body[5:]
        
        # Try to find readable strings
        readable = ''.join(chr(b) if 32 <= b < 127 else '·' for b in body)
        cleaned = re.sub(r'·{3,}', ' … ', readable)
        print(f"Body (ASCII): {cleaned[:500]}")
        
        with open("captured_api.txt", "a", encoding="utf-8") as f:
            f.write(f"RESPONSE {flow.response.status_code}: {cleaned[:300]}\n\n")
