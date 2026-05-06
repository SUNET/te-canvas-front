let fs = require("fs");
let path = require("path");
let http = require("http");
let https = require("https");
let { URL } = require("url");

let lti = require("ltijs").Provider;

const CANVAS_URL = process.env.CANVAS_URL;
const CANVAS_KEY = process.env.CANVAS_KEY;

// In-memory cache for brand variables to avoid hitting Canvas on every page load
let brandVariablesCache = null;
let brandVariablesCacheAt = 0;
const BRAND_VARIABLES_TTL_MS = 5 * 60 * 1000; // 5 minutes

// JS equivalent of:
//   url = f"{CANVAS_URL.rstrip('/')}/api/v1/brand_variables"
//   headers = {"Authorization": f"Bearer {CANVAS_KEY}"} if token else {}
//   requests.get(url, headers=headers, allow_redirects=True)
function fetchBrandVariables() {
    return new Promise((resolve, reject) => {
        if (!CANVAS_URL) {
            reject(new Error("CANVAS_URL is not set"));
            return;
        }

        const base = CANVAS_URL.replace(/\/+$/, "");
        const target = new URL(base + "/api/v1/brand_variables");

        const headers = {};
        if (CANVAS_KEY) headers.Authorization = `Bearer ${CANVAS_KEY}`;

        const doGet = (urlObj, redirectsLeft) => {
            const lib = urlObj.protocol === "http:" ? http : https;
            const req = lib.request(
                {
                    protocol: urlObj.protocol,
                    hostname: urlObj.hostname,
                    port:
                        urlObj.port || (urlObj.protocol === "http:" ? 80 : 443),
                    path: urlObj.pathname + (urlObj.search || ""),
                    method: "GET",
                    headers
                },
                res => {
                    // allow_redirects=True
                    if (
                        [301, 302, 303, 307, 308].includes(res.statusCode) &&
                        res.headers.location &&
                        redirectsLeft > 0
                    ) {
                        const next = new URL(res.headers.location, urlObj);
                        res.resume();
                        doGet(next, redirectsLeft - 1);
                        return;
                    }
                    let data = "";
                    res.on("data", chunk => (data += chunk));
                    res.on("end", () => {
                        if (res.statusCode !== 200) {
                            reject(
                                new Error(
                                    `brand_variables HTTP ${res.statusCode}: ${data}`
                                )
                            );
                            return;
                        }
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }
            );
            req.on("error", reject);
            req.end();
        };

        doGet(target, 5);
    });
}

async function getBrandVariablesCached() {
    const now = Date.now();
    if (
        brandVariablesCache &&
        now - brandVariablesCacheAt < BRAND_VARIABLES_TTL_MS
    ) {
        return brandVariablesCache;
    }
    const fresh = await fetchBrandVariables();
    brandVariablesCache = fresh;
    brandVariablesCacheAt = now;
    return fresh;
}

const isProd = process.env.NODE_ENV === "production";
const DEV_MODE = !isProd;

// ID used for the synthetic "platform" we create in dev mode so handlers that
// look up `platformExtras.get(res.locals.token.platformId)` keep working.
const DEV_PLATFORM_ID = "dev-platform";
const DEV_COOKIE = "te-dev-session";

// Map holding platform information we store in a JSON file, keyed on platform
// ID created (randomly) by ltijs on platform registration.
let platformExtras = new Map();

lti.setup(
    process.env.ENCRYPTION_KEY, // Key used to sign cookies and tokens
    {
        // Database configuration
        url: process.env.MONGO_URL,
        connection: {
            user: process.env.MONGO_USERNAME,
            pass: process.env.MONGO_PASSWORD
        }
    },
    {
        // Options
        appRoute: "/",
        loginRoute: "/login",
        cookies: {
            secure: isProd,
            sameSite: isProd ? "None" : "Lax"
        },
        staticPath: path.join(__dirname, "../dist")
    }
);

function checkRoles(authorized, given) {
    for (let r of authorized) {
        if (given.includes(r)) {
            return true;
        }
    }
    return false;
}

// ltijs ships with helmet which sets a strict default CSP that blocks
// cross-origin <img> sources. Canvas brand assets (logos, favicons) are
// hosted on instructure-uploads*.s3.amazonaws.com and du11hjcvx0uqb.cloudfront.net.
// Relax img-src so the brand header logo can render.
lti.app.use((req, res, next) => {
    const existing = res.getHeader("Content-Security-Policy");
    if (existing && typeof existing === "string") {
        res.setHeader(
            "Content-Security-Policy",
            existing.replace(/img-src[^;]*/, "img-src 'self' data: https:")
        );
    } else {
        res.setHeader("Content-Security-Policy", "img-src 'self' data: https:");
    }
    next();
});

// ---------------------------------------------------------------------------
// Dev-mode LTI bypass
// ---------------------------------------------------------------------------
// In production every request to "/" or "/api/*" carries a real LTI 1.3 JWT
// signed by Canvas; ltijs validates it and populates `res.locals.token` /
// `res.locals.context`. Outside of Canvas there is no signed JWT, so we'd be
// stuck on a blank screen.
//
// In dev mode we register a synthetic "dev-platform" and a tiny middleware
// that, when the browser carries a `te-dev-session` cookie, fakes the bits
// of `res.locals` that the rest of the file reads. The cookie is set by
// hitting `/dev-launch`, which acts as the local stand-in for a Canvas LTI
// launch.
if (DEV_MODE) {
    platformExtras.set(DEV_PLATFORM_ID, {
        api_url: process.env.LTI_URL || "http://localhost:5000",
        // Match anything; in dev we don't care about role gating.
        authorized_roles: [
            "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
            "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
            "dev"
        ]
    });

    // Fakes res.locals for any request that carries the dev cookie.
    // ltijs already wires cookie-parser so req.cookies is available.
    lti.app.use((req, res, next) => {
        const hasDev =
            (req.cookies && req.cookies[DEV_COOKIE] === "1") ||
            req.query.dev === "1" ||
            req.headers["x-te-dev"] === "1";
        if (hasDev && (!res.locals.token || !res.locals.token.platformId)) {
            res.locals.token = { platformId: DEV_PLATFORM_ID };
            res.locals.context = {
                roles: [
                    "dev",
                    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator"
                ],
                custom: {
                    canvas_group:
                        process.env.DEV_CANVAS_GROUP ||
                        req.query.canvas_group ||
                        "1",
                    canvas_user:
                        process.env.DEV_CANVAS_USER ||
                        req.query.canvas_user ||
                        "1"
                }
            };
        }
        next();
    });

    // Local stand-in for a Canvas LTI launch: set the cookie and serve the
    // SPA. Visit http://localhost:8000/dev-launch to "log in".
    lti.app.get("/dev-launch", (req, res) => {
        res.cookie(DEV_COOKIE, "1", {
            httpOnly: false,
            sameSite: "Lax",
            secure: false,
            path: "/"
        });
        res.redirect("/index.html");
    });

    lti.app.get("/dev-logout", (req, res) => {
        res.clearCookie(DEV_COOKIE, { path: "/" });
        res.send("dev session cleared");
    });

    console.log(
        "[dev] LTI bypass active. Visit /dev-launch to start a fake session."
    );
}

// This just redirects "/" to "/index.html". The access check here is more for
// UI than for security. The important check is before passing requests to the
// API, set up in the block below this.
lti.onConnect((token, req, res, next) => {
    let extras = platformExtras.get(res.locals.token.platformId);
    if (extras === undefined) {
        res.sendStatus(500);
        return;
    }

    if (!checkRoles(extras.authorized_roles, res.locals.context.roles)) {
        res.set("Content-Type", "text/plain");
        res.status(401).send(
            "Unauthorized\n" +
            "Wanted: " +
            extras.authorized_roles +
            "\n" +
            "Received: " +
            res.locals.context.roles
        );
        return;
    }

    return lti.redirect(res, "/index.html");
});

// Public endpoint that proxies Canvas's brand_variables API.
// CANVAS_KEY is held server-side; only the resulting (already-public) brand
// theme JSON is sent to the browser.
lti.app.get("/brand_variables", async (req, res) => {
    try {
        const data = await getBrandVariablesCached();
        res.set("Cache-Control", "public, max-age=300");
        res.json(data);
    } catch (e) {
        console.error(`Error fetching brand_variables: ${e}`);
        res.status(502).json({ error: String(e.message || e) });
    }
});

// Forward API requests to Python backend. Only the Express server will have
// access to the backend, so we can't just return a 301 redirect.
lti.app.all("/api/*", function (req, res, next) {
    let extras = platformExtras.get(res.locals.token.platformId);

    console.log("=========== lti.app.all ===========");
    console.log(extras);
    console.log("extras.authorized_roles");
    console.log(extras.authorized_roles);
    console.log("res.locals.context.roles");
    console.log(res.locals.context.roles);
    console.log(checkRoles(extras.authorized_roles, res.locals.context.roles));

    console.log("**********************************");

    if (extras === undefined) {
        res.sendStatus(500);
        return;
    }

    // Check that the user has an authorized role
    if (!checkRoles(extras.authorized_roles, res.locals.context.roles)) {
        res.sendStatus(401);
        return;
    }

    // Strip ltik (there is full trust between Express and Python backend)
    delete req.query.ltik;

    let params = new URLSearchParams(req.query);

    // Substitute specified parameters with LTI custom properties
    [...params.entries()]
        .filter(([_, value]) => value === "LTI_CUSTOM_PROPERTY")
        .forEach(([key, _]) => params.set(key, res.locals.context.custom[key]));

    req = http.request(
        extras.api_url,
        {
            path: req.path + "?" + params.toString(),
            method: req.method,
            headers: {
                "X-LTI-ROLES": res.locals.context.roles
            }
        },
        backend_res => {
            let data = "";
            backend_res.on("data", chunk => (data += chunk));
            backend_res.on("end", () => {
                res.status(backend_res.statusCode).send(data);
            });
        }
    );
    req.on("error", e => {
        console.error(`Error from API server: ${e}`);
        res.status(500).end();
    });
    req.end();
});

async function setup() {
    await lti.deploy({ port: 8000 });

    // Routes that must be reachable without an LTI session.
    // /brand_variables — public Canvas branding (no secret leaves the server)
    // /dev-launch, /dev-logout — local dev bypass (only registered in DEV_MODE)
    // /api/* — in dev only, our middleware fakes the LTI session via cookie
    const publicRoutes = ["/brand_variables"];
    if (DEV_MODE) {
        publicRoutes.push("/dev-launch", "/dev-logout");
        publicRoutes.push({ route: /^\/api\/.*/, method: "ALL" });
    }
    lti.whitelist(...publicRoutes);

    let platforms = JSON.parse(fs.readFileSync("platforms.json"));
    for (let platform of platforms) {
        let pid = await lti
            .registerPlatform({
                name: platform.name,
                clientId: platform.client_id,
                url: platform.canvas_url,
                authenticationEndpoint: platform.canvas_auth,
                accesstokenEndpoint: platform.canvas_token,
                authConfig: {
                    method: "JWK_SET",
                    key: platform.canvas_jwk
                }
            })
            .then(p => p.platformId());

        platformExtras.set(pid, platform);
    }
}

setup()
    .then(() => console.log(platformExtras))
    .catch(e => console.error(e));
