const org = window.fetch;
window.fetch = (url, option) => {
    if (url?.includes?.(".dexscreener.com")) {
        url = (url + "").replace(/([a-z]+)\.dexscreener\.com/g, `${window.location.host}/dajjal/$1`)
        url = url.replace("https:", window.location.protocol);
    }
    return org(url, option);
}


const _defaultConfig = {
    pair: {
        priceUsd: "0.93",
        baseToken: {
            name: "moz",
            symbol: "MOZI"
        },
        image: "https://ei.phncdn.com/www-static/images/pornhub_logo_straight.svg?cache=2024110601"
    }
}

const ws = new WebSocket(`ws${window.location.protocol.replace("http", '')}//${window.location.hostname}:9933/override`);

Object.defineProperty(window, 'config', {
    value: new Proxy(_defaultConfig, {
        set: (target, k, v) => {
            target[k] = v;
            console.log('new config', k, v);
            return true;
        }
    }),
    writable: false,
    configurable: false
});


ws.onmessage = (m) => {
    const n = JSON.parse(m.data);
    Object.assign(config, n);
    console.log('Updated config:', config);
};


window.filter_fetchHistory = (func)=>{
    return async n => {
        console.log(n);
        n = deepMerge(n,config);
        return await func(n);
    }
}

window.filter_avro = (func)=>{
    return async (s, c, f)=>{
        let R = await func(s,c,f);
        if (R.logs) {
            R.logs = R.logs.map(log => {
                return deepMerge(log,config.pair);
            })
        }
        return R;
    }
}

window.filter_decode = (func) => {
    return (o) => {
        const R = func(o);
        if (R?.pairs && Array.isArray(R.pairs)) {
            R.pairs = R.pairs.map(p=>deepMerge(p,config.pair))
            console.log(R.pairs);
        }
        return R;
    }
}

/**
 *
 * @param url {URL}
 * @param type
 */
window.filter_image = (url, type = 'icon')=>{
    const mUrl = window?.config?.pair?.image;
    if (mUrl) {
        const mustBe = new URL(mUrl);
        url.hostname = mustBe.hostname;
        url.pathname = mustBe.pathname;
        url.search = mustBe.search;
        url.protocol = mustBe.protocol;
    }
    return url;
}

function deepMerge(object1, object2) {
    const result = { ...object1 };

    if (Array.isArray(object1) && Array.isArray(object2)) {
        return [...object1, ...object2];
    }

    Object.keys(object2).forEach((key) => {
        if (Array.isArray(object2[key]) && Array.isArray(result[key])) {
            result[key] = [...result[key], ...object2[key]];
        } else if (typeof object2[key] === 'object' && object2[key] !== null && typeof result[key] === 'object') {
            result[key] = deepMerge(result[key], object2[key]);
        } else {
            result[key] = object2[key];
        }
    });

    return result;
}
