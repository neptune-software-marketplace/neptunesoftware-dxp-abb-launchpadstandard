'undefined' == typeof neptune && (neptune = {}), neptune.ElementQuery = {
    register: function (i, s) {
        let t = new this._ElementQueryClass(s);
        sap.ui.core.ResizeHandler.register(i, function (s) {
            t.resize(i, s.size.width)
        })
    },
    _ElementQueryClass: function (s) {
        s = s || {}, this.isolate = s.isolate || !1, this.debug = s.debug || !1, this.debugCallback = s.debugCallback || function (s) { }, this.callback = s.callback || function (s) { }, this.prefix = s.prefix || 'nepCanvas', this.canvas = {
            XXXXL: 8,
            XXXL: 7,
            XXL: 6,
            XL: 5,
            L: 4,
            M: 3,
            S: 2,
            XS: 1
        }, this.width = {
            xxxlarge: 2360,
            xxlarge: 1880,
            xlarge: 1580,
            large: 1280,
            medium: 980,
            small: 680,
            xsmall: 380
        }, this.size = 9, s.width && (this.width.xxxlarge = s.width.xxxlarge || this.width.xxxlarge, this.width.xxlarge = s.width.xxlarge || this.width.xxlarge, this.width.xlarge = s.width.xlarge || this.width.xlarge, this.width.large = s.width.large || this.width.large, this.width.medium = s.width.medium || this.width.medium, this.width.small = s.width.small || this.width.small, this.width.xsmall = s.width.xsmall || this.width.xsmall), this.resize = function (s, i) {
            let t, e;
            0 !== i && (this.size > this.canvas.XXXXL && i > this.width.xxxlarge || i > this.width.xxxlarge && this.size !== this.canvas.XXXXL ? t = this.canvas.XXXXL : i <= this.width.xxxlarge && i > this.width.xxlarge && this.size !== this.canvas.XXXL ? t = this.canvas.XXXL : i <= this.width.xxlarge && i > this.width.xlarge && this.size !== this.canvas.XXL ? t = this.canvas.XXL : i <= this.width.xlarge && i > this.width.large && this.size !== this.canvas.XL ? t = this.canvas.XL : i <= this.width.large && i > this.width.medium && this.size !== this.canvas.L ? t = this.canvas.L : i <= this.width.medium && i > this.width.small && this.size !== this.canvas.M ? t = this.canvas.M : i <= this.width.small && i > this.width.xsmall && this.size !== this.canvas.S ? t = this.canvas.S : i <= this.width.xsmall && this.size !== this.canvas.XS && (t = this.canvas.XS), t && (this.size = t, this.debug && console.log('Resizing: ' + s.getId() + ' to -> ' + this.size), s.removeStyleClass(this.prefix + 'Full'), s.removeStyleClass(this.prefix + 'XXXLarge'), s.removeStyleClass(this.prefix + 'XXLarge'), s.removeStyleClass(this.prefix + 'XLarge'), s.removeStyleClass(this.prefix + 'Large'), s.removeStyleClass(this.prefix + 'Medium'), s.removeStyleClass(this.prefix + 'Small'), s.removeStyleClass(this.prefix + 'XSmall'), this.isolate ? (e = this.getWidth(this.size), this.size < this.canvas.XXXXL ? s.addStyleClass(this.prefix + e) : s.addStyleClass(this.prefix + 'Full')) : e = this.addAllClasses(this.size, s), this.callback({
                width: i,
                size: e
            })), this.debug && (console.log('Width of ' + s.getId() + ' -> ' + i), this.debugCallback({
                width: i,
                size: this.getWidth(this.size)
            })))
        }, this.addAllClasses = function (s, i) {
            let t = 'XXXXLarge';
            return s <= this.canvas.XXXL && (t = 'XXXLarge', i.addStyleClass(this.prefix + t)), s <= this.canvas.XXL && (t = 'XXLarge', i.addStyleClass(this.prefix + t)), s <= this.canvas.XL && (t = 'XLarge', i.addStyleClass(this.prefix + t)), s <= this.canvas.L && (t = 'Large', i.addStyleClass(this.prefix + t)), s <= this.canvas.M && (t = 'Medium', i.addStyleClass(this.prefix + t)), s <= this.canvas.S && (t = 'Small', i.addStyleClass(this.prefix + t)), s <= this.canvas.XS && (t = 'XSmall', i.addStyleClass(this.prefix + t)), t
        }, this.getWidth = function (s) {
            return 1 === s ? 'XSmall' : 2 === s ? 'Small' : 3 === s ? 'Medium' : 4 === s ? 'Large' : 5 === s ? 'XLarge' : 6 === s ? 'XXLarge' : 7 === s ? 'XXXLarge' : 'XXXXLarge'
        }
    }
};