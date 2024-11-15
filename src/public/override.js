const org = window.fetch;
let currentOverride = getOverride(getUrlAddress());
window.fetch = (url, option) => {
    if (url?.includes?.(".dexscreener.com")) {
        url = (url + "").replace(/([a-z]+)\.dexscreener\.com/g, `${window.location.host}/dajjal/$1`)
        url = url.replace("https:", window.location.protocol);

        if (url.includes("/dex/log")) {
            currentOverride ||= getOverride(getUrlAddress());
            const ovUrl = currentOverride?.overrideLogs
            if (ovUrl) {
                url = ovUrl;
            }

            window.overrideLogsUrl ||= url;
        }
    }
    return org(url, option);
}
const wsBase = new URL(window.location.href);
wsBase.protocol = window.location.protocol.startsWith("https") ? "wss":"ws";


/**
 *
 * @type {{
 *    addresses: string[],
 *    pair: any
 * }[]}
 * @private
 */
const _defaultConfig = typeof _INIT_OVERRIDES !== 'undefined' ? _INIT_OVERRIDES || []:[];
window.config = _defaultConfig;

const wsOverride = new URL(wsBase);
wsOverride.pathname = `/override`;
const ws = new WebSocket(wsOverride);

ws.onmessage = (m) => {
    window.config = JSON.parse(m.data);
    console.log('Updated config:', config);
};


window.filter_fetchHistory = (func) => {
    return async n => {
        if (n.pair) {
            window.fetchedHistory = n.pair;
            n = {...n, pair: handlePairOverride(n.pair)};
        }
        console.log('HISTORY',n);
        return await func(n);
    }
}

window.filter_avro = (func) => {
    return async (s, c, f) => {
        let R = await func(s, c, f);
        console.log("AVRO",R);
        if (R.logs) {
            // R.logs = R.logs.map(log => {
            //     return handlePairOverride(log);
            // })
            currentOverride ||= getOverride(getUrlAddress());
            if (currentOverride.overrideLogs) {
                R.logs = R.logs.map(log => ({
                    ...log,
                    priceUsd: window?.fetchedHistory?.priceUsd || log.priceUsd
                }))
            }
        } else {
            for (let key of ['pair', 'pairs', '']) {
                let o = !key ? R:R[key];
                if (!o || o?.length === 0) continue;

                if (Array.isArray(o)) {
                    o = o.map(handlePairOverride)
                } else if (typeof o === 'object') {
                    o = handlePairOverride(o);
                } else continue;

                if (!key) {
                    R = o;
                } else {
                    R[key] = o;
                }
                console.log("AVRO OVERRIDE",key,R);
                break;
            }
        }
        return R;
    }
}

window.filter_decode = (func) => {
    return (o) => {
        const R = func(o);

        if (R?.pairs && Array.isArray(R.pairs)) {
            R.pairs = R.pairs.map(p => handlePairOverride(p))
        } else if (R.pair) {
            R.pair = handlePairOverride(R.pair);
        }
        return R;
    }
}

/**
 *
 * @param url {URL}
 * @param type
 */
window.filter_image = (url, type = 'icon') => {
    const sUrl = url.toString();

    const address = sUrl.split("/").at(-1)?.split(".")?.[0];
    const mUrl = getOverride(address.length < 7 ? getUrlAddress():address)?.[type === 'icon' ? "image" : "headerImage"];

    if (mUrl) {
        const mustBe = new URL(mUrl);
        url.hostname = mustBe.hostname;
        url.pathname = mustBe.pathname;
        url.search = mustBe.search;
        url.protocol = mustBe.protocol;
    }
    return url;
}
window.prepareHistory = async ()=>{
    const address = getUrlAddress();
    if (!address) throw("ADDRESS NOT FOUND");
    return await fetch(`/get-override?address=${address}`, {
        method: "POST",
        body: JSON.stringify(window.fetchedHistory || {})
    }).then(r => r.json());
}

function deepMerge(source, replacement) {
    if (!source || !replacement) {
        return source;
    }

    // Handle non-object types
    if (typeof source !== 'object') {
        return source;
    }

    // Create a deep clone of source to avoid mutations
    const result = Array.isArray(source) ? [...source] : {...source};

    // Iterate through source properties
    for (const key in result) {
        // Skip inherited properties
        if (!result.hasOwnProperty(key)) continue;

        // Check if replacement has this property
        if (!(key in replacement)) continue;

        // Handle arrays - replace entirely
        if (Array.isArray(result[key])) {
            if (Array.isArray(replacement[key])) {
                result[key] = [...replacement[key]];
            }
            continue;
        }

        // Handle nested objects
        if (
            result[key] &&
            typeof result[key] === 'object' &&
            replacement[key] &&
            typeof replacement[key] === 'object' &&
            !Array.isArray(result[key])
        ) {
            result[key] = deepMerge(result[key], replacement[key]);
            continue;
        }

        // Replace primitive values
        result[key] = replacement[key];
    }

    return result;
}

function getOverride(address) {
    if (!address) return undefined;
    return window.config?.find?.(o => o.addresses.includes(address?.toLowerCase?.()))?.pair;
}
function getUrlAddress() {
    const paths = window.location.pathname.split("/");
    return  paths.length >= 2 ? paths.at(-1) : undefined;
}
function handlePairOverride(pair) {
    try {
        const urlAddress = getUrlAddress();

        const address = pair?.baseToken?.address || pair?.address || urlAddress;
        const override = getOverride(address);

        if (!override) return pair;

        return deepMerge(pair, override);
    } catch (e){
        console.error(e);
        return pair;
    }
}


window.filter_callback = async (func)=>{
    // takes 1h =)
}
