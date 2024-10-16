AppCache.coreLanguageHandler = {
    excludedLibraries: ['sap.n', 'sap.ui.unified.internal', 'nep.bootstrap'],
    cldrBundle: {},

    updateResourceBundlesNewLang: function (bundleLanguage) {
        try {
            let loadedLibraries = sap.ui.getCore().getLoadedLibraries();
            Object.entries(loadedLibraries).forEach(function ([_, library]) {
                if (this.excludedLibraries.includes(library.name)) return true;

                let currrentResourceBundle = sap.ui.getCore().getLibraryResourceBundle(library.name);
                if (currrentResourceBundle && currrentResourceBundle.sLocale !== bundleLanguage) {
                    this.getResourceBundle(library.name, bundleLanguage)
                        .then(function (newResourceBundle) {
                            if (newResourceBundle && newResourceBundle.aPropertyFiles.length) {
                                currrentResourceBundle.aPropertyFiles = newResourceBundle.aPropertyFiles;
                            }
                        });
                }
            }.bind(this));
        } catch (err) {
            console.error('unable to updateResourceBundlesNewLang', bundleLanguage, 'error', err);
        }
    },

    getResourceBundle: function (ui5Lib, bundleLanguage) {
        return new Promise(function (resolve, reject) {
            sap.ui.require(['sap/base/i18n/ResourceBundle'], function (ResourceBundle) {
                ResourceBundle.create({
                    url: getResourceBundlePath(ui5Lib),
                    async: true,
                    locale: bundleLanguage
                }).then(function (resourceBundle) {
                    resolve(resourceBundle);
                });
            }.bind(this));
        }.bind(this));
    },

    getUI5version: function () {
        let sMajor = sap.ui.getCore().getConfiguration().getVersion().getMajor();
        let sMinor = sap.ui.getCore().getConfiguration().getVersion().getMinor();
        return `${sMajor}.${sMinor}`;
    },

    setNewCLDRbundle: function (bundleLang) {
        const l = bundleLang.toLocaleLowerCase();
        sapLoadLanguage(l === 'no' ? 'nb' : l).then(function (bundle) {
            this.cldrBundle = bundle;
            sap.ui.core.LocaleData.prototype._get = function () {
                return this._getDeep(AppCache.coreLanguageHandler.cldrBundle, arguments);
            };
        }.bind(this));
    }
};