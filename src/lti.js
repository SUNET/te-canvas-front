let crypto = require("crypto");
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

const AUTHORIZED_ROLES = process.env.AUTHORIZED_ROLES.split(" ");

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

function checkRoles(roles) {
    for (let r of AUTHORIZED_ROLES) {
        if (roles.includes(r)) {
            return true;
        }
    }
    return false;
}

// This just redirects "/" to "/index.html". The access check here is more for
// UI than for security. The important check is before passing requests to the
// API, set up in the block below this.
lti.onConnect((token, req, res, next) => {
    if (!checkRoles(res.locals.context.roles)) {
        res.set("Content-Type", "text/plain");
        res.status(401).send(
            "Unauthorized\n" +
                "Wanted: " +
                AUTHORIZED_ROLES +
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
lti.app.all("/api/*", function (req, res, next) {
    // Check that the user has an authorized role
    if (!checkRoles(res.locals.context.roles)) {
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
        process.env.API_URL,
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

    await lti.registerPlatform({
        name: process.env.PLATFORM_NAME,
        clientId: process.env.CLIENT_ID,
        url: CANVAS_URL,
        authenticationEndpoint: CANVAS_AUTH_ENDPOINT,
        accesstokenEndpoint: CANVAS_TOKEN_ENDPOINT,
        authConfig: {
            method: "JWK_SET",
            key: CANVAS_JWK_ENDPOINT
        }
    });
}

setup();
