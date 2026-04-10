#!/usr/bin/env python3
"""
enrich_companies.py — onAudience company data enrichment
Reads from Supabase, applies ICP rules from OA_ICP_RULES.md, writes back.

Usage:
  python3 scripts/enrich_companies.py --dry-run        # preview, no writes
  python3 scripts/enrich_companies.py --layer 1        # rule-based only (fast, free)
  python3 scripts/enrich_companies.py --layer 2        # + Claude AI (~$0.50 for all)
  python3 scripts/enrich_companies.py --limit 20 --dry-run  # test on 20

Requirements:
  pip install python-dotenv
  .env: SB_URL, SB_ANON_KEY  (+ ANTHROPIC_API_KEY for layer 2)
"""

import os, json, time, sys, argparse, re, urllib.request, urllib.error
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')
except ImportError:
    pass

SB_URL  = os.environ.get('SB_URL', 'https://nyzkkqqjnkctcmxoirdj.supabase.co')
SB_KEY  = os.environ.get('SB_ANON_KEY', '')
ANT_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

if not SB_KEY:
    sys.exit("ERROR: SB_ANON_KEY not set. Add to .env or export.")

SB_HEADERS = {
    'apikey': SB_KEY,
    'Authorization': f'Bearer {SB_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal',
}

# ── ICP taxonomy tags (from OA_ICP_RULES.md) ─────────────────────────────────
VALID_TAGS = {'DATA','DSP','SSP','CDP/DMP','IDENTITY','AGENCY',
              'PROGRAMMATIC','CTV','MOBILE','EU/EMEA','MARKETPLACE','RESEARCH'}

# Category keyword → (segment label, base_icp_delta, tags)
CATEGORY_RULES = [
    ('dsp',              'DSP / Programmatic Platform',  +4, ['DSP','PROGRAMMATIC']),
    ('ssp',              'SSP / Ad Exchange',             +4, ['SSP','PROGRAMMATIC']),
    ('curation',         'SSP / Ad Exchange',             +3, ['SSP','PROGRAMMATIC']),
    ('header bidding',   'SSP / Ad Exchange',             +3, ['SSP']),
    ('publisher',        'SSP / Ad Exchange',             +2, ['SSP']),
    ('data marketplace', 'Data Marketplace',              +3, ['DATA','MARKETPLACE']),
    ('data market',      'Data Marketplace',              +3, ['DATA','MARKETPLACE']),
    ('data provider',    'Data Provider',                 +3, ['DATA']),
    ('data broker',      'Data Provider',                 +3, ['DATA']),
    ('dmp',              'Data Provider',                 +2, ['DATA','CDP/DMP']),
    ('cdp',              'CDP / MarTech / AdTech',        +2, ['CDP/DMP']),
    ('identity',         'CDP / MarTech / AdTech',        +3, ['IDENTITY']),
    ('id graph',         'CDP / MarTech / AdTech',        +3, ['IDENTITY','DATA']),
    ('cookieless',       'CDP / MarTech / AdTech',        +3, ['IDENTITY']),
    ('trading desk',     'Agency / Trading Desk',         +2, ['AGENCY','PROGRAMMATIC']),
    ('programmatic',     'Agency / Trading Desk',         +2, ['AGENCY','PROGRAMMATIC']),
    ('media agency',     'Agency / Trading Desk',         +1, ['AGENCY']),
    ('agency',           'Agency / Trading Desk',         +1, ['AGENCY']),
    ('ad tech',          'CDP / MarTech / AdTech',        +2, ['CDP/DMP']),
    ('adtech',           'CDP / MarTech / AdTech',        +2, ['CDP/DMP']),
    ('martech',          'CDP / MarTech / AdTech',        +1, ['CDP/DMP']),
    ('analytics',        'CDP / MarTech / AdTech',        +1, ['CDP/DMP']),
    ('ctv',              None,                            +1, ['CTV']),
    ('connected tv',     None,                            +1, ['CTV']),
    ('mobile',           None,                            0,  ['MOBILE']),
    ('market research',  'Market Research',               -2, ['RESEARCH']),
    ('survey',           'Market Research',               -2, ['RESEARCH']),
    ('creative',         None,                            -2, []),
    ('seo',              None,                            -3, []),
    ('crm',              None,                            -2, []),
    ('social media',     None,                            -3, []),
    ('brand',            'Brand',                         -1, []),
]

# Note/website keyword → (icp_delta, tags)
NOTE_RULES = [
    ('the trade desk',   +2, ['DSP','PROGRAMMATIC']),
    ('tradedesk',        +2, ['DSP','PROGRAMMATIC']),
    (' ttd ',            +2, ['DSP','PROGRAMMATIC']),
    ('dv360',            +2, ['DSP','PROGRAMMATIC']),
    ('xandr',            +2, ['DSP','PROGRAMMATIC']),
    ('amazon dsp',       +2, ['DSP','PROGRAMMATIC']),
    ('liveramp',         +1, ['IDENTITY']),
    ('uid2',             +1, ['IDENTITY']),
    ('rampid',           +1, ['IDENTITY']),
    ('tcf',              +1, []),
    ('gdpr',             +1, []),
    ('cookieless',       +1, ['IDENTITY']),
    (' ctv ',            +1, ['CTV']),
    ('connected tv',     +1, ['CTV']),
    ('curation',         +1, ['SSP']),
    ('id graph',         +1, ['IDENTITY','DATA']),
    ('first-party',      +1, ['DATA']),
    ('first party',      +1, ['DATA']),
    ('data partner',     +1, []),
    ('audience data',    +1, ['DATA']),
    ('programmatic',     +1, ['PROGRAMMATIC']),
    ('equativ',          +1, ['SSP']),
    ('magnite',          +1, ['SSP']),
    ('pubmatic',         +1, ['SSP']),
    ('meta only',        -3, []),
    ('facebook only',    -3, []),
    ('seo only',         -3, []),
    ('email marketing',  -1, []),
]

EXCLUDED_COUNTRIES = {'IN','PL','UA','RU','india','poland','ukraine','russia'}
PRIORITY_COUNTRIES = {'US','CA','GB','DE','FR','ES','IT','AU','SG','JP','BR','MX'}


def compute_update(co):
    """Rule-based: returns dict of fields to update (empty dict = no change)."""
    cat   = (co.get('category') or '').lower()
    note  = (co.get('note') or '').lower()
    web   = (co.get('website') or '').lower()
    hq_co = (co.get('hq_country') or co.get('hq_country_code') or '').strip()

    icp       = 5
    new_tags  = set()
    new_cat   = None

    # Category rules
    for pattern, seg, delta, tags in CATEGORY_RULES:
        if pattern in cat:
            if seg and not new_cat and seg != 'Other':
                new_cat = seg
            icp += delta
            new_tags.update(tags)
            break

    # Note/website rules
    text = f" {note} {web} "
    for kw, delta, tags in NOTE_RULES:
        if kw in text:
            icp += delta
            new_tags.update(tags)

    # Geographic modifier
    hq_upper = hq_co.upper()
    hq_lower = hq_co.lower()
    if hq_upper in EXCLUDED_COUNTRIES or hq_lower in EXCLUDED_COUNTRIES:
        icp -= 4
    elif hq_upper in PRIORITY_COUNTRIES:
        icp += 1

    icp = max(1, min(10, icp))

    # Build tags — only keep valid taxonomy, remove junk like 'chicago', 'prebid'
    existing = set(co.get('tags') or [])
    valid_existing = existing & VALID_TAGS
    merged = sorted(valid_existing | new_tags)

    update = {}

    # ICP: set only if missing (don't overwrite human-set scores)
    if co.get('icp') is None:
        update['icp'] = icp

    # Tags: update if different
    if merged != sorted(existing):
        update['tags'] = merged

    # Category: clean up if it's "Other" or empty and we have a better one
    if new_cat:
        current_cat = (co.get('category') or '').strip()
        if not current_cat or current_cat.lower() in ('other', ''):
            update['category'] = new_cat

    return update


def claude_enrich(co):
    """Layer 2: Claude Haiku enrichment for companies with enough info."""
    if not ANT_KEY:
        return {}
    has_info = co.get('note') or co.get('website')
    if not has_info:
        return {}

    prompt = f"""Classify this company for onAudience B2B sales.
onAudience sells: Audience Data, AI Audiences, Curation, Raw Data, ID Graph, Data Enrichment.
Segments: Data Providers, Programmatic Agencies, DSPs, SSPs, Data Marketplaces, Tech Partners.

Name: {co.get('name','')}
Website: {co.get('website','')}
Category: {co.get('category','')}
HQ: {co.get('hq_city','')} {co.get('hq_country','')}
Size: {co.get('size','')}
Note: {(co.get('note') or '')[:300]}

Return ONLY JSON:
{{"icp":<1-10>,"tags":<array from ["DATA","DSP","SSP","CDP/DMP","IDENTITY","AGENCY","PROGRAMMATIC","CTV","MOBILE","EU/EMEA","MARKETPLACE","RESEARCH"]>,"category":<one of "Data Provider","DSP / Programmatic Platform","SSP / Ad Exchange","Agency / Trading Desk","Data Marketplace","CDP / MarTech / AdTech","Brand","Market Research","Other">}}"""

    body = json.dumps({"model":"claude-haiku-4-5-20251001","max_tokens":200,
                        "messages":[{"role":"user","content":prompt}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body,
          headers={"x-api-key":ANT_KEY,"anthropic-version":"2023-06-01",
                   "Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
            text = re.sub(r'```json|```','', data['content'][0]['text']).strip()
            return json.loads(text)
    except Exception as e:
        return {}


def sb_get_all(only_missing_icp=False):
    companies, offset = [], 0
    while True:
        qs = f"select=id,name,category,note,website,tags,icp,hq_country,hq_country_code,hq_city,size,type&limit=1000&offset={offset}&order=id"
        if only_missing_icp:
            qs += '&icp=is.null'
        url = f"{SB_URL}/rest/v1/companies?{qs}"
        req = urllib.request.Request(url, headers=SB_HEADERS)
        try:
            with urllib.request.urlopen(req) as r:
                chunk = json.loads(r.read())
        except Exception as e:
            print(f"  Fetch error: {e}")
            break
        if not chunk:
            break
        companies.extend(chunk)
        if len(chunk) < 1000:
            break
        offset += 1000
        time.sleep(0.1)
    return companies


def sb_patch(co_id, data):
    url = f"{SB_URL}/rest/v1/companies?id=eq.{co_id}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=SB_HEADERS, method='PATCH')
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--layer', type=int, default=1, choices=[1,2])
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--only-missing-icp', action='store_true')
    args = ap.parse_args()

    mode = 'DRY RUN ' if args.dry_run else ''
    print(f"{mode}Layer {args.layer} enrichment starting...")
    if args.layer == 2 and not ANT_KEY:
        print("WARNING: ANTHROPIC_API_KEY not set — layer 2 will skip AI enrichment")

    companies = sb_get_all(args.only_missing_icp)
    total = len(companies)
    if args.limit:
        companies = companies[:args.limit]
    print(f"Loaded {total} companies, processing {len(companies)}")
    print()

    updated = skipped = errors = 0

    for i, co in enumerate(companies):
        name  = co.get('name', '?')
        co_id = co.get('id')
        update = compute_update(co)

        if args.layer == 2:
            ai = claude_enrich(co)
            if ai:
                if 'icp' in ai:
                    update['icp'] = ai['icp']  # AI wins
                if 'tags' in ai:
                    rule_tags = set(update.get('tags') or co.get('tags') or [])
                    ai_tags   = set(ai['tags']) & VALID_TAGS
                    update['tags'] = sorted(rule_tags | ai_tags)
                if ai.get('category') and ai['category'] != 'Other':
                    current = (co.get('category') or '').strip()
                    if not current or current.lower() in ('other',''):
                        update['category'] = ai['category']
            time.sleep(0.08)

        if not update:
            skipped += 1
            continue

        if args.dry_run:
            print(f"[{i+1}] {name}")
            for k, v in update.items():
                print(f"  {k}: {co.get(k)!r} → {v!r}")
            updated += 1
        else:
            status = sb_patch(co_id, update)
            if status in (200, 204):
                updated += 1
            else:
                errors += 1
                print(f"  ERROR {status} for {name}")
            if (i+1) % 100 == 0:
                print(f"  [{i+1}/{len(companies)}] {updated} updated, {errors} errors")
            time.sleep(0.04)

    print(f"\n{'DRY RUN — ' if args.dry_run else ''}Done.")
    print(f"  Updated : {updated}")
    print(f"  Skipped : {skipped} (no change needed)")
    print(f"  Errors  : {errors}")

if __name__ == '__main__':
    main()
