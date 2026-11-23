#!/usr/bin/env python3
"""Call the Datafordeler FileDownloads API. Key from env DAFO_KEY; never printed.
Usage: dafo.py <method> key=value... [--out file]"""
import os, sys, time, urllib.request, urllib.parse, urllib.error

KEY = os.environ["DAFO_KEY"]
args = sys.argv[2:]
out = None
if "--out" in args:
    i = args.index("--out"); out = args[i + 1]; del args[i:i + 2]
params = dict(a.split("=", 1) for a in args)
url = (f"https://api.datafordeler.dk/FileDownloads/{sys.argv[1]}?" + urllib.parse.urlencode(params)
       + "&apiKey=" + urllib.parse.quote(KEY))


def red(s):
    return s.replace(KEY, "***").replace(urllib.parse.quote(KEY), "***")


t = time.time()
try:
    req = urllib.request.Request(url, headers={"User-Agent": "kort.mahoje.dk research #39"})
    r = urllib.request.urlopen(req, timeout=3600)
    code, hdr = r.status, r.headers
    if out:
        n = 0
        with open(out, "wb") as f:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                f.write(b); n += len(b)
        # read(amt) returns EOF without an error when the server cuts the body short
        want = hdr.get("Content-Length")
        if want is not None and n != int(want):
            os.remove(out)
            print(f"ERROR truncated: {n} of {want} B", file=sys.stderr)
            sys.exit(1)
        print(red(f"HTTP {code} {hdr.get('Content-Type')} {n} B {time.time() - t:.1f} s "
                  f"disp={hdr.get('Content-Disposition')}"), file=sys.stderr)
    else:
        data = r.read()
        print(red(f"HTTP {code} {hdr.get('Content-Type')} {len(data)} B {time.time() - t:.1f} s"), file=sys.stderr)
        sys.stdout.write(red(data.decode("utf-8", "replace")))
except urllib.error.HTTPError as e:
    print(red(f"HTTP {e.code} {e.read()[:2000].decode('utf-8', 'replace')}"), file=sys.stderr)
    sys.exit(1)
except Exception as e:  # never let a traceback print the URL
    print(red(f"ERROR {type(e).__name__}: {e}"), file=sys.stderr)
    sys.exit(1)
