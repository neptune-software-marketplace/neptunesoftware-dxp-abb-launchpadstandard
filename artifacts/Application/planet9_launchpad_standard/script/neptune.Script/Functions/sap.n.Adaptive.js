sap.n.Adaptive = {
    configurations: {},
    pages: {},
    dialogs: {},

    // Launchpad
    initApp: function (report) {
        jQuery.sap.require("sap.m.MessageBox");

        sap.n.Shell.attachBeforeDisplay(function (data) {
            // Update Metadata
            if (localAppID === "ADAPTIVEDESIGNER") {
                nwd.adaptive.loadMetaData(report.metadata);

                var config = null;

                // Handle BI Template - for 2-way binding
                if (data.application === "planet9_adaptive_bi") {
                    config = data;
                } else {
                    var config = JSON.parse(JSON.stringify(data));
                    config.settings.events = data.settings.events;
                }
                report.init(config, false);
            } else {
                report.init(data, true);
            }
        });
    },

    run: function (config, appdata, method) {
        return new Promise(function (resolve) {
            // Check required fields
            let valid = true;
            if (method !== "Get") {
                const canBeValidated = config.settings.fieldsRun
                    .filter(function ({ visible }) {
                        return visible;
                    })
                    .map(function ({ name }) {
                        return name;
                    });
                let requiredFields = config.settings.fieldsSel.filter(function ({ name, required }) {
                    return required && canBeValidated.includes(name);
                });
                valid = sap.n.Adaptive.checkRequiredSel(requiredFields, appdata);
            }
            if (!valid) return resolve({ status: "required" });

            // New Record
            if (method === "Get" && !appdata) return resolve({});

            // Script Startparameter
            const s = config.settings;
            const p = config.properties;
            if (s && s.properties.report.scriptparam) appdata._startparam = s.properties.report.scriptparam;
            if (p && p.report.scriptparam) appdata._startparam = p.report.scriptparam;

            $.ajax({
                type: "POST",
                url: `${AppCache.Url}/api/functions/Adaptive/RunReport?report=${config.id}&method=${method}`,
                contentType: "application/json",
                data: JSON.stringify(appdata),
                success: function (data) {
                    if (method === "Get") return resolve(Array.isArray(data) ? data[0] : data);
                    resolve(data);
                },
                error: function (result, _status) {
                    resolve(result);
                },
            });
        });
    },

    init: function (config) {
        return new Promise(function (resolve) {
            var reqData = {};

            // Script Startparameter
            if (config.settings && config.settings.properties.report.scriptparam) reqData._startparam = config.settings.properties.report.scriptparam;
            if (config.properties && config.properties.report.scriptparam) reqData._startparam = config.properties.report.scriptparam;

            $.ajax({
                type: "POST",
                url: AppCache.Url + "/api/functions/Adaptive/RunSelection?report=" + config.id,
                contentType: "application/json",
                data: JSON.stringify(reqData),
                success: function (data) {
                    resolve(data);
                },
                error: function (result, status) {
                    resolve(result);
                },
            });
        });
    },

    navigation: function (navigation, appdata, events, id) {
        if (!navigation) return;

        switch (navigation.destinationType) {
            case "F":
                sap.n.Adaptive.getConfig(navigation.destinationTargetF).then(function (data) {
                    var config = data;
                    config.settings.data = JSON.parse(JSON.stringify(appdata));
                    config.settings.events = events;
                    config.settings.navigation = navigation;

                    var childPage = sap.n.Adaptive.navigate(data.application, config, navigation, id);
                    if (navigation.openAs === "P" && events.onNavigatePage) events.onNavigatePage(childPage);
                    if (navigation.openAs === "D" && events.onNavigateDialog) events.onNavigateDialog(childPage);
                });
                break;

            case "A":
                let config = {
                    data: JSON.parse(JSON.stringify(appdata)),
                    events: events,
                };

                let childPage = sap.n.Adaptive.navigate(navigation.destinationTargetA, config, navigation, id);
                if (navigation.openAs === "P" && events.onNavigatePage) events.onNavigatePage(childPage);
                if (navigation.openAs === "D") childPage.open();
                break;

            case "S":
                $.ajax({
                    type: "POST",
                    url: `${AppCache.Url}/api/functions/Adaptive/RunReport?report=${navigation.sourceTargetS}&method=RunScript&scriptid=${navigation.destinationTargetS}`,
                    contentType: "application/json",
                    data: JSON.stringify(appdata),
                    success: function (data) {
                        if (events.refresh) events.refresh();
                    },
                    error: function (result, _status) {},
                });
                break;

            default:
                break;
        }
    },

    navigate: function (pageName, config, navigation, id) {
        if (!pageName) return;
        if (!id) id = ModelData.genID();

        pageName = pageName.toUpperCase();

        // Open Navigation Destination
        switch (navigation.openAs) {
            case "D":
                var pageID = pageName + "_" + id + "_D";

                var title = navigation.dialogTitle || "";

                if (navigation.dialogTitleFieldText) {
                    if (navigation.dialogTitle) {
                        title += " " + navigation.dialogTitleFieldText;
                    } else {
                        title = navigation.dialogTitleFieldText;
                    }
                }

                if (sap.n.Adaptive.dialogs[pageID] && sap.n.Adaptive.dialogs[pageID].getContent().length) {
                    // Apply Changes to Dialog
                    if (navigation.dialogHeight) sap.n.Adaptive.dialogs[pageID].setContentHeight(navigation.dialogHeight);
                    if (navigation.dialogWidth) sap.n.Adaptive.dialogs[pageID].setContentWidth(navigation.dialogWidth);
                    if (navigation.dialogTitle) sap.n.Adaptive.dialogs[pageID].setTitle(title);
                    if (navigation.dialogIcon) sap.n.Adaptive.dialogs[pageID].setIcon(navigation.dialogIcon);

                    if (navigation.dialogResize) {
                        sap.n.Adaptive.dialogs[pageID].setResizable(navigation.dialogResize);
                    } else {
                        sap.n.Adaptive.dialogs[pageID].setResizable(false);
                    }

                    if (navigation.dialogScrollHorizontal) {
                        sap.n.Adaptive.dialogs[pageID].addStyleClass("nepScrollContent");
                    } else {
                        sap.n.Adaptive.dialogs[pageID].removeStyleClass("nepScrollContent");
                    }

                    if (navigation.dialogHeader) {
                        sap.n.Adaptive.dialogs[pageID].setShowHeader(navigation.dialogHeader);
                    } else {
                        sap.n.Adaptive.dialogs[pageID].setShowHeader(false);
                    }

                    sap.n.Adaptive.dialogs[pageID].setStretch(sap.ui.Device.system.phone);

                    if (sap.n.Apps[pageID] && sap.n.Apps[pageID].beforeDisplay) {
                        $.each(sap.n.Apps[pageID].beforeDisplay, function (i, data) {
                            data(config);
                        });
                    }
                } else {
                    sap.n.Adaptive.dialogs[pageID] = new sap.m.Dialog({
                        contentWidth: navigation.dialogWidth || "1024px",
                        contentHeight: navigation.dialogHeight || "500px",
                        stretch: sap.ui.Device.system.phone,
                        showHeader: navigation.dialogHeader || false,
                        title: title,
                        icon: navigation.dialogIcon,
                        draggable: true,
                        resizable: navigation.dialogResize || false,
                        horizontalScrolling: false,
                        beforeClose: function (oEvent) {
                            if (sap.n.Adaptive.dialogs[pageID]._oManuallySetSize) {
                                sap.n.Adaptive.dialogs[pageID].setContentWidth(sap.n.Adaptive.dialogs[pageID]._oManuallySetSize.width + "px");
                                sap.n.Adaptive.dialogs[pageID].setContentHeight(sap.n.Adaptive.dialogs[pageID]._oManuallySetSize.height + "px");
                            }
                        },
                    });

                    if (navigation.dialogScrollHorizontal) {
                        sap.n.Adaptive.dialogs[pageID].addStyleClass("nepScrollContent");
                    } else {
                        sap.n.Adaptive.dialogs[pageID].removeStyleClass("nepScrollContent");
                    }

                    delete sap.n.Apps[pageID];

                    AppCache.Load(pageName, {
                        appGUID: pageID,
                        parentObject: sap.n.Adaptive.dialogs[pageID],
                        startParams: config,
                    });
                }

                return sap.n.Adaptive.dialogs[pageID];

            case "S":
                if (localAppID === "ADAPTIVEDESIGNER") {
                    sap.m.MessageToast.show("Sidepanel can only be displayed in Launchpad");
                } else {
                    var title = navigation.dialogTitle || "";

                    if (navigation.dialogTitleFieldText) {
                        if (navigation.dialogTitle) {
                            title += " " + navigation.dialogTitleFieldText;
                        } else {
                            title = navigation.dialogTitleFieldText;
                        }
                    }

                    sap.n.Shell.loadSidepanel(pageName, title, {
                        icon: navigation.dialogIcon,
                        additionaltext: navigation.dialogSubTitle,
                        appGUID: ModelData.genID(),
                        startParams: config,
                    });
                }
                return null;

            default:
                var pageID = pageName + "_" + id + "_P";

                if (sap.n.Adaptive.pages[pageID]) {
                    if (sap.n.Apps[pageID] && sap.n.Apps[pageID].beforeDisplay) {
                        $.each(sap.n.Apps[pageID].beforeDisplay, function (i, data) {
                            data(config);
                        });
                    }
                } else {
                    sap.n.Adaptive.pages[pageID] = new sap.m.Page({
                        showFooter: false,
                        showHeader: false,
                        enableScrolling: false,
                    });

                    AppCache.Load(pageName, {
                        appGUID: pageID,
                        parentObject: sap.n.Adaptive.pages[pageID],
                        startParams: config,
                    });
                }

                return sap.n.Adaptive.pages[pageID];
        }
    },

    buildForm: function (parent, config, appdata) {
        try {
            parent.destroyContent();

            var form = new sap.ui.layout.form.SimpleForm({
                layout: "ResponsiveGridLayout",
                editable: true,
                columnsL: parseInt(config.settings.properties.form.columnsL) || 2,
                columnsM: parseInt(config.settings.properties.form.columnsM) || 1,
                labelSpanL: parseInt(config.settings.properties.form.labelSpanL) || 4,
                labelSpanM: parseInt(config.settings.properties.form.labelSpanM) || 2,
            });

            if (config.settings.properties.form.enableCompact) {
                form.addStyleClass("sapUiSizeCompact");
            } else {
                form.removeStyleClass("sapUiSizeCompact");
            }

            // Selection Fields
            $.each(config.settings.fieldsSel, function (i, field) {
                // Trigger new form
                if (field.enableNewForm) {
                    parent.addContent(form);

                    form = new sap.ui.layout.form.SimpleForm({
                        layout: "ResponsiveGridLayout",
                        editable: true,
                        columnsL: parseInt(field.columnsL) || 2,
                        columnsM: parseInt(field.columnsM) || 1,
                        labelSpanL: parseInt(field.labelSpanL) || 4,
                        labelSpanM: parseInt(field.labelSpanM) || 2,
                    });
                }

                if (field.columnLabel)
                    form.addContent(
                        new sap.ui.core.Title({
                            text: field.columnLabel,
                            level: config.settings.properties.form.titleLevel || "Auto",
                        })
                    );

                switch (field.type) {
                    case "Editor":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.FlexBox({
                            height: field.editorHeight || "400px",
                            renderType: "Bare",
                            width: "100%",
                            visible: field.visible,
                        });

                        try {
                            sap.n.Adaptive.editor(newField, {});
                        } catch (e) {
                            console.log(e);
                        }

                        field._editor = newField.editor;
                        field._editor.setEditable(field.editable);

                        form.addContent(newField);

                        if (field.default) newField.setState(field.default);
                        break;

                    case "DatePicker":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.DatePicker({
                            visible: field.visible,
                            editable: field.editable,
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            dateValue: "{AppData>/" + field.name + "}",
                        });
                        form.addContent(newField);
                        break;

                    case "DateTimePicker":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.DateTimePicker({
                            visible: field.visible,
                            editable: field.editable,
                            secondsStep: parseInt(field.dateTimePickerSecondsStep) || 1,
                            minutesStep: parseInt(field.dateTimePickerMinutesStep) || 1,
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            dateValue: "{AppData>/" + field.name + "}",
                        });
                        form.addContent(newField);
                        break;

                    case "CheckBox":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.CheckBox({
                            visible: field.visible,
                            editable: field.editable,
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            selected: "{AppData>/" + field.name + "}",
                        });
                        form.addContent(newField);
                        break;

                    case "Switch":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.Switch({
                            visible: field.visible,
                            enabled: field.editable,
                            state: "{AppData>/" + field.name + "}",
                        });
                        form.addContent(newField);
                        break;

                    case "MultiSelect":
                    case "MultiSelectLookup":
                    case "MultiSelectScript":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        newField = new sap.m.MultiComboBox({
                            width: "100%",
                            visible: field.visible,
                            selectedKeys: "{AppData>/" + field.name + "}",
                            placeholder: field.placeholder || "",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            showSecondaryValues: true,
                        });

                        if (field.items) field.items.sort(sort_by("text"));

                        $.each(field.items, function (i, item) {
                            newField.addItem(
                                new sap.ui.core.ListItem({
                                    key: item.key,
                                    text: item.text,
                                    additionalText: item.additionalText,
                                })
                            );
                        });

                        form.addContent(newField);
                        break;

                    case "SingleSelect":
                    case "SingleSelectLookup":
                    case "SingleSelectScript":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.ComboBox({
                            width: "100%",
                            visible: field.visible,
                            editable: field.editable,
                            placeholder: field.placeholder || "",
                            selectedKey: "{AppData>/" + field.name + "}",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            showSecondaryValues: true,
                        });
                        form.addContent(newField);

                        newField.addItem(new sap.ui.core.Item({ key: "", text: "" }));

                        if (field.items) field.items.sort(sort_by("text"));

                        $.each(field.items, function (i, item) {
                            newField.addItem(
                                new sap.ui.core.ListItem({
                                    key: item.key,
                                    text: item.text,
                                    additionalText: item.additionalText,
                                })
                            );
                        });
                        break;

                    case "TextArea":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.TextArea({
                            visible: field.visible,
                            editable: field.editable,
                            rows: parseInt(field.textAreaRows) || 2,
                            placeholder: field.placeholder || "",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            value: "{AppData>/" + field.name + "}",
                            width: "100%",
                        });
                        form.addContent(newField);
                        break;

                    default:
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var newField = new sap.m.Input({
                            visible: field.visible,
                            editable: field.editable,
                            type: field.inputType || "Text",
                            placeholder: field.placeholder || "",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            value: "{AppData>/" + field.name + "}",
                        });
                        form.addContent(newField);
                        break;
                }
            });

            parent.addContent(form);
        } catch (e) {
            console.log(e);
        }
    },

    buildTableFilter: function (parent, table, config, appdata, enableSearch, run) {
        try {
            parent.destroyContent();

            if (!config) return;

            var numFields = ModelData.Find(config.settings.fieldsSel, "visible", true);
            var numFilters = numFields ? numFields.length : 1;
            if (enableSearch) numFilters++;

            var columnsM = 2;
            var columnsL = 2;

            switch (numFilters) {
                case 3:
                case 5:
                case 6:
                case 7:
                case 8:
                    columnsL = 3;
                    break;
                default:
                    break;
            }

            var form = new sap.ui.layout.form.SimpleForm({
                layout: "ColumnLayout",
                editable: true,
                labelSpanL: 12,
                labelSpanM: 12,
                columnsM: columnsM,
                columnsL: columnsL,
            });

            if (config.settings.properties.form.enableCompact) {
                form.addStyleClass("sapUiSizeCompact");
            } else {
                form.removeStyleClass("sapUiSizeCompact");
            }

            // Search
            if (enableSearch) {
                form.addContent(
                    new sap.m.Label({
                        text: sap.n.Adaptive.translateProperty("report", "searchLabel", config),
                        width: "100%",
                    })
                );

                form.addContent(
                    new sap.m.SearchField({
                        placeholder: sap.n.Adaptive.translateProperty("report", "searchPlaceholder", config),
                        liveChange: function (oEvent) {
                            var searchField = this;
                            var filters = [];
                            var bindingItems = table.getBinding("items");
                            var fieldsFilter = ModelData.Find(config.settings.fieldsRun, "enableFilter", true);

                            $.each(fieldsFilter, function (i, field) {
                                if (field.valueType) {
                                    filters.push(new sap.ui.model.Filter(field.name + "_value", "Contains", searchField.getValue()));
                                } else {
                                    filters.push(new sap.ui.model.Filter(field.name, "Contains", searchField.getValue()));
                                }
                            });

                            bindingItems.filter([
                                new sap.ui.model.Filter({
                                    filters: filters,
                                    and: false,
                                }),
                            ]);
                        },
                    })
                );
            }

            $.each(config.settings.fieldsSel, function (i, field) {
                if (field.default) {
                    if (field.type === "MultiSelect" || field.type === "MultiSelectLookup" || field.type === "MultiSelectScript") {
                        if (typeof field.default === "object") {
                            appdata[field.name] = field.default;
                        } else {
                            if (field.default.indexOf("[") > -1) {
                                appdata[field.name] = JSON.parse(field.default);
                            } else {
                                appdata[field.name] = field.default;
                            }
                        }
                    } else if (field.type === "Switch" || field.type === "CheckBox") {
                        if (field.default === "true" || field.default === "1" || field.default === "X") {
                            appdata[field.name] = true;
                        } else {
                            delete appdata[field.name];
                        }
                    } else {
                        appdata[field.name] = field.default;
                    }
                }
                if (field.required) delete appdata[field.name + "ValueState"];

                switch (field.type) {
                    case "MultiSelect":
                    case "MultiSelectLookup":
                    case "MultiSelectScript":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var selField = new sap.m.MultiComboBox({
                            width: "100%",
                            visible: field.visible,
                            selectedKeys: "{AppData>/" + field.name + "}",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            showSecondaryValues: true,
                            selectionChange: function (oEvent) {
                                if (run) run();
                            },
                        });

                        if (field.items) field.items.sort(sort_by("text"));

                        $.each(field.items, function (i, item) {
                            selField.addItem(
                                new sap.ui.core.ListItem({
                                    key: item.key,
                                    text: item.text,
                                    additionalText: item.additionalText,
                                })
                            );
                        });

                        form.addContent(selField);
                        break;

                    case "SingleSelect":
                    case "SingleSelectLookup":
                    case "SingleSelectScript":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var selField = new sap.m.ComboBox({
                            width: "100%",
                            visible: field.visible,
                            selectedKey: "{AppData>/" + field.name + "}",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            showSecondaryValues: true,
                            change: function (oEvent) {
                                if (run) run();
                            },
                        });

                        selField.addItem(new sap.ui.core.Item({ key: "", text: "" }));

                        if (field.items) field.items.sort(sort_by("text"));

                        $.each(field.items, function (i, item) {
                            selField.addItem(
                                new sap.ui.core.ListItem({
                                    key: item.key,
                                    text: item.text,
                                    additionalText: item.additionalText,
                                })
                            );
                        });

                        form.addContent(selField);
                        break;

                    case "DateRange":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var selField = new sap.m.DateRangeSelection({
                            width: "100%",
                            visible: field.visible,
                            dateValue: "{AppData>/" + field.name + "}",
                            secondDateValue: "{AppData>/" + field.name + "_end}",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            change: function (oEvent) {
                                if (run) run();
                            },
                        });
                        form.addContent(selField);
                        break;

                    case "CheckBox":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var selField = new sap.m.CheckBox({
                            width: "100%",
                            visible: field.visible,
                            useEntireWidth: true,
                            selected: "{AppData>/" + field.name + "}",
                            valueState: "{AppData>/" + field.name + "ValueState}",
                            select: function (oEvent) {
                                if (run) run();
                            },
                        });
                        form.addContent(selField);
                        break;

                    case "Switch":
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var selField = new sap.m.Switch({
                            visible: field.visible,
                            state: "{AppData>/" + field.name + "}",
                            change: function (oEvent) {
                                if (run) run();
                            },
                        });
                        form.addContent(selField);
                        break;

                    default:
                        form.addContent(
                            new sap.m.Label({
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                                required: field.required,
                            })
                        );

                        var selField = new sap.m.SearchField({
                            width: "100%",
                            visible: field.visible,
                            value: "{AppData>/" + field.name + "}",
                            // valueState: "{AppData>/" + field.name + "ValueState}",
                            search: function (oEvent) {
                                if (run) run();
                            },
                        });

                        form.addContent(selField);
                        break;
                }
            });

            parent.addContent(form);
        } catch (e) {
            console.log(e);
        }
    },

    translateFieldLabel: function (field, config) {
        if (!config.language) return field.text;

        if (config.settings.translation && config.settings.translation[config.language] && config.settings.translation[config.language].fieldCatalog[field.name]) {
            return config.settings.translation[config.language].fieldCatalog[field.name];
        } else {
            return field.text;
        }
    },

    translateProperty: function (parent, key, config) {
        if (!config.language) return config.settings.properties[parent][key];

        if (config.settings.translation && config.settings.translation[config.language] && config.settings.translation[config.language][parent][key]) {
            return config.settings.translation[config.language][parent][key];
        }
        return config.settings.properties[parent][key];
    },

    // Will be moved to template instead of dependency of P9 version
    buildTableColumns: function (table, config, events) {
        try {
            if (config.settings.properties.table.enableCompact) {
                table.addStyleClass("sapUiSizeCompact");
            } else {
                table.removeStyleClass("sapUiSizeCompact");
            }

            try {
                table.destroyColumns();
            } catch (e) {}

            var Column = new sap.m.ColumnListItem({ selected: "{_sel}" });

            // Handle Item Press
            if (config.settings.properties.report._navigationItemPress) {
                Column.setType("Active");
                Column.attachPress(function (oEvent) {
                    var context = oEvent.oSource.getBindingContext();
                    var columnData = context.getObject();

                    if (config.settings.properties.report._navigationItemPress.dialogTitleField) {
                        config.settings.properties.report._navigationItemPress.dialogTitleFieldText =
                            columnData[config.settings.properties.report._navigationItemPress.dialogTitleField + "_value"] ||
                            columnData[config.settings.properties.report._navigationItemPress.dialogTitleField];
                    }

                    sap.n.Adaptive.navigation(config.settings.properties.report._navigationItemPress, columnData, events, table.sId);
                });
            }

            // Build Columns
            $.each(config.settings.fieldsRun, function (i, field) {
                if (!field.visible) return;

                var ColumnHeader = new sap.m.Column({
                    width: field.width,
                    minScreenWidth: field.minScreenWidth,
                });

                if (field.hAlign) ColumnHeader.setHAlign(field.hAlign);

                // Enable Sum
                if (field.enableSum && field.type === "ObjectNumber") {
                    var sumField = new sap.m.ObjectNumber({
                        number: "{AppConfig>/settings/properties/table/_sum/" + field.name + "}",
                        unit: "{AppConfig>/settings/properties/table/_sum/" + field.name + "_unit}",
                    });
                    ColumnHeader.setFooter(sumField);
                }

                var HBox = new sap.m.HBox();

                HBox.addItem(
                    new sap.m.Label({
                        text: sap.n.Adaptive.translateFieldLabel(field, config),
                        wrapping: true,
                    })
                );

                var enabled = true;
                if (field.enableSort || field.enableGroup) {
                    var ColumnButton = new sap.ui.core.Icon({
                        src: "sap-icon://slim-arrow-down",
                        press: function (oEvent) {
                            if (events.onHeaderClick) events.onHeaderClick(field, this);
                        },
                    });
                    ColumnButton.addStyleClass("sapUiTinyMarginBegin");
                    HBox.addItem(ColumnButton);
                }

                ColumnHeader.setHeader(HBox);

                table.addColumn(ColumnHeader);

                var newField = null;
                var formatterProp = "text";

                switch (field.type) {
                    case "Link":
                        var options = {
                            text: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            wrapping: field.wrapping || false,
                            press: function (oEvent) {
                                if (!field._navigation) return;

                                var context = oEvent.oSource.getBindingContext();
                                var columnData = context.getObject();

                                // Sidepanel Lookup Text
                                if (field._navigation.openAs === "S") {
                                    var fieldName = ModelData.FindFirst(config.settings.fieldsRun, "name", field._navigation.dialogTitleField);

                                    if (fieldName.valueType) {
                                        field._navigation.dialogTitleFieldText = columnData[field._navigation.dialogTitleField + "_value"];
                                    } else {
                                        field._navigation.dialogTitleFieldText = columnData[field._navigation.dialogTitleField];
                                    }
                                }

                                // Add pressed fieldname
                                events.objectPressed = field.name;

                                sap.n.Adaptive.navigation(field._navigation, columnData, events, newField.sId);
                            },
                        };

                        if (field.linkHrefType) {
                            options.href = "{" + field.name + "_href}";
                            options.target = "_blank";
                        }

                        newField = new sap.m.Link(options);
                        break;

                    case "ObjectNumber":
                        formatterProp = "number";

                        var options = {
                            number: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                        };

                        if (field.numberUnitType) options.unit = "{" + field.name + "_unit}";
                        if (field.numberStateType) options.state = "{" + field.name + "_state}";

                        newField = new sap.m.ObjectNumber(options);

                        if (field.numberUnitType && field.numberUnitFormatter) {
                            var fieldName = field.name + "_unit";

                            newField.bindProperty("unit", {
                                parts: [fieldName],
                                formatter: function (fieldName) {
                                    if (typeof fieldName === "undefined" || fieldName === null) return;
                                    return sap.n.Adaptive.formatter(fieldName, field.numberUnitFormatter);
                                },
                            });
                        }
                        break;

                    case "ObjectStatus":
                        formatterProp = "text";

                        var options = {
                            text: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                        };

                        if (field.statusTitleType) options.title = "{" + field.name + "_title}";
                        if (field.statusIconType) options.icon = "{" + field.name + "_icon}";
                        if (field.statusStateType) options.state = "{" + field.name + "_state}";

                        newField = new sap.m.ObjectStatus(options);

                        if (field.statusTitleType && field.statusTitleFormatter) {
                            var fieldName = field.name + "_title";

                            newField.bindProperty("title", {
                                parts: [fieldName],
                                formatter: function (fieldName) {
                                    if (typeof fieldName === "undefined" || fieldName === null) return;
                                    return sap.n.Adaptive.formatter(fieldName, field.statusTitleFormatter);
                                },
                            });
                        }
                        break;

                    case "CheckBox":
                        var editable = field.editable ? true : false;

                        newField = new sap.m.CheckBox({
                            selected: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            editable: editable,
                            wrapping: field.wrapping || false,
                            select: function (oEvent) {
                                var context = oEvent.oSource.getBindingContext();
                                var data = context.getObject();
                                events.onTableChange(data);
                            },
                        });
                        break;

                    case "Switch":
                        var editable = field.editable ? true : false;

                        newField = new sap.m.Switch({
                            state: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            enabled: editable,
                            change: function (oEvent) {
                                var context = oEvent.oSource.getBindingContext();
                                var data = context.getObject();
                                events.onTableChange(data);
                            },
                        });
                        break;

                    case "Image":
                        newField = new sap.m.Image({
                            src: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            height: "32px",
                        });
                        break;

                    case "Icon":
                        newField = new sap.ui.core.Icon({
                            src: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                        });
                        break;

                    case "Input":
                        var editable = field.editable ? true : false;

                        newField = new sap.m.Input({
                            value: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            editable: editable,
                            change: function (oEvent) {
                                var context = oEvent.oSource.getBindingContext();
                                var data = context.getObject();
                                events.onTableChange(data);
                            },
                        });
                        break;

                    case "DatePicker":
                        var editable = field.editable ? true : false;

                        var newField = new sap.m.DatePicker({
                            visible: field.visible,
                            editable: editable,
                            dateValue: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            change: function (oEvent) {
                                var context = oEvent.oSource.getBindingContext();
                                var data = context.getObject();
                                events.onTableChange(data);
                            },
                        });

                        var fieldName = field.name;

                        newField.bindProperty("dateValue", {
                            parts: [fieldName],
                            formatter: function (fieldName) {
                                if (typeof fieldName === "undefined" || fieldName === null) return;
                                if (typeof fieldName === "string" && fieldName.length === 13) return new Date(parseInt(fieldName));
                                return new Date(fieldName);
                            },
                        });

                        break;

                    default:
                        newField = new sap.m.Text({
                            text: field.valueType ? "{" + field.name + "_value}" : "{" + field.name + "}",
                            wrapping: field.wrapping || false,
                        });
                        break;
                }

                Column.addCell(newField);

                // Formatter
                if (field.formatter) {
                    var fieldName = field.valueType ? field.name + "_value" : field.name;
                    newField.bindProperty(formatterProp, {
                        parts: [fieldName],
                        formatter: function (fieldName) {
                            if (typeof fieldName === "undefined" || fieldName === null) return;
                            return sap.n.Adaptive.formatter(fieldName, field.formatter);
                        },
                    });
                }
            });

            // Row Action 1
            if (config.settings.properties.table.enableAction1) {
                var ColumnHeader = new sap.m.Column({
                    width: config.settings.properties.table.action1Width || "",
                });

                table.addColumn(ColumnHeader);

                var newField = new sap.m.Button({
                    text: config.settings.properties.table.action1Text,
                    icon: config.settings.properties.table.action1Icon,
                    type: config.settings.properties.table.action1Type,
                    press: function (oEvent) {
                        if (!config.settings.properties.table._action1Nav) return;

                        var context = oEvent.oSource.getBindingContext();
                        var columnData = context.getObject();

                        if (config.settings.properties.table._action1Nav.dialogTitleField) {
                            config.settings.properties.table._action1Nav.dialogTitleFieldText =
                                columnData[config.settings.properties.table._action1Nav.dialogTitleField + "_value"] || columnData[config.settings.properties.table._action1Nav.dialogTitleField];
                        }

                        sap.n.Adaptive.navigation(config.settings.properties.table._action1Nav, columnData, events, table.sId);
                    },
                });

                Column.addCell(newField);
            }

            // Row Action 2
            if (config.settings.properties.table.enableAction2) {
                var ColumnHeader = new sap.m.Column({
                    width: config.settings.properties.table.action2Width || "",
                });

                table.addColumn(ColumnHeader);

                var newField = new sap.m.Button({
                    text: config.settings.properties.table.action2Text,
                    icon: config.settings.properties.table.action2Icon,
                    type: config.settings.properties.table.action2Type,
                    width: config.settings.properties.table.action2Width || "",
                    press: function (oEvent) {
                        if (!config.settings.properties.table._action2Nav) return;

                        var context = oEvent.oSource.getBindingContext();
                        var columnData = context.getObject();

                        if (config.settings.properties.table._action2Nav.dialogTitleField) {
                            config.settings.properties.table._action2Nav.dialogTitleFieldText =
                                columnData[config.settings.properties.table._action2Nav.dialogTitleField + "_value"] || columnData[config.settings.properties.table._action2Nav.dialogTitleField];
                        }

                        sap.n.Adaptive.navigation(config.settings.properties.table._action2Nav, columnData, events, table.sId);
                    },
                });

                Column.addCell(newField);
            }

            // Row Action 3
            if (config.settings.properties.table.enableAction3) {
                var ColumnHeader = new sap.m.Column({
                    width: config.settings.properties.table.action3Width || "",
                });

                table.addColumn(ColumnHeader);

                var newField = new sap.m.Button({
                    text: config.settings.properties.table.action3Text,
                    icon: config.settings.properties.table.action3Icon,
                    type: config.settings.properties.table.action3Type,
                    width: config.settings.properties.table.action3Width || "",
                    press: function (oEvent) {
                        if (!config.settings.properties.table._action3Nav) return;

                        var context = oEvent.oSource.getBindingContext();
                        var columnData = context.getObject();

                        if (config.settings.properties.table._action3Nav.dialogTitleField) {
                            config.settings.properties.table._action3Nav.dialogTitleFieldText =
                                columnData[config.settings.properties.table._action3Nav.dialogTitleField + "_value"] || columnData[config.settings.properties.table._action3Nav.dialogTitleField];
                        }

                        sap.n.Adaptive.navigation(config.settings.properties.table._action3Nav, columnData, events, table.sId);
                    },
                });

                Column.addCell(newField);
            }

            // Table - Aggregation
            table.bindAggregation("items", {
                path: "/",
                template: Column,
                templateShareable: false,
            });
        } catch (e) {
            console.log(e);
        }
    },

    formatter: function (fieldName, formatter) {
        var formatDate00 = sap.ui.core.format.DateFormat.getDateTimeInstance();
        var formatDate01 = sap.ui.core.format.DateFormat.getDateTimeInstance({
            pattern: "dd.MM.yyyy",
        });
        var formatDate02 = sap.ui.core.format.DateFormat.getDateTimeInstance({
            pattern: "mm-dd-yyyy",
        });
        var formatDate03 = sap.ui.core.format.DateFormat.getDateTimeInstance({
            pattern: "yyyy MMM",
        });
        var formatDate04 = sap.ui.core.format.DateFormat.getDateTimeInstance({
            pattern: "yyyy QQ",
        });

        var formatNumber01 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 0,
            minFractionDigits: 0,
            groupingEnabled: true,
            groupingSeparator: " ",
        });
        var formatNumber02 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 1,
            minFractionDigits: 1,
            groupingEnabled: true,
            groupingSeparator: " ",
            decimalSeparator: ",",
        });
        var formatNumber03 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 2,
            minFractionDigits: 2,
            groupingEnabled: true,
            groupingSeparator: " ",
            decimalSeparator: ",",
        });
        var formatNumber04 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 3,
            minFractionDigits: 3,
            groupingEnabled: true,
            groupingSeparator: " ",
            decimalSeparator: ",",
        });
        var formatNumber05 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 1,
            minFractionDigits: 1,
            groupingEnabled: true,
            groupingSeparator: " ",
            decimalSeparator: ".",
        });
        var formatNumber06 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 2,
            minFractionDigits: 2,
            groupingEnabled: true,
            groupingSeparator: " ",
            decimalSeparator: ".",
        });
        var formatNumber07 = sap.ui.core.format.NumberFormat.getFloatInstance({
            maxFractionDigits: 3,
            minFractionDigits: 3,
            groupingEnabled: true,
            groupingSeparator: " ",
            decimalSeparator: ".",
        });

        switch (formatter) {
            case "date00":
                return formatDate00.format(sap.n.Adaptive.getDate(fieldName));

            case "date01":
                return formatDate01.format(sap.n.Adaptive.getDate(fieldName));

            case "date02":
                return formatDate02.format(sap.n.Adaptive.getDate(fieldName));

            case "date03":
                return formatDate03.format(sap.n.Adaptive.getDate(fieldName));

            case "date04":
                return formatDate04.format(sap.n.Adaptive.getDate(fieldName));

            case "sapdate01":
                return fieldName.substr(6, 2) + "." + fieldName.substr(4, 2) + "." + fieldName.substr(0, 4);

            case "sapdate02":
                return fieldName.substr(4, 2) + "-" + fieldName.substr(6, 2) + "-" + fieldName.substr(0, 4);

            case "zero":
                return fieldName.replace(/^0+/, "");

            case "uppercase":
                return fieldName.toUpperCase();

            case "lowercase":
                return fieldName.toLowerCase();

            case "number00":
                return parseFloat(fieldName).toLocaleString();

            case "number01":
                return formatNumber01.format(fieldName);

            case "number02":
                return formatNumber02.format(fieldName);

            case "number03":
                return formatNumber03.format(fieldName);

            case "number04":
                return formatNumber04.format(fieldName);

            case "number05":
                return formatNumber05.format(fieldName);

            case "number06":
                return formatNumber06.format(fieldName);

            case "number07":
                return formatNumber07.format(fieldName);

            case "file":
                oFileSizeFormat = sap.ui.core.format.FileSizeFormat.getInstance({
                    binaryFilesize: false,
                    decimals: 2,
                });
                return oFileSizeFormat.format(fieldName);
                break;

            default:
                return fieldName;
        }
    },

    getDate: function (dateValue) {
        if (typeof dateValue === "string" && dateValue.length === 13) return new Date(parseInt(dateValue));
        return new Date(dateValue);
    },

    getConfig: function (id) {
        return new Promise(function (resolve) {
            if (localAppID !== "ADAPTIVEDESIGNER") {
                if (sap.n.Adaptive.configurations[id]) return resolve(sap.n.Adaptive.configurations[id]);
            }

            $.ajax({
                type: "POST",
                contentType: "application/json",
                url: AppCache.Url + "/api/functions/Adaptive/Get",
                data: JSON.stringify({ id: id }),
                success: function (data) {
                    sap.n.Adaptive.configurations[id] = data;
                    resolve(data);
                },
                error: function (result, status) {
                    resolve(result);
                },
            });
        });
    },

    checkRequiredSel: function (fields, data) {
        let valid = true;

        fields
            .filter(function (f) {
                return f.required;
            })
            .forEach(function (field) {
                const { type, name } = field;
                const k = `${name}ValueState`;

                data[k] = "None";

                if (!data[field.name]) {
                    data[k] = "Error";
                    valid = false;
                }

                if (["MultiSelect", "MultiSelectLookup", "MultiSelectScript"].includes(type) && data[name] && !data[name].length) {
                    data[k] = "Error";
                    valid = false;
                }
            });

        // remove invalid state
        if (valid) {
            fields
                .filter(function (f) {
                    return f.required;
                })
                .forEach(function (field) {
                    delete data[field.name + "ValueState"];
                });
        }

        return valid;
    },

    setDefaultData: function (config, metadata) {
        if (!metadata) return;
        const propReport = metadata.properties.report || [];

        for (let key in propReport) {
            const field = propReport[key];
            if (typeof field.default !== "undefined" && typeof config.settings.properties.report[key] === "undefined") config.settings.properties.report[key] = field.default;
        }

        const propForm = metadata.properties.form || [];

        for (let key in propForm) {
            const field = propForm[key];
            if (typeof field.default !== "undefined" && typeof config.settings.properties.form[key] === "undefined") config.settings.properties.form[key] = field.default;
        }

        const propTable = metadata.properties.table || [];

        for (let key in propTable) {
            const field = propTable[key];
            if (typeof field.default !== "undefined" && typeof config.settings.properties.table[key] === "undefined") config.settings.properties.table[key] = field.default;
        }
    },

    grouping: function (config, groupBy, oContext) {
        var data = oContext.getObject();
        var field = ModelData.FindFirst(config.settings.fieldsRun, "name", groupBy);
        var fieldName = field.valueType ? field.name + "_value" : field.name;

        if (field.formatter) return sap.n.Adaptive.formatter(data[fieldName], field.formatter);

        return data[fieldName];
    },

    editor: function (obj, config) {
        obj.editor = {
            data: config.data || "",
            editable: config.editable || false,
            setData: function (data) {
                this.data = data;
                if (typeof obj.editor.sun !== "undefined") {
                    obj.editor.sun.setContents(this.data);
                    obj.editor.sun.core.history.stack = [];
                    obj.editor.sun.core.history.reset();
                }
            },
            getData: function () {
                return this.data;
            },
            onChange: config.onChange || function () {},
            setEditable: function (status) {
                this.editable = status;
                if (typeof obj.editor.sun !== "undefined") {
                    if (this.editable) {
                        obj.editor.sun.enabled();
                    } else {
                        obj.editor.sun.disabled();
                    }
                }
            },
        };

        var id = config.id || ModelData.genID();
        var data = config.data || "";

        obj.addStyleClass(id);

        var id = "nepHtmlEditor-" + ModelData.genID();
        obj.addStyleClass("nepHtmlEditor ");
        obj.addStyleClass(id);
        obj.addItem(new sap.ui.core.HTML(id, {}).setContent("<textarea id='" + id + "'></textarea>"));

        obj.onAfterRendering = function () {
            sap.ui.Device.resize.attachHandler(function (mParams) {
                if (obj.getDomRef()) {
                    var height = obj.getDomRef().offsetHeight - $(".se-toolbar.sun-editor-common").height() - 32 - 4 - 2;
                    $("." + id + " .se-wrapper-inner.se-wrapper-wysiwyg.sun-editor-editable").height(height);
                    $("." + id + " .se-wrapper-inner.se-wrapper-code").height(height + 22);
                }
            });

            var height = obj.getDomRef().offsetHeight - 250;

            var createEditor = function () {
                var editor = SUNEDITOR.create(document.getElementById(id) || id, {
                    width: "100%",
                    height: height,
                    value: obj.editor.data,
                    resizingBar: false,
                    defaultStyle: "font-family: cursive: font-size:14px",
                    buttonList: [
                        ["undo", "redo"],
                        ["font", "fontSize", "formatBlock"],
                        ["bold", "underline", "italic", "fontColor", "hiliteColor"],
                        ["outdent", "indent", "align", "horizontalRule", "list", "lineHeight"],
                        ["table", "link", "image", "video", "audio"],
                        ["showBlocks", "removeFormat", "codeView", "fullScreen"],
                    ],
                    font: ["Arial", "Comic Sans MS", "Courier New", "Impact", "Georgia", "Tahoma", "Trebuchet MS", "Verdana"],
                    attributesWhitelist: {
                        all: "style",
                        img: "src|style|data-rotatey|data-rotatex|data-index",
                    },
                });

                editor.onBlur = function (e, core) {
                    obj.editor.data = editor.getContents();
                    obj.editor.onChange(obj.editor.data);
                };

                editor.onChange = function (e, core) {
                    obj.editor.data = editor.getContents();
                    obj.editor.onChange(obj.editor.data);
                };

                if (obj.editor.editable) {
                    editor.enabled();
                } else {
                    editor.disabled();
                }

                obj.editor.sun = editor;

                setTimeout(function () {
                    if (obj.getDomRef()) {
                        var height = obj.getDomRef().offsetHeight - $("." + id + " .se-toolbar.sun-editor-common").height() - 32 - 4 - 2;
                        $("." + id + " .se-wrapper-inner.se-wrapper-wysiwyg.sun-editor-editable").height(height);
                        $("." + id + " .se-wrapper-inner.se-wrapper-code").height(height + 22);
                    }
                }, 1);
            };

            if (typeof SUNEDITOR !== "object") {
                var actions = [];
                actions.push(sap.n.Adaptive.loadLibraryEditor());
                Promise.all(actions).then(function (values) {
                    createEditor();
                });
            } else {
                createEditor();
            }
        };
    },

    loadLibraryEditor: function () {
        return new Promise(function (resolve) {
            $("<link/>", {
                rel: "stylesheet",
                type: "text/css",
                href: "/public/editor/suneditor.min.css",
            }).appendTo("head");

            $.ajax({
                type: "GET",
                url: "/public/editor/suneditor.min.js",
                success: function (data) {
                    resolve("OK");
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    resolve("ERROR");
                },
                dataType: "script",
                cache: true,
            });
        });
    },
};
