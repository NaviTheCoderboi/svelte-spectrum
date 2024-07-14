function testUserAgent(re: RegExp) {
    if (typeof window === 'undefined' || window.navigator == null) {
        return false;
    }
    return (
        window.navigator.userAgentData?.brands.some((brand: { brand: string; version: string }) =>
            re.test(brand.brand)
        ) ?? re.test(window.navigator.userAgent)
    );
}

const testPlatform = (re: RegExp): boolean => {
    return typeof window !== 'undefined' && window.navigator != null
        ? re.test(window.navigator.userAgentData?.platform ?? window.navigator.platform)
        : false;
};

const cached = (fn: () => boolean) => {
    if (process.env.NODE_ENV === 'test') {
        return fn;
    }

    let res: boolean | null = null;
    return () => {
        if (res == null) {
            res = fn();
        }
        return res;
    };
};

export const isMac = cached(function () {
    return testPlatform(/^Mac/i);
});

export const isIPhone = cached(function () {
    return testPlatform(/^iPhone/i);
});

export const isIPad = cached(function () {
    return testPlatform(/^iPad/i) || (isMac() && navigator.maxTouchPoints > 1);
});

export const isIOS = cached(function () {
    return isIPhone() || isIPad();
});

export const isWebKit = cached(function () {
    return testUserAgent(/AppleWebKit/i) && !isChrome();
});

export const isChrome = cached(function () {
    return testUserAgent(/Chrome/i);
});

export const isFirefox = cached(function () {
    return testUserAgent(/Firefox/i);
});

export const isAndroid = cached(function () {
    return testUserAgent(/Android/i);
});
