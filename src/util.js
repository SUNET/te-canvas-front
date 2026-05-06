import React from "react";

// Helper function for when you just want to check that the return code is 200
// and get the body as JSON.
export function parseResponse(fetchPromise, jsonCallback) {
    fetchPromise
        .then(resp => {
            if (resp.status !== 200)
                throw new Error(
                    `Unexpected HTTP response from backend: ${resp.status} ${resp.statusText}`
                );
            return resp.json();
        })
        .then(jsonCallback)
        .catch(e => console.error(e));
}

export function getLtik() {
    let searchParams = new URLSearchParams(window.location.search);
    let ltik = searchParams.get("ltik");
    if (!ltik) throw new Error("Missing lti key.");
    return ltik;
}

// Create an URL from baseUrl and path, appending LTI JWT and params as query string
export function urlParams(baseUrl, path, params, { addLtik = true } = {}) {
    const url = new URL(path, baseUrl);

    if (addLtik && window.injectedEnv.NO_LTI !== "1") {
        params.ltik = getLtik();
    }

    url.search = new URLSearchParams(params);
    console.log("====================== [urlParams] =======================");
    console.log(`baseUrl: ${baseUrl}`);
    console.log(`path: ${path}`);
    console.log(`params: ${JSON.stringify(params)}`);
    console.log(`params.ltik: ${params.ltik}`);
    console.log(`addLtik: ${addLtik}`);
    console.log("====================== END =======================");
    return url;
}

export let MyContext = React.createContext();

/**
 * Resolves an object's id or title field.
 *
 * The backend now normalizes TimeEdit objects with top-level `id` and `title`
 * keys (see TimeEdit._unpack_object). This helper prefers those, then falls
 * back to the legacy `general.<type>` / `general.<type>_ref` keys for safety
 * with older payloads.
 */
export function createField(objectToCreateFrom, type) {
    if (objectToCreateFrom?.[type] != null && objectToCreateFrom[type] !== "") {
        return objectToCreateFrom[type];
    }
    let fieldToReturn = "";
    if (objectToCreateFrom.hasOwnProperty("general." + type)) {
        fieldToReturn = objectToCreateFrom["general." + type];
    }
    if (objectToCreateFrom.hasOwnProperty("general." + type + "_ref")) {
        fieldToReturn = objectToCreateFrom["general." + type + "_ref"];
    }
    return fieldToReturn;
}
