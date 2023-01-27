sap.n.Planet9 = {
    function: function (opts) {
        let { id, query, method } = opts;
        let server = opts.url || AppCache.Url;

        let q = '';
        if (query) {
            let params = AppCache.isMobile ? `${query}&isMobile=true` : query;
            q = `?${encodeURIComponent(params)}`;
        } else {
            q = AppCache.isMobile ? '?isMobile=true' : '';
        }

        // Public
        let basePath = '/api/functions/';
        if (AppCache.isPublic) {
            basePath = '/public/functions/launchpad';
            id = '';
        }

        let url = `${server}${basePath}${id}${q}`;
        if (method) {
            url = `${server}${basePath}${id}/${method}${q}`;
        }

        jsonRequest({
            url,
            data: opts.data ? JSON.stringify(opts.data) : {},
            headers: opts.headers || {},
            xhrFields: {
                withCredentials: true
            },
            success: function (data) {
                if (opts.success) opts.success(data);
            },
            error: function (result, _status) {
                if (opts.error) opts.error(result);
            }
        });
    },

    arrayMove: function (arr, fromPos, toPos) {
        while (fromPos < 0) {
            fromPos += arr.length;
        }
        while (toPos < 0) {
            toPos += arr.length;
        }
        if (toPos >= arr.length) {
            let k = toPos - arr.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        arr.splice(toPos, 0, arr.splice(fromPos, 1)[0]);
    }
}