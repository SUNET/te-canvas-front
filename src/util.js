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

export function urlParams(baseUrl, path, params) {
    let url = new URL(path, baseUrl);
    if (!window.injectedEnv.NO_LTI) params.ltik = getLtik();
    url.search = new URLSearchParams(params);
    return url;
}

export let MyContext = React.createContext();
