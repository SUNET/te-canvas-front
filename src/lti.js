let fs = require("fs");
let path = require("path");
let http = require("http");

let lti = require("ltijs").Provider;

const CANVAS_URL = "https://canvas.instructure.com";
const CANVAS_AUTH_ENDPOINT =
    "https://canvas.instructure.com/api/lti/authorize_redirect";
const CANVAS_TOKEN_ENDPOINT =
    "https://canvas.instructure.com/login/oauth2/token";
const CANVAS_JWK_ENDPOINT =
    "https://canvas.instructure.com/api/lti/security/jwks";

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
            secure: true,
            sameSite: "None"
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

// Forward API requests to Python backend. Only the Express server will have
// access to the backend, so we can't just return a 301 redirect.
lti.app.all("/api/*", function(req, res, next) {
    let extras = platformExtras.get(res.locals.token.platformId);
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

    http.request(
        extras.api_url,
        {
            path: req.path + "?" + params.toString(),
            method: req.method
        },
        backend_res => {
            let data = "";
            backend_res.on("data", chunk => (data += chunk));
            backend_res.on("end", () => {
                res.status(backend_res.statusCode).send(data);
            });
        }
    ).end();
});

async function setup() {
    await lti.deploy({ port: 8000 });

    let platforms = JSON.parse(fs.readFileSync("platforms.json"));
    for (let platform of platforms) {
        let pid = await lti
            .registerPlatform({
                name: platform.name,
                clientId: platform.client_id,
                url: CANVAS_URL,
                authenticationEndpoint: CANVAS_AUTH_ENDPOINT,
                accesstokenEndpoint: CANVAS_TOKEN_ENDPOINT,
                authConfig: {
                    method: "JWK_SET",
                    key: CANVAS_JWK_ENDPOINT
                }
            })
            .then(p => p.platformId());

        platformExtras.set(pid, platform);
    }
}

setup().then(() => console.log(platformExtras));
