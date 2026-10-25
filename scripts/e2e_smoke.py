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
DIST_DEMO = os.path.join(ROOT, "dist-demo")


def serve(directory=DIST):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=directory)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/index.html"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", default=None)
    ap.add_argument("--file", action="store_true")
    ap.add_argument("--ai-shots", default=None, help="screenshots of the photo check and breed screens (demo build)")
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

        # Breed guide and recommender (pure client side)
        go("/breeds")
        page.get_by_role("radio", name="Cold winters").click()
        page.get_by_role("radio", name="Egg basket colors").click()
        page.get_by_role("radio", name="Free range").click()
        recs = page.get_by_role("list", name="Recommended breeds").locator("> li")
        expect(recs).to_have_count(5)
        expect(page.get_by_text("Why this fits you").first).to_be_visible()
        page.get_by_label("Search breeds").fill("plymouth")
        page.get_by_role("list", name="Breeds").get_by_role("link", name="Barred Plymouth Rock").click()
        expect(page.locator("#page-title")).to_have_text("Barred Plymouth Rock")
        expect(page.get_by_text("Hens in your flock of this breed")).to_be_visible()
        expect(page.get_by_role("link", name="Pepper")).to_be_visible()

        # Photo checks with no AI available: calm note, disabled buttons, no crash
        for r in ["/identify", "/health-check"]:
            go(r)
            expect(page.get_by_text("Photo checks need the online version of the app. Everything else works offline.")).to_be_visible()
            expect(page.get_by_label("Take a photo")).to_be_disabled()
        go("/identify")
        page.get_by_role("button", name="🥚 Egg").click()
        expect(page.get_by_role("button", name="Identify this egg")).to_be_disabled()

        # Every route renders without errors
        for r in ["/", "/flock", "/eggs", "/eggs/history", "/coop", "/care", "/feed", "/brooder", "/learn", "/recipes", "/shop", "/account", "/identify", "/health-check", "/breeds", "/breeds/silkie"]:
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

        if os.path.isdir(DIST_DEMO):
            ai_flow(browser, errors, args.ai_shots or args.shots)
        else:
            print("dist-demo missing: run npm run build:demo to include the photo check flow")

        browser.close()
    if httpd:
        httpd.shutdown()
    if errors:
        print("Console problems:\n" + "\n".join(errors))
        sys.exit(1)
    print("E2E OK (" + ("file://" if args.file else "http") + ")")


FAKE_CLAUDE = r"""
(() => {
  const BIRD = {isChicken: true, sex: "hen", ageGuess: "Adult, likely over a year", notes: "Barred feathers and a single red comb. Barred Rocks and Dominiques look alike; the comb points to a Rock.",
    topMatches: [{breed: "Barred Plymouth Rock", confidence: "high", why: "Even black and white barring with a single comb and yellow legs."},
                 {breed: "Dominique", confidence: "low", why: "Similar barring, but Dominiques have a rose comb."}]};
  const EGG = {eggColor: "green", sizeGuess: "large", notes: "Soft sage green shell in daylight.",
    likelyBreeds: [{breed: "Easter Egger", why: "Easter Eggers often lay green shells."}, {breed: "Olive Egger", why: "Some lay lighter green shades."}]};
  const HEALTH = {photoUsable: true, urgency: "soon", summary: "The foot looks swollen with a dark spot on the pad, which can point to bumblefoot. Worth a closer look in the next day or two.",
    possibleIssues: [
      {name: "Bumblefoot", likelihood: "likely", signsSeen: "Swelling on the foot pad with a dark scab in the center.", checkAtHome: ["Feel both feet for heat or swelling", "Look for a black scab on the pad", "Watch whether she favors one leg"], careSteps: ["Move her to a clean, dry pen with soft bedding", "Soak the foot in warm water and keep it clean", "Lower roosts and remove sharp edges in the run"]},
      {name: "Scaly leg mites", likelihood: "less likely", signsSeen: "Some leg scales look slightly raised.", checkAtHome: ["Check if leg scales lift or look crusty"], careSteps: ["Clean roosts and nest boxes", "Ask a poultry vet about treatment options"]}],
    seeVetIf: ["The swelling spreads or she stops walking", "Pus, a bad smell or fever like heat in the foot", "Sudden deaths or many sick birds: report to your state veterinarian or local extension office"]};
  window.__aiCalls = [];
  const sample = {
    limits: async () => ({ maxInputBytes: 262144, images: { maxCount: 3, maxInputBytes: 20000000, mediaTypes: ["image/jpeg", "image/png"] } }),
    json: async (prompt, opts) => {
      window.__aiCalls.push({ images: (opts && opts.images || []).length, tier: opts && opts.modelTier, types: (opts && opts.images || []).map(b => b.type) });
      await new Promise(r => setTimeout(r, 250));
      if (opts && opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "aborted" };
      if (/health problems/.test(prompt)) return HEALTH;
      if (/egg/.test(prompt.split("\n")[0])) return EGG;
      return BIRD;
    },
  };
  Object.defineProperty(window, "claude", { value: { use: async (n) => (n === "sample" ? sample : null) }, configurable: true });
})();
"""


def ai_flow(browser, errors, shots):
    """Demo build with a fake claude.ai runtime: bird ID, egg ID, health check, save to log."""
    import base64
    from PIL import Image, ImageDraw
    import io
    im = Image.new("RGB", (1600, 1200), (120, 160, 110))
    d = ImageDraw.Draw(im)
    d.ellipse((500, 250, 1100, 950), fill=(200, 140, 80))
    d.polygon([(760, 260), (800, 120), (840, 260)], fill=(200, 30, 30))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80)
    jpeg = {"name": "hen.jpg", "mimeType": "image/jpeg", "buffer": buf.getvalue()}

    httpd, base = serve(DIST_DEMO)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(FAKE_CLAUDE)
    page = ctx.new_page()
    page.on("console", lambda m: m.type in ("error", "warning") and errors.append(f"ai {m.type}: {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"ai pageerror: {e}"))

    def go(route):
        page.goto(f"{base}#{route}")
        page.wait_for_selector("#page-title")

    def shot(name):
        if shots:
            page.locator(".toast").wait_for(state="detached", timeout=6000)
            page.evaluate("document.activeElement && document.activeElement.blur()")
            os.makedirs(shots, exist_ok=True)
            page.screenshot(path=os.path.join(shots, f"{name}.png"), full_page=False)

    def to_top(sel):
        page.evaluate("""(s) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + window.scrollY - 76; window.scrollTo(0, y); }""", sel)
        page.wait_for_timeout(150)

    # Bird ID
    go("/identify")
    expect(page.get_by_text("Photo checks need the online version")).to_have_count(0)
    page.get_by_label("Choose from library").set_input_files(jpeg)
    expect(page.get_by_role("img", name="Photo 1")).to_be_visible()
    page.get_by_role("button", name="Identify this bird").click()
    expect(page.get_by_text("Thinking...")).to_be_visible()
    expect(page.get_by_role("heading", name="Barred Plymouth Rock")).to_be_visible()
    expect(page.get_by_text("High confidence")).to_be_visible()
    calls = page.evaluate("window.__aiCalls")
    assert calls[-1]["images"] == 1 and calls[-1]["tier"] == "default" and calls[-1]["types"] == ["image/jpeg"], calls
    to_top('h2.section-title')
    shot("ai-identify-bird")

    # Cancel works and shows nothing
    page.get_by_role("button", name="Identify this bird").click()
    page.get_by_role("button", name="Cancel").click()
    expect(page.get_by_text("Thinking...")).to_have_count(0)
    expect(page.get_by_role("alert")).to_have_count(0)

    # Egg ID with flock highlight
    page.get_by_role("button", name="🥚 Egg").click()
    page.get_by_label("Choose from library").set_input_files(jpeg)
    page.get_by_role("button", name="Identify this egg").click()
    expect(page.get_by_text("It cannot prove which hen laid it", exact=False)).to_be_visible()
    expect(page.get_by_role("heading", name="Could be from")).to_be_visible()
    expect(page.get_by_text("Olive (Easter Egger)")).to_be_visible()
    to_top('section[aria-label="Egg results"]')
    shot("ai-identify-egg")

    # Hen form: identify breed from photo fills the breed
    go("/flock")
    page.get_by_role("button", name="+ Add hen").click()
    page.get_by_role("button", name="Identify breed from photo").click()
    inner = page.locator("dialog[open]").last
    inner.get_by_label("Choose from library").set_input_files(jpeg)
    inner.get_by_role("button", name="Identify this bird").click()
    inner.get_by_role("button", name="Use this breed").first.click()
    expect(page.locator("#breed-btn")).to_have_text("Barred Rock")
    page.keyboard.press("Escape")

    # Health check from a hen's page
    go("/flock")
    page.get_by_role("link", name="Daisy").click()
    page.get_by_role("link", name="Check this hen with a photo").click()
    expect(page.locator("#page-title")).to_have_text("Photo health check")
    expect(page.get_by_role("radio", name="Daisy")).to_have_attribute("aria-checked", "true")
    page.get_by_role("button", name="Swollen foot").click()
    page.get_by_role("button", name="Limping").click()
    page.get_by_label("Choose from library").set_input_files([jpeg, {**jpeg, "name": "foot.jpg"}])
    page.get_by_role("button", name="Check this photo").click()
    expect(page.get_by_text("Keep a close eye")).to_be_visible()
    expect(page.get_by_role("heading", name="Bumblefoot")).to_be_visible()
    expect(page.get_by_text("What we noticed").first).to_be_visible()
    expect(page.get_by_text("This is a photo check, not a diagnosis.", exact=False)).to_be_visible()
    assert page.evaluate("window.__aiCalls")[-1]["images"] == 2
    to_top('.urgency')
    shot("ai-health-check")
    page.get_by_role("checkbox", name="Feel both feet for heat or swelling").click()
    page.get_by_role("button", name="Save to health log").click()
    expect(page.get_by_text("Saved to the health log for Daisy.")).to_be_visible()
    page.get_by_role("button", name="Open Daisy").click()
    expect(page.get_by_text("Photo check", exact=True).first).to_be_visible()
    expect(page.get_by_text("Photo check (soon)", exact=False)).to_be_visible()
    go("/care")
    expect(page.get_by_text("Photo check follow-up")).to_be_visible()

    # Breed guide screenshots
    go("/breeds")
    page.get_by_role("radio", name="Cold winters").click()
    page.get_by_role("radio", name="Egg basket colors").click()
    page.get_by_role("radio", name="Small backyard, confined").click()
    expect(page.get_by_text("Adds olive eggs to your basket").first).to_be_visible()
    to_top('.recs')
    shot("ai-breeds-recommender")
    go("/breeds")
    shot("ai-breeds-list")
    go("/breeds/easter-egger")
    expect(page.get_by_text("Hens in your flock of this breed")).to_be_visible()
    shot("ai-breed-detail")

    # Dark mode pass on the health check
    page.emulate_media(color_scheme="dark")
    go("/breeds/barred-plymouth-rock")
    expect(page.get_by_role("link", name="Pepper")).to_be_visible()
    shot("ai-breed-detail-dark")

    # 360px wide: no horizontal overflow on new screens
    page.set_viewport_size({"width": 360, "height": 740})
    for r in ["/identify", "/health-check", "/breeds", "/breeds/mille-fleur-duccle"]:
        go(r)
        assert not page.evaluate("document.documentElement.scrollWidth > window.innerWidth"), f"overflow on {r}"
    ctx.close()
    httpd.shutdown()


if __name__ == "__main__":
    main()
