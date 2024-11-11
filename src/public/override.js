const org = window.fetch;
window.fetch = (url, option) => {
    if (url?.includes?.(".dexscreener.com")) {
        url = (url + "").replace(/([a-z]+)\.dexscreener\.com/g, `${window.location.host}/dajjal/$1`)
        url = url.replace("https:", window.location.protocol);
    }
    return org(url, option);
}


/**
 *
 * @type {{
 *    addresses: string[],
 *    pair: any
 * }[]}
 * @private
 */
const _defaultConfig = []
window.config = _defaultConfig;

const ws = new WebSocket(`ws${window.location.protocol.replace("http", '')}//${window.location.hostname}:9933/override`);

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
        return await func(n);
    }
}

window.filter_avro = (func) => {
    return async (s, c, f) => {
        let R = await func(s, c, f);
        if (R.logs) {
            R.logs = R.logs.map(log => {
                return handlePairOverride(log);
            })
        }
        return R;
    }
}

window.filter_decode = (func) => {
    return (o) => {
        const R = func(o);
        if (R?.pairs && Array.isArray(R.pairs)) {
            R.pairs = R.pairs.map(p => handlePairOverride(p))
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

function deepMerge(object1, object2) {
    const result = {...object1};

    if (Array.isArray(object1) && Array.isArray(object2)) {
        return [...object1, ...object2];
    }

    Object.keys(object2).forEach((key) => {
        if (Array.isArray(object2[key]) && Array.isArray(result[key])) {
            const ov = object2[key];
            let c = [...result[key]];
            for (let i = 0; i < ov.length; i++) {
                c[i] = ov[i];
            }
            result[key] = c;
        } else if (typeof object2[key] === 'object' && object2[key] !== null && typeof result[key] === 'object') {
            result[key] = deepMerge(result[key], object2[key]);
        } else {
            result[key] = object2[key];
        }
    });

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
