"""
End-to-end click-through of the built app at phone size (390x844).

Usage:
  npm run build
  python3 scripts/e2e_smoke.py [--shots DIR] [--file]

By default dist/ is served over http://127.0.0.1 (so the service worker and
manifest paths run too). --file opens dist/index.html straight from disk to
prove the single-file build works without a server.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading, tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=DIST)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/index.html"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", default=None)
    ap.add_argument("--file", action="store_true")
    args = ap.parse_args()
    httpd = None
    if args.file:
        base = "file://" + os.path.join(DIST, "index.html")
    else:
        httpd, base = serve()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
        page = ctx.new_page()
        page.on("console", lambda m: m.type in ("error", "warning") and errors.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

        def go(route):
            page.goto(f"{base}#{route}")
            page.wait_for_selector("#page-title")

        def shot(name):
            if args.shots:
                page.locator(".toast").wait_for(state="detached", timeout=6000)
                page.evaluate("document.activeElement && document.activeElement.blur()")
                os.makedirs(args.shots, exist_ok=True)
                page.screenshot(path=os.path.join(args.shots, f"{name}.png"), full_page=False)

        def sheet():
            return page.locator("dialog[open]")

        # Onboarding
        page.goto(base)
        page.get_by_label("Household name").fill("The Mueller Coop")
        page.get_by_label("First flock name").fill("Backyard Girls")
        page.get_by_role("button", name="Start my flock").click()
        expect(page.get_by_text("The Mueller Coop", exact=False).first).to_be_visible()
        shot("01-home-empty")

        # Load sample flock then use it for richer screens
        page.get_by_role("button", name="Load sample flock").click()
        expect(page.get_by_text("You are viewing sample data.")).to_be_visible()

        # Add a second flock from Account
        go("/account")
        page.get_by_role("button", name="+ Flock").click()
        sheet().get_by_label("Flock name").fill("Bantam Pen")
        sheet().get_by_role("button", name="Save").click()
        expect(page.get_by_text("Bantam Pen")).to_be_visible()
        # switch back to the first flock
        page.locator("li", has_text="Backyard Girls").get_by_role("button", name="Use").click()

        # Add a hen
        go("/flock")
        page.get_by_role("button", name="+ Add hen").click()
        s = sheet()
        s.get_by_label("Name", exact=True).fill("Henrietta")
        s.get_by_role("button", name="Breed Choose a breed").click()
        page.locator("dialog[open]").last.get_by_role("radio", name="Rhode Island Red").click()
        s.get_by_label("Hatch date").fill("2025-04-01")
        s.get_by_label("Color and markings").fill("Mahogany red")
        s.get_by_role("button", name="Add hen").click()
        expect(page.get_by_role("link", name="Henrietta")).to_be_visible()
        shot("02-flock")

        # Bird detail, edit
        page.get_by_role("link", name="Henrietta").click()
        expect(page.locator("#page-title")).to_have_text("Henrietta")
        page.get_by_role("button", name="Edit").click()
        sheet().get_by_label("Notes").fill("Loud in the mornings.")
        sheet().get_by_role("button", name="Save changes").click()
        expect(page.get_by_text("Loud in the mornings.")).to_be_visible()

        # Log eggs attributed to Henrietta
        go("/eggs")
        page.get_by_role("button", name="Increase Eggs collected").click()
        page.get_by_role("button", name="Increase Eggs collected").click()
        page.get_by_role("radio", name="Henrietta").click()
        page.get_by_role("button", name="Save 3 eggs").click()
        expect(page.get_by_text("Logged 3 eggs from Henrietta")).to_be_visible()

        # Sale and cost
        go("/eggs/history?tab=sales")
        page.get_by_role("button", name="+ Add").click()
        s = sheet()
        s.get_by_label("Total price").fill("5.50")
        s.get_by_label("Customer name").fill("Mrs. Alvarez")
        s.get_by_role("button", name="Save").click()
        expect(page.get_by_text("Mrs. Alvarez")).to_be_visible()
        go("/eggs/history?tab=costs")
        page.get_by_role("button", name="+ Add").click()
        s = sheet()
        s.get_by_role("radio", name="Vet").click()
        s.get_by_label("Amount").fill("40")
        s.get_by_label("Notes").fill("Checkup")
        s.get_by_role("button", name="Save cost").click()
        expect(page.get_by_text("Vet · Checkup")).to_be_visible()
        go("/eggs/history")
        expect(page.get_by_text("Top layers")).to_be_visible()
        shot("03-eggs-history")

        # Complete chores
        go("/coop")
        page.get_by_role("checkbox", name="Refresh water").click()
        page.get_by_role("checkbox", name="Collect eggs").click()
        expect(page.get_by_role("checkbox", name="Refresh water")).to_have_attribute("aria-checked", "true")
        shot("04-coop")

        # Care event with quarantine
        go("/care")
        page.get_by_role("button", name="+ Log").click()
        s = sheet()
        s.get_by_role("radio", name="Quarantine").click()
        s.get_by_role("radio", name="Henrietta").click()
        s.get_by_label("Notes").fill("New arrival from swap")
        s.get_by_role("button", name="Save").click()
        expect(page.get_by_text("New arrival from swap")).to_be_visible()
        expect(page.get_by_text("Quarantine ends")).to_be_visible()

        # Feed
        go("/feed")
        page.get_by_role("button", name="+ Item").click()
        s = sheet()
        s.get_by_label("Name").fill("Oyster shell")
        s.get_by_role("radio", name="Grit and oyster shell").click()
        s.get_by_label("On hand (lb)").fill("5")
        s.get_by_label("Used per day (lb)").fill("1")
        s.get_by_role("button", name="Save").click()
        expect(page.get_by_text("Oyster shell").first).to_be_visible()
        expect(page.get_by_text("Low stock").first).to_be_visible()
        page.locator("li", has_text="Oyster shell").get_by_role("button", name="Restock").click()
        sheet().get_by_label("Amount added (lb)").fill("20")
        sheet().get_by_role("button", name="Add stock").click()
        expect(page.get_by_text("Restocked Oyster shell")).to_be_visible()

        # Incubation batch, backdated 7 days, then record hatch on another
        go("/brooder")
        page.get_by_role("button", name="+ Batch").click()
        s = sheet()
        s.get_by_label("Batch name").fill("Marans eggs")
        import datetime
        d7 = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
        s.get_by_label("Date set in the incubator").fill(d7)
        s.get_by_role("button", name="Start batch").click()
        expect(page.get_by_text("Marans eggs")).to_be_visible()
        expect(page.get_by_text("First candling").first).to_be_visible()
        shot("05-brooder")
        page.get_by_role("button", name="Record hatch").click()
        s = sheet()
        for _ in range(9):
            s.get_by_role("button", name="Increase Chicks hatched").click()
        expect(s.get_by_text("75%")).to_be_visible()
        s.get_by_role("button", name="Save results").click()
        expect(page.get_by_text("Hatch rate").first).to_be_visible()

        # Reminders center
        go("/")
        page.get_by_role("button", name="Reminders", exact=False).click()
        expect(sheet().get_by_role("heading", name="Due today")).to_be_visible()
        page.keyboard.press("Escape")
        shot("06-home")

        # More menu navigation and content routes
        page.get_by_role("button", name="More").click()
        sheet().get_by_role("link", name="Learn").click()
        expect(page.locator("#page-title")).to_have_text("Learn")
        page.get_by_role("link", name="Predator proofing the coop and run").click()
        expect(page.get_by_text("half-inch hardware cloth", exact=False)).to_be_visible()
        go("/recipes")
        page.get_by_role("link", name="Jammy soft-boiled eggs").click()
        expect(page.get_by_text("Ingredients")).to_be_visible()
        go("/shop")
        expect(page.get_by_text("Ordering happens on the Fresh Eggs Daily site.")).to_be_visible()
        go("/nope")
        expect(page.get_by_text("This nest is empty")).to_be_visible()

        # Export
        go("/account")
        with page.expect_download() as dl:
            page.get_by_role("button", name="Download full backup (JSON)").click()
        path = dl.value.path()
        backup = json.load(open(path))
        assert backup["app"] == "fresh-eggs-daily", backup.keys()
        assert any(b["name"] == "Henrietta" for b in backup["collections"]["birds"])
        with page.expect_download() as dl2:
            page.get_by_role("button", name="Eggs CSV").click()
        assert open(dl2.value.path()).read().startswith("date,flock,hen,collected")

        # Reload and confirm persistence
        page.reload()
        go("/flock")
        expect(page.get_by_role("link", name="Henrietta")).to_be_visible()
        go("/eggs/history?tab=sales")
        expect(page.get_by_text("Mrs. Alvarez")).to_be_visible()
        go("/coop")
        expect(page.get_by_role("checkbox", name="Refresh water")).to_have_attribute("aria-checked", "true")
        go("/brooder")
        expect(page.get_by_text("Marans eggs")).to_be_visible()

        # Every route renders without errors
        for r in ["/", "/flock", "/eggs", "/eggs/history", "/coop", "/care", "/feed", "/brooder", "/learn", "/recipes", "/shop", "/account"]:
            go(r)
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
            assert not overflow, f"horizontal overflow on {r}"

        # Import the backup into a fresh context
        ctx2 = browser.new_context(viewport={"width": 360, "height": 740})
        p2 = ctx2.new_page()
        p2.on("pageerror", lambda e: errors.append(f"pageerror(ctx2): {e}"))
        p2.goto(base)
        p2.locator("input[type=file]").set_input_files(path)
        expect(p2.get_by_text("The Mueller Coop", exact=False).first).to_be_visible()
        p2.goto(base + "#/flock")
        expect(p2.get_by_role("link", name="Henrietta")).to_be_visible()

        # Remove sample then delete all
        go("/")
        page.get_by_role("button", name="Remove sample").click()
        expect(page.get_by_text("You are viewing sample data.")).to_have_count(0)
        go("/account")
        page.get_by_role("button", name="Delete all data").click()
        sheet().get_by_label("Type DELETE to confirm").fill("DELETE")
        sheet().get_by_role("button", name="Delete everything").click()
        expect(page.get_by_role("button", name="Start my flock")).to_be_visible()

        browser.close()
    if httpd:
        httpd.shutdown()
    if errors:
        print("Console problems:\n" + "\n".join(errors))
        sys.exit(1)
    print("E2E OK (" + ("file://" if args.file else "http") + ")")


if __name__ == "__main__":
    main()
