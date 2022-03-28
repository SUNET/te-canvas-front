let crypto = require("crypto");
let path = require("path");
let http = require("http");

// Require Provider
let lti = require("ltijs").Provider;

// Setup provider
// TODO: Not configured for production
lti.setup(
    crypto.randomBytes(48).toString("hex"), // Key used to sign cookies and tokens
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
        loginRoute: "/login", // Optionally, specify some of the reserved routes
        cookies: {
            secure: false, // Set secure to true if the testing platform is in a different domain and https is being used
            sameSite: "" // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
        },
        devMode: true, // Set DevMode to false if running in a production environment with https
        staticPath: path.join(__dirname, "../dist") // Serve static files (React app) from ../dist
    }
);

// Set lti launch callback
// This just redirects "/" to "/index.html"
lti.onConnect((token, req, res, next) => {
    console.log("onConnect");
    return lti.redirect(res, "/index.html");
});

// Forward API requests to Python backend. Only the Express server will have
// access to the backend, so we can't just return a 301 redirect.
lti.app.all("/api/*", function (req, res, next) {
    // Strip ltik (there is full trust between Express and Python backend)
    delete req.query.ltik;
    let params = new URLSearchParams(req.query);

    // Substitute specified parameters with LTI custom properties
    [...params.entries()]
        .filter(([_, value]) => value === "LTI_CUSTOM_PROPERTY")
        .forEach(([key, _]) => params.set(key, res.locals.context.custom[key]));

    http.request(
        process.env.FLASK_URL,
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
    // Deploy server and open connection to the database
    await lti.deploy({ port: 8000 });

    // Register platform
    await lti.registerPlatform({
        name: process.env.PLATFORM_NAME,
        clientId: process.env.CLIENT_ID,
        url: process.env.CANVAS_URL,
        authenticationEndpoint: process.env.CANVAS_AUTH_ENDPOINT,
        accesstokenEndpoint: process.env.CANVAS_TOKEN_ENDPOINT,
        authConfig: {
            method: "JWK_SET",
            key: process.env.CANVAS_JWK_ENDPOINT
        }
    });
}

setup();
