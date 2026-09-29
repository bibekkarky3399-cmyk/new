# automation.py - Yeti Airlines B2B Group Booking Automation (route-agnostic)
#
# Books a specific flight number + fare class, for every day of a chosen
# date range, on any sector. The booking flow ADAPTS to whatever intermediate
# pages appear for the chosen route, so changing ORIGIN/DESTINATION/
# FLIGHT_NUMBER/FARE_CODE should not break the later steps.
#
# Dependencies (install once):
#     pip3 install playwright
#     python3 -m playwright install chromium

import asyncio
import getpass
import os
import re
import sys
import traceback
from datetime import date, datetime, timedelta
from pathlib import Path
from playwright.async_api import async_playwright

# Fix encoding for Windows console with emojis
if sys.stdout and getattr(sys.stdout, "encoding", None) != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ─────────────────────────────────────────────────────────────
# LOGGING — everything printed is also saved to yeti_logs/run_*.log,
# so the output survives even if the console window closes.
# Screenshots + HTML of every failed date are saved in the same folder.
# ─────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).resolve().with_name("yeti_logs")
LOG_DIR.mkdir(exist_ok=True)
RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"run_{RUN_ID}.log"

class _Tee:
    def __init__(self, *streams):
        self.streams = [s for s in streams if s]
    def write(self, data):
        for s in self.streams:
            try:
                s.write(data)
                s.flush()
            except Exception:
                pass
    def flush(self):
        for s in self.streams:
            try:
                s.flush()
            except Exception:
                pass

_log_handle = open(LOG_FILE, "a", encoding="utf-8")
sys.stdout = _Tee(sys.stdout, _log_handle)
sys.stderr = _Tee(sys.stderr, _log_handle)

NO_FLIGHT_REASON = "flight not matched / not selected"

# ═══════════════════════════════════════════════════════════
# CONFIGURATION — edit these each month, nothing else needs to change
# ═══════════════════════════════════════════════════════════
ORIGIN         = "BDP"        # Upper sector / From  (e.g. "KTM")
DESTINATION    = "KTM"        # Lower sector / To    (e.g. "BDP", "JKR")
FLIGHT_NUMBER  = "924"        # Just the number, e.g. "571" (no "YT" prefix)
FARE_CODE      = "E1"          # Fare class code as shown in the table, e.g. "E1", "H", "G"
                              # (only used when FARE_SELECTION_MODE = "exact")
FARE_PRICE     = 8300       # Expected price. Used as sanity check in "exact" mode,
                              # and as the target price in "nearest" mode.

FARE_SELECTION_MODE = "preferred"   # How to pick a fare among rows for FLIGHT_NUMBER:
                              #   "preferred" -> try FARE_CODE first; if it's full/missing,
                              #                  fall back to the cheapest fare that still
                              #                  respects MAX_FARE_PRICE (recommended default)
                              #   "lowest"    -> cheapest fare that has enough seats
                              #   "exact"     -> only FARE_CODE, no fallback (old behaviour)
                              #   "nearest"   -> fare whose price is closest to FARE_PRICE
                              # In every mode except "exact", if the first-choice fare
                              # doesn't have enough seats, the script automatically falls
                              # back to the next-best candidate instead of giving up.

MAX_FARE_PRICE = 15000        # Hard ceiling (NPR). A fare above this price is NEVER
                              # selected, even as a fallback — the day is skipped instead.S
                              # Set to None to disable the ceiling (not recommended).

START_DATE     = "2026-10-04"   # Book from this date (YYYY-MM-DD)
END_DATE       = "2026-10-30"   # Book up to this date (YYYY-MM-DD)

# Credentials are NOT stored in this file. Set them as environment variables
# (YETI_AGENCY, YETI_USER, YETI_PASSWORD) or type them when the script asks.
AGENCY_NAME    = os.environ.get("YETI_AGENCY", "")
USER_LOGIN     = os.environ.get("YETI_USER", "")
PASSWORD       = os.environ.get("YETI_PASSWORD", "")
ADULTS         = 10
CURRENCY       = "NPR"
GROUP_NAME     = "CDV"        # Typed into the group-name field when one exists;
                              # ignored on routes that auto-fill it from your profile

PORTAL_URL     = "https://res.yetiairlines.com/b2b/User.aspx"

STOP_IF_TEST_DATE_FAILS = False   # True  -> stop the whole run if the FIRST date fails
                                  # False -> log the failure and keep going through
                                  #          the rest of the date range

# Valid airport codes on this portal:
#   BDP BHADRAPUR | BWA BHAIRAHAWA | BIR BIRATNAGAR | JKR JANAKPUR
#   KTM KATHMANDU | KEP NEPALGUNJ  | PKR POKHARA     | TPU TIKAPUR (dest only)
# ═══════════════════════════════════════════════════════════

def days_in_range(start_str, end_str):
    """
    Returns a list of (day, year_month) tuples for every date from
    start_str to end_str inclusive.  e.g. ("01", "202608")
    Both strings must be in "YYYY-MM-DD" format.
    """
    start = date.fromisoformat(start_str)
    end   = date.fromisoformat(end_str)
    dates = []
    current = start
    while current <= end:
        day = f"{current.day:02d}"
        ym  = f"{current.year}{current.month:02d}"
        dates.append((day, ym))
        current += timedelta(days=1)
    return dates

async def settle(page, timeout=15000):
    """Wait for network idle, but never crash the run if the page is slow."""
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout)
    except Exception:
        pass

async def save_debug(page, tag):
    """Save screenshot + HTML of the current page for post-mortem debugging."""
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", tag)
    base = LOG_DIR / f"{RUN_ID}_{safe}"
    try:
        if page.is_closed():
            return
        await page.screenshot(path=str(base) + ".png", full_page=True)
        Path(str(base) + ".html").write_text(await page.content(), encoding="utf-8")
        print(f"  📸 Debug saved: {base.name}.png / .html")
    except Exception as e:
        print(f"  ⚠️ Could not save debug files: {e}")

async def on_dialog(dialog):
    """
    The portal may raise alert()/confirm() popups. Playwright DISMISSES them by
    default, which silently cancels a confirm() step. Accept them and log the text.
    """
    print(f"  💬 Browser dialog ({dialog.type}): {dialog.message!r} → accepting")
    try:
        await dialog.accept()
    except Exception:
        pass

async def ensure_logged_in(page):
    """Re-login if the portal session expired (login form is visible again)."""
    try:
        if await page.locator("input#txtCompany").first.is_visible(timeout=1500):
            print("  🔐 Session seems to have expired — logging in again")
            return await login(page)
    except Exception:
        pass
    return True

# ─────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────
async def login(page):
    print("\n🔐 Logging in...")
    await page.goto(PORTAL_URL)
    await settle(page)

    try:
        await page.wait_for_selector(".PleaseLogin", timeout=5000)
    except Exception as e:
        print(f"  ⚠️ PleaseLogin selector not found, continuing anyway...")

    print("  → Filling credentials...")
    await page.fill("input#txtCompany",   AGENCY_NAME)
    await page.fill("input#txtAdminName", USER_LOGIN)
    await page.fill("input#txtPassword",  PASSWORD)
    print("  → Clicking login button...")
    await page.click("a[title='User Login']")
    await settle(page)
    await asyncio.sleep(2)

    try:
        # NOTE: the old selector mixed "text=..." with CSS via commas, which
        # Playwright treats as one literal text string — it could never match.
        await page.wait_for_selector("text=Account Information", timeout=5000)
        print("  ✅ Login successful")
        return True
    except Exception as e:
        print(f"  ⚠️ Could not confirm login with text selector: {e}")
        # Check for any error message
        try:
            error = await page.locator("#pnError").first.text_content()
            if error and error.strip():
                print(f"  ❌ Login failed: {error}")
                return False
        except Exception:
            pass
        
        # Check page body to see what's displayed
        try:
            body = await page.locator("body").text_content()
            if "Account Information" in body or "BIBEK KARKI" in body:
                print("  ✅ Login appears successful (found account info in page)")
                return True
            else:
                print(f"  ⚠️ Login status unclear. Page contains: {body[:200]}")
                return False
        except Exception:
            print("  ❌ Could not verify login status")
            return False

async def go_home(page):
    """
    Reset to the search page between dates.

    The old version clicked "text=Home", which on the confirmation page can
    match some other element (or nothing), leaving the browser on the wrong
    page so the next date's search failed. Now we load the portal URL directly
    and VERIFY the search form (#SearchBox) is present, re-logging in if needed.
    """
    if page.is_closed():
        return False
    for attempt in range(1, 4):
        try:
            await page.goto(PORTAL_URL, timeout=30000)
            await settle(page)
            await asyncio.sleep(1)
        except Exception as e:
            print(f"  ⚠️ Could not load portal (try {attempt}/3): {str(e).splitlines()[0]}")
            await asyncio.sleep(2)
            continue
        await ensure_logged_in(page)
        try:
            await page.wait_for_selector("#SearchBox", timeout=10000)
            print("  🏠 Back on the search page")
            return True
        except Exception:
            print(f"  ⚠️ Search form not visible after going home (try {attempt}/3)")
            # Fallback: maybe the Home link is the only way back
            try:
                await page.click("a:has-text('Home')", timeout=3000)
                await settle(page)
                await page.wait_for_selector("#SearchBox", timeout=5000)
                print("  🏠 Back on the search page (via Home link)")
                return True
            except Exception:
                pass
    print("  ❌ Could not get back to the search page")
    return False

# ─────────────────────────────────────────────────────────────
# ROBUST DATE SELECTION HELPER
# ─────────────────────────────────────────────────────────────

async def select_date(page, day, year_month):
    """
    Robustly set flight date: day (e.g. '15') and year_month (e.g. '202607').
    Tries 4 strategies: known IDs → alternate selectors → JS label match → date input
    """
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    try:
        year = int(year_month[:4])
        mon = int(year_month[4:6])
        month_label = f"{months[mon-1]} {year}"
    except Exception:
        month_label = None

    # Strategy A: known IDs (fast path)
    try:
        await page.select_option("select#ddlDate_1", value=day)
        await page.select_option("select#ddlMY_1", value=year_month)
        await asyncio.sleep(0.25)
        d = await page.evaluate("() => (document.getElementById('ddlDate_1')||{}).value")
        m = await page.evaluate("() => (document.getElementById('ddlMY_1')||{}).value")
        if d == day and m == year_month:
            print(f"  ✓ Date set via ddlDate_1 / ddlMY_1 -> {day}/{year_month}")
            return True
    except Exception:
        pass

    # Strategy B: try alternate selector pairs and label match
    alt_pairs = [
        ("select[id^='ddlDate']", "select[id^='ddlMY']"),
        ("select[name*='Date']", "select[name*='MY']"),
        ("select[name*='date']", "select[name*='my']"),
        ("select[class*='date']", "select[class*='my']"),
    ]
    for sel_d, sel_m in alt_pairs:
        try:
            # try by value first
            await page.select_option(sel_d, value=day)
            if month_label:
                await page.select_option(sel_m, label=month_label)
            else:
                await page.select_option(sel_m, value=year_month)
            await asyncio.sleep(0.25)
            check_data = {"sd": sel_d, "sm": sel_m, "d": day, "ym": year_month}
            ok = await page.evaluate(
                "(data) => { const {sd, sm, d, ym} = data; const a = document.querySelector(sd); const b = document.querySelector(sm); return !!a && !!b && a.value==d && b.value==ym; }",
                check_data)
            if ok:
                print(f"  ✓ Date set via {sel_d} / {sel_m}")
                return True
        except Exception:
            continue

    # Strategy C: find selects near the 'Flight Date' label and set via JS
    try:
        data = {"day": day, "ym": year_month, "monthLabel": month_label}
        res = await page.evaluate(
            """(data) => {
                const {day, ym, monthLabel} = data;
                // Pick the SMALLEST element mentioning "Flight Date" (the old code took
                // the first = outermost div, then grabbed the first two selects on the
                // whole page — e.g. origin/dest — and overwrote them without checking).
                const labels = Array.from(document.querySelectorAll('label,div,td,span'))
                    .filter(el => /flight\\s*date/i.test(el.textContent || ''))
                    .sort((x, y) => (x.textContent||'').length - (y.textContent||'').length);
                const label = labels[0];
                if (!label) return false;
                const container = label.closest('tr') || label.parentElement;
                if (!container) return false;
                const selects = Array.from(container.querySelectorAll('select'));
                if (selects.length >= 2) {
                    const [a,b] = selects;
                    a.value = day;
                    for (const opt of Array.from(b.options)) {
                        if (opt.value == ym || (monthLabel && opt.text.trim() == monthLabel)) {
                            b.value = opt.value;
                            break;
                        }
                    }
                    a.dispatchEvent(new Event('change',{bubbles:true}));
                    b.dispatchEvent(new Event('change',{bubbles:true}));
                    if (a.value != day || b.value != ym) return false;   // verify
                    return {d: a.id||a.name||'sel', m: b.id||b.name||'sel'};
                }
                return false;
            }""", data)
        if res:
            print(f"  ✓ Date set via nearby label selects {res.get('d')} / {res.get('m')}")
            await asyncio.sleep(0.25)
            return True
    except Exception as e:
        print(f"  ⚠️ JS fallback error: {e}")

    # Strategy D: try input[type=date] fallback
    try:
        iso = f"{year_month[:4]}-{year_month[4:6]}-{day}"
        inputs = await page.query_selector_all("input[type='date'], input[placeholder*='Date'], input[placeholder*='date']")
        for inp in inputs:
            try:
                await inp.fill(iso)
                await inp.evaluate("(el)=>el.dispatchEvent(new Event('change',{bubbles:true}))")
                await asyncio.sleep(0.2)
                val = await page.evaluate("(el)=>el.value", inp)
                if val and (day in val or year_month[:4] in val):
                    print(f"  ✓ Date set via date input using {iso}")
                    return True
            except Exception:
                continue
    except Exception:
        pass

    print(f"  ❌ Could not set date {day}/{year_month}")
    return False

# ─────────────────────────────────────────────────────────────
# SEARCH  (sector set in two independent, verified steps)
# ─────────────────────────────────────────────────────────────
async def search_flights(page, origin, dest, day, year_month):
    print(f"\n🔍 Searching {origin}-{dest} on {day}/{year_month}...")

    try:
        await page.wait_for_selector("#SearchBox", timeout=10000)
    except Exception:
        print("  ⚠️ Search form not found — returning to home page first")
        if not await go_home(page):
            return False
    await page.click("input#rd2[name='rd1']")  # Oneway

    # STEP A: Origin first (fires changedestroute() to rebuild dest list)
    print(f"  → Setting origin = {origin}")
    await page.select_option("select#uxOrigin", value=origin)
    await page.evaluate(
        "() => document.getElementById('uxOrigin')"
        ".dispatchEvent(new Event('change', { bubbles: true }))"
    )
    await asyncio.sleep(1.5)
    origin_now = await page.evaluate("() => document.getElementById('uxOrigin').value")
    if origin_now != origin:
        print(f"  ❌ Origin didn't stick (wanted {origin}, got {origin_now})")
        return False
    print(f"  ✓ Origin set to {origin_now}")

    # STEP B: Destination (list now rebuilt for this origin)
    print(f"  → Setting destination = {dest}")
    dest_available = await page.evaluate(
        "() => Array.from(document.getElementById('uxDest').options)"
        f".some(o => o.value === '{dest}')"
    )
    if not dest_available:
        avail = await page.evaluate(
            "() => Array.from(document.getElementById('uxDest').options).map(o => o.value)"
        )
        print(f"  ❌ Destination {dest} not available from {origin}. Valid: {avail}")
        return False
    await page.select_option("select#uxDest", value=dest)
    await page.evaluate(
        "() => document.getElementById('uxDest')"
        ".dispatchEvent(new Event('change', { bubbles: true }))"
    )
    await asyncio.sleep(0.5)
    dest_now = await page.evaluate("() => document.getElementById('uxDest').value")
    if dest_now != dest:
        print(f"  ❌ Destination didn't stick (wanted {dest}, got {dest_now})")
        return False
    print(f"  ✓ Destination set to {dest_now}")

    # Date (robust handling with multiple strategies)
    print(f"  → Setting date = {day}/{year_month}")
    if not await select_date(page, day, year_month):
        print(f"  ❌ Failed to set date {day}/{year_month}")
        return False

    # Group booking -> expand adult range to 30
    await page.check("input#uxCHKGroup")
    await page.evaluate('''
        () => {
            const g = document.getElementById('uxCHKGroup');
            if (!g.checked) g.checked = true;
            creategroup(g);
        }
    ''')
    await asyncio.sleep(1)
    await page.select_option("select#optAdult", value=str(ADULTS))
    await page.select_option("select#optCurrency", value=CURRENCY)

    adult_now = await page.evaluate("() => document.getElementById('optAdult').value")
    if adult_now != str(ADULTS):
        print(f"  ❌ Adults didn't stick (wanted {ADULTS}, got {adult_now})")
        return False
    print(f"  ✓ Adults set to {adult_now}")

    # Submit
    try:
        await page.evaluate("ValidateFlightAvailability();")
    except Exception as e:
        print(f"  ⚠️ JS call failed: {e}")
        try:
            await page.click("a:has-text('Next')")
        except Exception as e2:
            print(f"  ❌ Could not submit search: {e2}")
            return False

    await settle(page)
    await asyncio.sleep(3)

    try:
        await page.wait_for_selector("#tabOutward", timeout=10000)
        print("  ✅ Results loaded")
        return True
    except Exception as e:
        print(f"  ⚠️ No results table: {e}")
        return False

# ─────────────────────────────────────────────────────────────
# SELECT THE CONFIGURED FLIGHT / FARE
# ─────────────────────────────────────────────────────────────
async def select_flight(page):
    try:
        await page.wait_for_selector("#tabOutward", timeout=10000)
        await asyncio.sleep(2)
    except Exception as e:
        print(f"  ❌ Results table not found: {e}")
        return False

    rows = await page.evaluate(r'''
        () => {
            const results = [];
            document.querySelectorAll('#tabOutward tr').forEach(row => {
                const radio = row.querySelector('input[name="Rad_Out"]');
                if (!radio) return;
                const tds = row.querySelectorAll('td');
                if (tds.length < 9) return;
                const flightCell = tds[0] ? tds[0].textContent.trim() : '';
                const fareCell   = tds[6] ? tds[6].textContent.trim() : '';
                const seatCell   = tds[7] ? tds[7].textContent.trim() : '';
                const priceCell  = tds[8] ? tds[8].textContent.trim() : '';
                let flightNumber = '';
                const m = flightCell.match(/YT\s*(\d{3})/);
                if (m) flightNumber = m[1];
                let price = 0;
                if (priceCell) price = parseFloat(priceCell.replace(/,/g, '')) || 0;
                let seats = 0;
                const sm = seatCell.match(/(\d+)/);
                if (sm) seats = parseInt(sm[1], 10);
                results.push({ radioValue: radio.value, flightNumber, fareCode: fareCell,
                               price, priceStr: priceCell, seats });
            });
            return results;
        }
    ''')

    if not rows:
        print("  ❌ No fare rows found")
        return False

    # All rows for the configured flight number, regardless of fare class.
    flight_rows = [r for r in rows if r['flightNumber'] == FLIGHT_NUMBER]
    if not flight_rows:
        print(f"  ❌ No row for Flight {FLIGHT_NUMBER}. Available:")
        for r in rows:
            print(f"     - YT {r['flightNumber'] or '???':<4} {r['fareCode']:<4} "
                  f"NPR {r['priceStr']:<12} seats={r['seats']}")
        return False

    # Split off anything above the price ceiling FIRST — a fare over the
    # ceiling is never selectable, in any mode, no matter how many seats
    # it has. This is a hard safety cap, not a fallback preference.
    def within_ceiling(r):
        return MAX_FARE_PRICE is None or r['price'] <= MAX_FARE_PRICE

    over_ceiling = [r for r in flight_rows if not within_ceiling(r)]
    affordable   = [r for r in flight_rows if within_ceiling(r)]

    if not affordable:
        print(f"  ❌ Every fare on Flight {FLIGHT_NUMBER} exceeds the "
              f"MAX_FARE_PRICE ceiling ({CURRENCY} {MAX_FARE_PRICE}). Skipping.")
        for r in over_ceiling:
            print(f"     - {r['fareCode']:<4} NPR {r['priceStr']:<12} seats={r['seats']} (over ceiling)")
        return False

    # Build the ordered candidate list according to FARE_SELECTION_MODE.
    # First entry is the "ideal" pick; later entries are fallbacks used only
    # if an earlier candidate doesn't have enough seats.
    mode = FARE_SELECTION_MODE.lower()
    if mode == "exact":
        candidates = [r for r in affordable if r['fareCode'] == FARE_CODE]
        if not candidates:
            reason = " (exists, but over the price ceiling)" if \
                any(r['fareCode'] == FARE_CODE for r in over_ceiling) else ""
            print(f"  ❌ No row matches Fare {FARE_CODE} for Flight {FLIGHT_NUMBER}{reason}. Available:")
            for r in flight_rows:
                print(f"     - YT {r['flightNumber']:<4} {r['fareCode']:<4} "
                      f"NPR {r['priceStr']:<12} seats={r['seats']}")
            return False
    elif mode == "preferred":
        # Try FARE_CODE first; anything else (cheapest first) is the fallback.
        preferred = [r for r in affordable if r['fareCode'] == FARE_CODE]
        rest = sorted((r for r in affordable if r['fareCode'] != FARE_CODE),
                       key=lambda r: r['price'])
        candidates = preferred + rest
    elif mode == "nearest":
        candidates = sorted(affordable, key=lambda r: abs(r['price'] - FARE_PRICE))
    else:  # "lowest" (default) — treat unrecognized values as "lowest" too
        if mode != "lowest":
            print(f"  ⚠️ Unknown FARE_SELECTION_MODE {mode!r}, defaulting to 'lowest'")
        candidates = sorted(affordable, key=lambda r: r['price'])

    # Walk candidates in priority order, skipping any that are full / have too
    # few seats for the group, instead of failing the whole day outright.
    chosen = None
    skipped = []
    for r in candidates:
        if r['seats'] < ADULTS:
            skipped.append(r)
            continue
        chosen = r
        break

    if not chosen:
        print(f"  ❌ No fare on Flight {FLIGHT_NUMBER} has {ADULTS}+ seats within "
              f"the price ceiling (mode={mode}). Skipping this date.")
        for r in candidates:
            print(f"     - {r['fareCode']:<4} NPR {r['priceStr']:<12} seats={r['seats']}"
                  f"{'  (FULL/insufficient)' if r in skipped else ''}")
        if over_ceiling:
            print(f"     (also {len(over_ceiling)} fare(s) excluded for exceeding "
                  f"the {CURRENCY} {MAX_FARE_PRICE} ceiling)")
        return False

    if mode == "exact" and FARE_PRICE and abs(chosen['price'] - FARE_PRICE) > 0.01:
        print(f"  ⚠️ Price mismatch (config {FARE_PRICE}, site {chosen['priceStr']}). Proceeding.")
    if mode == "preferred" and chosen['fareCode'] != FARE_CODE:
        print(f"  ⚠️ Preferred fare {FARE_CODE} unavailable — fell back to "
              f"{chosen['fareCode']} at NPR {chosen['priceStr']}.")
    if skipped:
        print(f"  ⚠️ Skipped {len(skipped)} fare(s) with insufficient seats before finding a match:")
        for r in skipped:
            print(f"     - {r['fareCode']:<4} NPR {r['priceStr']:<12} seats={r['seats']} (FULL/insufficient)")

    print(f"  ✅ Chosen ({mode}): YT {chosen['flightNumber']} / {chosen['fareCode']} "
          f"/ NPR {chosen['priceStr']} / seats={chosen['seats']}")

    try:
        await page.check(f'input[name="Rad_Out"][value="{chosen["radioValue"]}"]')
    except Exception as e:
        print(f"  ❌ Failed to select radio: {e}")
        return False

    if not await click_next(page):
        print("  ❌ Could not click Next after selecting flight")
        return False
    await asyncio.sleep(2)
    return True

# ─────────────────────────────────────────────────────────────
# ROUTE-AGNOSTIC ADVANCE:  react to whatever page appears
# ─────────────────────────────────────────────────────────────
async def click_next(page):
    """Try several ways to click Next. Returns True if something was clicked."""
    btn = await page.query_selector('#btnNextSaveStep a')
    if btn:
        try:
            await btn.click(timeout=5000)
            await settle(page)
            return True
        except Exception:
            pass
    for sel in ["a:has-text('Next')", "text=Next", "input[value='Next']"]:
        try:
            await page.click(sel, timeout=2500)
            await settle(page)
            return True
        except Exception:
            continue
    return False

async def try_fill_group_name(page):
    """
    Look for a group-name text field using several likely selectors and,
    if one is found AND is visible, type GROUP_NAME into it.
    Returns True if it filled something, False if no field was present.
    Never raises — routes that auto-fill group name from the profile simply
    have no such field, and this quietly does nothing for them.
    """
    candidate_selectors = [
        "input#uxGroupName",
        "input#txtGroupName",
        "input[name='GroupName']",
        "input[name='groupname']",
        "input[id*='Group']",
        "input[id*='group']",
    ]
    for sel in candidate_selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                visible = await el.is_visible()
                if visible:
                    await el.fill(GROUP_NAME)
                    print(f"    → Filled group name '{GROUP_NAME}' into {sel}")
                    return True
        except Exception:
            continue
    return False

async def read_page_state(page):
    return await page.evaluate('''
        () => {
            const headEl = document.querySelector('.TicketText, .StepText, h1, h2, .Label');
            const heading = headEl ? headEl.textContent.trim() : '';
            const body = (document.body.innerText || '');
            return { heading, body: body.slice(0, 600), full: body };
        }
    ''')

# A PNR followed by ":" / "-" and an actual code (so a menu item such as
# "PNR Search" / "Retrieve PNR" no longer counts as a confirmed booking).
PNR_RE = re.compile(
    r"(?:PNR|Booking\s*(?:Ref(?:erence)?|No\.?|Number|Code|ID)|"
    r"Reservation\s*(?:No\.?|Number|Code))"
    r"\s*(?:No\.?|Number|Code)?\s*[:\-]\s*([A-Z0-9]{5,8})\b"
)

# Phrases that only appear once a booking has been made (kept specific on
# purpose, so menu items on earlier pages can't be mistaken for a confirmation).
CONFIRM_MARKERS = [
    "Booking Details", "Please pay within", "Booking Confirmed",
    "Reservation Confirmed", "Booking Successful", "booked successfully",
    "successfully booked",
]

def find_pnr(full_text):
    m = PNR_RE.search(full_text)
    return m.group(1) if m else None

def is_confirmation(full_text, top_text):
    low = full_text.lower()
    if any(mk.lower() in low for mk in CONFIRM_MARKERS):
        return True
    if find_pnr(full_text):
        return True
    # "Confirmed" alone is generic, so keep checking it only near the top as before
    return 'Confirmed' in top_text

async def advance_through_booking(page, max_steps=10):
    """
    After a flight is selected, keep advancing through whatever pages appear
    (Your Details / Special Service / Payment / etc.) until the confirmation
    page is reached. Handles known pages; logs unknown ones and tries Next.

    Returns (ok, pnr_or_None, verified). verified=False means the booking was
    submitted (Book Now Pay Later + Next) but the confirmation page could not be
    recognised — it most likely went through, but check it on the portal.
    """
    seen_headings = []
    last_sig = None
    same_count = 0
    payment_submitted = False
    payment_sig = None
    for step in range(max_steps):
        await asyncio.sleep(2)
        state = await read_page_state(page)
        heading, body, full = state['heading'], state['body'], state['full']
        seen_headings.append(heading)
        print(f"    [advance {step+1}] heading: {heading!r}")

        # DONE? confirmation page — check the WHOLE page text, not the first
        # 600 chars (menus/headers used to push the markers out of view).
        if is_confirmation(full, body):
            pnr = find_pnr(full)
            print(f"  ✅ Booking confirmed!{'  PNR: ' + pnr if pnr else ''}")
            if not pnr:
                await save_debug(page, "confirmation_no_pnr")
            return True, pnr, True

        sig = heading + "|" + body[:300]

        # AFTER PAYMENT WAS SUBMITTED: never click Next/Pay again (that could
        # create a duplicate booking). As soon as the page moves away from the
        # payment page, the booking has been submitted — treat it as done so the
        # script moves on to the next date instead of getting stuck here.
        if payment_submitted and sig != payment_sig:
            print("  ✅ Booking submitted (left the payment page), but the "
                  "confirmation text/PNR was not recognised — verify on portal.")
            await save_debug(page, "confirmation_unrecognised")
            return True, find_pnr(full), False

        # STUCK? If the page didn't change after our last click, do NOT keep
        # clicking Next/Pay — that risks submitting the same booking twice.
        if sig == last_sig:
            same_count += 1
            if same_count >= 3:
                print("    ❌ Page is not changing after clicking Next — stopping this date.")
                print("      Body start: " + body.replace("\n", " ")[:250])
                return False, None, False
            print(f"    ⏳ Page unchanged, waiting (check {same_count}/3)...")
            await settle(page)
            await asyncio.sleep(3)
            continue
        last_sig, same_count = sig, 0

        # PAYMENT page
        if 'Book Now Pay Later' in body or 'Payment' in heading or 'Payment' in body[:200]:
            print("    → Payment: selecting Book Now Pay Later")
            for sel in ["text=Book Now Pay Later",
                        "div:has-text('Book Now Pay Later')"]:
                try:
                    await page.click(sel, timeout=2500)
                    break
                except Exception:
                    continue
            await asyncio.sleep(1)
            if not await click_next(page):
                print("    ❌ Could not click Next on the Payment page.")
                return False, None, False
            payment_submitted = True
            payment_sig = sig
            continue

        # SPECIAL SERVICE page — skip
        if 'Special Service' in body or 'Special Service' in heading:
            print("    → Special Service: skipping")
            if not await click_next(page):
                print("    ❌ Could not click Next on the Special Service page.")
                return False, None, False
            continue

        # YOUR DETAILS page — fill group name if the field exists, then Next
        if 'Your Details' in body or 'Contact Person' in body or \
           'Group Name' in body or 'Your Itinerary' in heading:
            print("    → Details/Itinerary page")
            filled = await try_fill_group_name(page)
            if not filled:
                print("    → No editable group-name field here "
                      "(auto-filled from profile); clicking Next")
            if not await click_next(page):
                print("    ❌ Could not click Next on the Details page.")
                return False, None, False
            continue

        # ERROR page
        if 'Error' in body or 'Sorry' in body:
            print("    ❌ Error page detected. Body start:")
            print("      " + body.replace("\n", " ")[:250])
            try:
                err = await page.locator('.ErrorBox, #pnError, .TextRed').first.text_content(timeout=2000)
                if err and err.strip():
                    print(f"      📝 {err.strip()[:200]}")
            except Exception:
                pass
            return False, None, False

        # UNKNOWN page — log it, try to fill group name if present, then Next
        print(f"    ⚠️ Unrecognized page (step {step+1}). Heading={heading!r}")
        print("      Body start: " + body.replace("\n", " ")[:250])
        await try_fill_group_name(page)  # harmless if no field present
        if not await click_next(page):
            print("    ❌ No Next button on this page — cannot proceed.")
            print(f"      Pages seen so far: {seen_headings}")
            return False, None, False

    print(f"  ❌ Exceeded {max_steps} steps without confirmation. Seen: {seen_headings}")
    return False, None, False

async def process_one_date(page, origin, dest, day, year_month, state):
    """
    state["committed"] is set True once we've clicked Next past flight
    selection — from that point on a booking MAY exist on the portal.
    """
    if not await search_flights(page, origin, dest, day, year_month):
        return False, "search failed"
    if not await select_flight(page):
        return False, NO_FLIGHT_REASON
    state["committed"] = True
    ok, pnr, verified = await advance_through_booking(page)
    state["pnr"] = pnr
    state["verified"] = verified
    if not ok:
        return False, "could not complete booking flow"
    text = f"booked (PNR {pnr})" if pnr else "booked"
    if not verified:
        text += " — confirmation not recognised, CHECK PORTAL"
    return True, text

async def process_one_date_with_retry(page, origin, dest, day, year_month, attempts=2):
    """
    Wrap process_one_date with a retry, so a transient failure (slow page load,
    momentary timeout) doesn't get counted as a real failure. Between attempts
    we reset to the search page. A genuine 'no matching flight' still fails fast.

    Any exception is caught HERE, so one bad date can no longer crash the whole
    run and close the browser.

    Returns (ok, reason, needs_manual_check).
    """
    last_reason = "unknown"
    for attempt in range(1, attempts + 1):
        if attempt > 1:
            print(f"  🔁 Retry {attempt}/{attempts} for {day}/{year_month} "
                  f"(previous: {last_reason})")
            await go_home(page)
            await asyncio.sleep(1)

        state = {"committed": False, "pnr": None, "verified": True}
        try:
            if not await ensure_logged_in(page):
                return False, "re-login failed", False
            ok, reason = await process_one_date(page, origin, dest, day, year_month, state)
        except Exception as e:
            first_line = (str(e).splitlines() or [""])[0][:160]
            reason = f"exception: {type(e).__name__}: {first_line}"
            print(f"  💥 {reason}")
            traceback.print_exc()
            ok = False

        if ok:
            return True, reason, not state["verified"]
        last_reason = reason
        await save_debug(page, f"{year_month}{day}_attempt{attempt}")

        # Past flight selection a booking may already exist on the portal.
        # Retrying could create a DUPLICATE group booking, so never retry here.
        if state["committed"]:
            return False, reason + " — booking may exist, CHECK PORTAL", True
        # Don't waste a retry when the flight genuinely isn't offered that day
        if reason == NO_FLIGHT_REASON:
            break
    return False, last_reason, False

def print_summary(results, date_count):
    lines = ["", "=" * 60, "📊 SUMMARY", "=" * 60,
             f"✅ Booked: {len(results['success'])} / {date_count}"]
    lines += [f"   - {d}" for d in results["success"]]
    lines.append(f"❌ Failed: {len(results['failed'])}")
    lines += [f"   - {d}" for d in results["failed"]]
    if results["check"]:
        lines.append(f"⚠️  CHECK THESE ON THE PORTAL (booking may have gone through): "
                     f"{len(results['check'])}")
        lines += [f"   - {d}" for d in results["check"]]
    if results["not_run"]:
        lines.append(f"⏭️  Not attempted: {len(results['not_run'])}")
        lines += [f"   - {d}" for d in results["not_run"]]
    lines.append("=" * 60)
    lines.append(f"📝 Full log: {LOG_FILE}")
    print("\n".join(lines))

def ask_credentials():
    global AGENCY_NAME, USER_LOGIN, PASSWORD
    if not AGENCY_NAME:
        AGENCY_NAME = input("Agency name: ").strip()
    if not USER_LOGIN:
        USER_LOGIN = input("User login: ").strip()
    if not PASSWORD:
        PASSWORD = getpass.getpass("Password: ")

async def main():
    ask_credentials()
    origin = ORIGIN.strip().upper()
    dest   = DESTINATION.strip().upper()
    date_list = days_in_range(START_DATE, END_DATE)

    print("\n" + "=" * 60)
    print("🚀 YETI AIRLINES B2B AUTOMATION — Batch Booking")
    print(f"   Sector: {origin}-{dest} | Flight: YT{FLIGHT_NUMBER} | "
          f"Mode: {FARE_SELECTION_MODE} (fare={FARE_CODE}, target={FARE_PRICE}, "
          f"ceiling={MAX_FARE_PRICE})")
    print(f"   Adults: {ADULTS} | Range: {START_DATE} → {END_DATE} "
          f"({len(date_list)} dates)")
    print(f"   Log file: {LOG_FILE}")
    print("=" * 60)

    results = {"success": [], "failed": [], "check": [],
               "not_run": [f"{d}/{ym}" for d, ym in date_list]}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=200)
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1280, "height": 720})
        page.on("dialog", on_dialog)
        page.context.on("page", lambda pg: print(f"  🪟 Portal opened a new tab/popup: {pg.url}"))

        try:
            if not await login(page):
                print("\n❌ Stopped — login failed")
                await save_debug(page, "login_failed")
                return

            for i, (day, year_month) in enumerate(date_list):
                if page.is_closed():
                    print("\n🛑 Browser window was closed — stopping.")
                    break

                print("\n" + "-" * 60)
                if i == 0:
                    print(f"📅 Date: {day}/{year_month}  🧪 TEST DATE (first date)")
                else:
                    print(f"📅 Date: {day}/{year_month}  ({i + 1}/{len(date_list)})")
                print("-" * 60)

                ok, reason, needs_check = await process_one_date_with_retry(
                    page, origin, dest, day, year_month)
                results["not_run"].remove(f"{day}/{year_month}")

                if ok:
                    results["success"].append(f"{day}/{year_month} — {reason}")
                    if needs_check:
                        results["check"].append(f"{day}/{year_month}")
                    if i == 0:
                        print(f"  ✅ Test date PASSED — booking counted, "
                              f"continuing with remaining {len(date_list) - 1} dates...")
                else:
                    print(f"  ❌ {reason}")
                    results["failed"].append(f"{day}/{year_month} ({reason})")
                    if needs_check:
                        results["check"].append(f"{day}/{year_month}")
                    # Stop on the test date only for a TECHNICAL failure. "No seats /
                    # flight not operating" on day 1 is not a script problem, so
                    # carry on with the rest of the month instead of quitting.
                    if STOP_IF_TEST_DATE_FAILS and i == 0 and reason != NO_FLIGHT_REASON:
                        print(f"  🛑 Test date FAILED — stopping "
                              f"(STOP_IF_TEST_DATE_FAILS = True).")
                        break

                if i < len(date_list) - 1:
                    print(f"  ➡️  Moving on to the next date...")
                    try:
                        await go_home(page)
                    except Exception as e:
                        print(f"  ⚠️ go_home error (will retry on next date): {e}")

        except (KeyboardInterrupt, asyncio.CancelledError):
            print("\n\n⚠️  Interrupted by user")
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            traceback.print_exc()
            await save_debug(page, "fatal_error")
        finally:
            # Always print the summary — even after a crash or Ctrl+C.
            print_summary(results, len(date_list))

        if not page.is_closed():
            print("\n🟢 Browser staying open — close it manually or press Ctrl+C")
            try:
                await page.wait_for_event("close", timeout=0)
            except BaseException:
                pass
    print("\n🔴 Done.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Exited by user")
    except Exception:
        print("\n❌ Script crashed:")
        traceback.print_exc()
    finally:
        # Keep the console window open when the script was double-clicked,
        # so you can read what happened instead of the window vanishing.
        try:
            if sys.stdin and sys.stdin.isatty():
                input("\nPress Enter to close this window...")
        except Exception:
            pass
