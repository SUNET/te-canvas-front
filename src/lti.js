let fs = require("fs");
let path = require("path");
let http = require("http");

let lti = require("ltijs").Provider;

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
lti.app.all("/api/*", function (req, res, next) {
    let extras = platformExtras.get(res.locals.token.platformId);

    console.log("=========== lti.app.all ===========")
    console.log(extras)
    console.log("extras.authorized_roles")
    console.log(extras.authorized_roles)
    console.log("res.locals.context.roles")
    console.log(res.locals.context.roles)
    console.log(checkRoles(extras.authorized_roles, res.locals.context.roles))

    console.log("**********************************")
    
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
