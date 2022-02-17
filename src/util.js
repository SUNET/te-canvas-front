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
