export function prettyJson(obj) {
    return JSON.stringify(obj, null, 4);
}

export function shortJson(obj) {
    return JSON.stringify(obj);
}
