sap.n.Adaptive = {

    configurations: {},
    pages: {},
    dialogs: {},

    // Launchpad
    initApp: function (report) {
        sap.n.Shell.attachBeforeDisplay(function (data) {
            if (localAppID !== 'ADAPTIVEDESIGNER') {
                report.init(data, true);
                return;
            }

            // Update Metadata
            nwd.adaptive.loadMetaData(report.metadata);

            let config = null;
            // Handle BI Template - for 2-way binding
            if (data.application === 'planet9_adaptive_bi') {
                config = data;
            } else {
                config = JSON.parse(JSON.stringify(data));
                config.settings.events = data.settings.events;
            }
            report.init(config, false);
        });
    },

    run: function (config, appdata, method) {
        return new Promise(function (resolve) {
            // Check required fields
            let valid = true;
            if (method !== 'Get') {
                const canBeValidated = config.settings.fieldsRun.filter(function ({ visible }) {
                    return visible;
                }).map(function ({ name }) {
                    return name;
                });
                let requiredFields = config.settings.fieldsSel.filter(function ({ name, required }) {
                    return required && canBeValidated.includes(name);
                });
                valid = sap.n.Adaptive.checkRequiredSel(requiredFields, appdata);
            }
            if (!valid) return resolve({ status: 'required' });

            // New Record
            if (method === 'Get' && !appdata) return resolve({});

            // Script Startparameter
            const s = config.settings;
            const p = config.properties;
            if (s && s.properties.report.scriptparam) appdata._startparam = s.properties.report.scriptparam;
            if (p && p.report.scriptparam) appdata._startparam = p.report.scriptparam;

            jsonRequest({
                url: `${AppCache.Url}/api/functions/Adaptive/RunReport?report=${config.id}&method=${method}`,
                data: JSON.stringify(appdata),
                success: function (data) {
                    if (method === 'Get') return resolve(Array.isArray(data) ? data[0] : data);
                    resolve(data);
                },
                error: function (result, _status) {
                    resolve(result);
                }
            });
        });
    },

    init: function (config) {
        return new Promise(function (resolve) {
            let reqData = {};

            // Script Startparameter
            const s = config.settings;
            const p = config.properties;
            if (s && s.properties.report.scriptparam) reqData._startparam = s.properties.report.scriptparam;
            if (p && p.report.scriptparam) reqData._startparam = p.report.scriptparam;

            jsonRequest({
                url: AppCache.Url + '/api/functions/Adaptive/RunSelection?report=' + config.id,
                data: JSON.stringify(reqData),
                success: function (data) {
                    resolve(data);
                },
                error: function (result, status) {
                    resolve(result);
                }

            });

        });

    },

    navigation: function (navigation, appdata, events, id) {
        if (!navigation) return;

        let config, childPage;
        switch (navigation.destinationType) {
            case 'F':
                sap.n.Adaptive.getConfig(navigation.destinationTargetF).then(function (data) {
                    config = data;
                    config.settings.data = JSON.parse(JSON.stringify(appdata));
                    config.settings.events = events;
                    config.settings.navigation = navigation;

                    childPage = sap.n.Adaptive.navigate(data.application, config, navigation, id);
                    if (navigation.openAs === 'P' && events.onNavigatePage) events.onNavigatePage(childPage);
                    if (navigation.openAs === 'D' && events.onNavigateDialog) events.onNavigateDialog(childPage);

                });
                break;

            case 'A':
                config = {
                    data: JSON.parse(JSON.stringify(appdata)),
                    events,
                }

                childPage = sap.n.Adaptive.navigate(navigation.destinationTargetA, config, navigation, id);
                if (navigation.openAs === 'P' && events.onNavigatePage) events.onNavigatePage(childPage);
                if (navigation.openAs === 'D') childPage.open();
                break;

            default:
                break;
        }
    },

    navigate: function (pageName, config, navigation, id) {
        if (!pageName) return;
        if (!id) id = ModelData.genID();

        pageName = pageName.toUpperCase();

        let pageID;

        // Open Navigation Destination
        switch (navigation.openAs) {
            case 'D':
                pageID = pageName + '_' + id + '_D';
                let title = navigation.dialogTitle || '';

                if (navigation.dialogTitleFieldText) {
                    if (navigation.dialogTitle) title += ` ${navigation.dialogTitleFieldText}`;
                    else title = navigation.dialogTitleFieldText;
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

                    if (navigation.dialogHeader) {
                        sap.n.Adaptive.dialogs[pageID].setShowHeader(navigation.dialogHeader);
                    } else {
                        sap.n.Adaptive.dialogs[pageID].setShowHeader(false);
                    }

                    if (navigation.dialogScrollHorizontal) {
                        sap.n.Adaptive.dialogs[pageID].addStyleClass('nepScrollContent');
                    } else {
                        sap.n.Adaptive.dialogs[pageID].removeStyleClass('nepScrollContent');
                    }

                    sap.n.Adaptive.dialogs[pageID].setStretch(sap.n.Launchpad.isPhone());

                    if (sap.n.Apps[pageID] && sap.n.Apps[pageID].beforeDisplay) {
                        sap.n.Apps[pageID].beforeDisplay.forEach(function (data) {
                            data(config);
                        });
                    }
                } else {
                    sap.n.Adaptive.dialogs[pageID] = new sap.m.Dialog({
                        contentWidth: navigation.dialogWidth || '1024px',
                        contentHeight: navigation.dialogHeight || '500px',
                        stretch: sap.n.Launchpad.isPhone(),
                        showHeader: navigation.dialogHeader || false,
                        title: title,
                        icon: navigation.dialogIcon,
                        draggable: true,
                        resizable: navigation.dialogResize || false,
                        horizontalScrolling: false,
                        beforeClose: function (oEvent) {
                            if (sap.n.Adaptive.dialogs[pageID]._oManuallySetSize) {
                                const s = sap.n.Adaptive.dialogs[pageID]._oManuallySetSize;
                                sap.n.Adaptive.dialogs[pageID].setContentWidth(`${s.width}px`);
                                sap.n.Adaptive.dialogs[pageID].setContentHeight(`${s.height}px`);
                            }
                        }
                    });

                    if (navigation.dialogScrollHorizontal) {
                        sap.n.Adaptive.dialogs[pageID].addStyleClass('nepScrollContent');
                    } else {
                        sap.n.Adaptive.dialogs[pageID].removeStyleClass('nepScrollContent');
                    }

                    delete sap.n.Apps[pageID];

                    AppCache.Load(pageName, {
                        appGUID: pageID,
                        parentObject: sap.n.Adaptive.dialogs[pageID],
                        startParams: config,
                    });
                }

                return sap.n.Adaptive.dialogs[pageID];

            case 'S':
                if (localAppID === 'ADAPTIVEDESIGNER') {
                    sap.m.MessageToast.show('Sidepanel can only be displayed in Launchpad');
                } else {
                    let title = navigation.dialogTitle || '';
                    if (navigation.dialogTitleFieldText) {
                        if (navigation.dialogTitle) title += ` ${navigation.dialogTitleFieldText}`;
                        else title = navigation.dialogTitleFieldText;
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
                pageID = pageName + '_' + id + '_P';
                if (sap.n.Adaptive.pages[pageID]) {
                    if (sap.n.Apps[pageID] && sap.n.Apps[pageID].beforeDisplay) {
                        sap.n.Apps[pageID].beforeDisplay.forEach(function (data) {
                            data(config);
                        });
                    }
                } else {
                    sap.n.Adaptive.pages[pageID] = new sap.m.Page({
                        showFooter: false,
                        showHeader: false,
                        enableScrolling: false
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

            const props = config.settings.properties;
            let form = new sap.ui.layout.form.SimpleForm({
                layout: 'ResponsiveGridLayout',
                editable: true,
                columnsL: parseInt(props.form.columnsL) || 2,
                columnsM: parseInt(props.form.columnsM) || 1,
                labelSpanL: parseInt(props.form.labelSpanL) || 4,
                labelSpanM: parseInt(props.form.labelSpanM) || 2,
            });

            if (props.form.enableCompact) {
                form.addStyleClass('sapUiSizeCompact');
            } else {
                form.removeStyleClass('sapUiSizeCompact');
            }

            // Selection Fields
            config.settings.fieldsSel.forEach(function (field) {
                // Trigger new form
                if (field.enableNewForm) {

                    parent.addContent(form);
                    form = new sap.ui.layout.form.SimpleForm({
                        layout: 'ResponsiveGridLayout',
                        editable: true,
                        columnsL: parseInt(field.columnsL) || 2,
                        columnsM: parseInt(field.columnsM) || 1,
                        labelSpanL: parseInt(field.labelSpanL) || 4,
                        labelSpanM: parseInt(field.labelSpanM) || 2,
                    });

                }

                if (field.columnLabel) form.addContent(new sap.ui.core.Title({
                    text: field.columnLabel,
                    level: config.settings.properties.form.titleLevel || 'Auto'
                }));

                const { type, required, name } = field;
                const fieldValue = `{AppData>/${name}}`;
                const fieldValueState = `{AppData>/${name}ValueState}`;

                switch (type) {
                    case 'Editor':
                        form.addContent(
                            new sap.m.Label({
                                required,
                                text: sap.n.Adaptive.translateFieldLabel(field, config),
                            })
                        );

                        let editorField = new sap.m.FlexBox({
                            height: field.editorHeight || '400px',
                            renderType: 'Bare',
                            width: '100%',
                            visible: field.visible,
                        });

                        try {
                            sap.n.Adaptive.editor(editorField, {});
                        } catch (e) {
                            console.log(e);
                        }

                        field._editor = editorField.editor;
                        field._editor.setEditable(field.editable);

                        form.addContent(editorField);

                        if (field.default) editorField.setState(field.default);
                        break;

                    case 'DatePicker':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));
                        form.addContent(
                            new sap.m.DatePicker({
                                visible: field.visible,
                                editable: field.editable,
                                valueState: fieldValueState,
                                dateValue: fieldValue,
                            })
                        );
                        break;

                    case 'DateTimePicker':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));
                        form.addContent(
                            new sap.m.DateTimePicker({
                                visible: field.visible,
                                editable: field.editable,
                                secondsStep: parseInt(field.dateTimePickerSecondsStep) || 1,
                                minutesStep: parseInt(field.dateTimePickerMinutesStep) || 1,
                                valueState: fieldValueState,
                                dateValue: fieldValue,
                            })
                        );
                        break;

                    case 'CheckBox':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));
                        form.addContent(
                            new sap.m.CheckBox({
                                visible: field.visible,
                                editable: field.editable,
                                valueState: fieldValueState,
                                selected: fieldValue,
                            })
                        );
                        break;

                    case 'Switch':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));
                        form.addContent(
                            new sap.m.Switch({
                                visible: field.visible,
                                enabled: field.editable,
                                state: fieldValue,
                            })
                        );
                        break;

                    case 'MultiSelect':
                    case 'MultiSelectLookup':
                    case 'MultiSelectScript':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));

                        let multiField = new sap.m.MultiComboBox({
                            width: '100%',
                            visible: field.visible,
                            selectedKeys: fieldValue,
                            placeholder: field.placeholder || '',
                            valueState: fieldValueState,
                            showSecondaryValues: true
                        });

                        if (field.items) field.items.sort(sort_by('text'));
                        field.items.forEach(function (item) {
                            multiField.addItem(new sap.ui.core.ListItem({ key: item.key, text: item.text, additionalText: item.additionalText }));
                        });

                        form.addContent(multiField);
                        break;

                    case 'SingleSelect':
                    case 'SingleSelectLookup':
                    case 'SingleSelectScript':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));

                        let singleField = new sap.m.ComboBox({
                            width: '100%',
                            visible: field.visible,
                            editable: field.editable,
                            placeholder: field.placeholder || '',
                            selectedKey: fieldValue,
                            valueState: fieldValueState,
                            showSecondaryValues: true
                        });
                        form.addContent(singleField);

                        singleField.addItem(new sap.ui.core.Item({ key: '', text: '', }));

                        if (field.items) field.items.sort(sort_by('text'));
                        field.items.forEach(function (item) {
                            singleField.addItem(
                                new sap.ui.core.ListItem({
                                    key: item.key, text: item.text, additionalText: item.additionalText
                                })
                            );
                        });
                        break;

                    case 'TextArea':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));
                        form.addContent(
                            new sap.m.TextArea({
                                visible: field.visible,
                                editable: field.editable,
                                rows: parseInt(field.textAreaRows) || 2,
                                placeholder: field.placeholder || '',
                                valueState: fieldValueState,
                                value: fieldValue,
                                width: '100%'
                            })
                        );
                        break;

                    default:
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required }));
                        form.addContent(
                            new sap.m.Input({
                                visible: field.visible,
                                editable: field.editable,
                                type: field.inputType || 'Text',
                                placeholder: field.placeholder || '',
                                valueState: fieldValueState,
                                value: fieldValue,
                            })
                        );
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

            let numFields = ModelData.Find(config.settings.fieldsSel, 'visible', true)
            let numFilters = (numFields) ? numFields.length : 1;
            if (enableSearch) numFilters++;

            let columnsM = 2;
            let columnsL = 2;

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

            let form = new sap.ui.layout.form.SimpleForm({
                layout: 'ColumnLayout',
                editable: true,
                labelSpanL: 12,
                labelSpanM: 12,
                columnsM: columnsM,
                columnsL: columnsL,
            });

            if (config.settings.properties.form.enableCompact) {
                form.addStyleClass('sapUiSizeCompact');
            } else {
                form.removeStyleClass('sapUiSizeCompact');
            }

            // Search
            if (enableSearch) {

                form.addContent(new sap.m.Label({
                    text: sap.n.Adaptive.translateProperty('report', 'searchLabel', config),
                    width: '100%'
                }));

                form.addContent(new sap.m.SearchField({
                    placeholder: sap.n.Adaptive.translateProperty('report', 'searchPlaceholder', config),
                    liveChange: function (oEvent) {
                        let searchField = this;
                        let filters = [];
                        let bindingItems = table.getBinding('items');
                        let fieldsFilter = ModelData.Find(config.settings.fieldsRun, 'enableFilter', true);

                        fieldsFilter.forEach(function ({ name, valueType }) {
                            filters.push(
                                new sap.ui.model.Filter(valueType ? `${name}_value` : name, 'Contains', searchField.getValue()),
                            );
                        });

                        bindingItems.filter([new sap.ui.model.Filter({
                            filters: filters,
                            and: false
                        })]);

                    }

                }));

            }

            config.settings.fieldsSel.forEach(function (field) {
                const { name, type } = field;
                if (field.default) {
                    if (['MultiSelect', 'MultiSelectLookup', 'MultiSelectScript'].includes(type)) {
                        if (typeof field.default === 'object') {
                            appdata[name] = field.default;
                        } else {
                            if (field.default.indexOf('[') > -1) {
                                appdata[name] = JSON.parse(field.default);
                            } else {
                                appdata[name] = field.default;
                            }
                        }

                    } else if (['Switch', 'CheckBox'].includes(type)) {
                        if (field.default === 'true' || field.default === '1' || field.default === 'X') {
                            appdata[name] = true;
                        } else {
                            delete appdata[name];
                        }

                    } else {
                        appdata[name] = field.default;
                    }
                }
                if (field.required) delete appdata[`${name}ValueState`];

                const fieldValue = `{AppData>/${name}}`;
                const fieldValueState = `{AppData>/${name}ValueState}`;

                function onChange(_oEvent) {
                    if (run) run();
                }

                switch (type) {
                    case 'MultiSelect':
                    case 'MultiSelectLookup':
                    case 'MultiSelectScript':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required: field.required }));

                        let multiField = new sap.m.MultiComboBox({
                            width: '100%',
                            visible: field.visible,
                            selectedKeys: fieldValue,
                            valueState: fieldValueState,
                            showSecondaryValues: true,
                            selectionChange: onChange,
                        });

                        if (field.items) {
                            field.items.sort(sort_by('text'));
                            field.items.forEach(function ({ key, text, additionalText }) {
                                multiField.addItem(new sap.ui.core.ListItem({ key, text, additionalText }));
                            });
                        }

                        form.addContent(multiField);
                        break;

                    case 'SingleSelect':
                    case 'SingleSelectLookup':
                    case 'SingleSelectScript':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required: field.required }));

                        let singleField = new sap.m.ComboBox({
                            width: '100%',
                            visible: field.visible,
                            selectedKey: fieldValue,
                            valueState: fieldValueState,
                            showSecondaryValues: true,
                            change: onChange,
                        });
                        singleField.addItem(new sap.ui.core.Item({ key: '', text: '', }));

                        if (field.items) {
                            field.items.sort(sort_by('text'));
                            field.items.forEach(function ({ key, text, additionalText }) {
                                singleField.addItem(new sap.ui.core.ListItem({ key, text, additionalText }));
                            });
                        }

                        form.addContent(singleField);
                        break;

                    case 'DateRange':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required: field.required }));
                        form.addContent(
                            new sap.m.DateRangeSelection({
                                width: '100%',
                                visible: field.visible,
                                dateValue: fieldValue,
                                secondDateValue: `{AppData>/${name}_end}`,
                                valueState: fieldValueState,
                                change: onChange,
                            })
                        );
                        break;

                    case 'CheckBox':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required: field.required }));
                        form.addContent(
                            new sap.m.CheckBox({
                                width: '100%',
                                visible: field.visible,
                                useEntireWidth: true,
                                selected: fieldValue,
                                valueState: fieldValueState,
                                select: onChange,
                            })
                        );
                        break;

                    case 'Switch':
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required: field.required }));
                        form.addContent(
                            new sap.m.Switch({
                                visible: field.visible,
                                state: fieldValue,
                                change: onChange,
                            })
                        );
                        break;

                    default:
                        form.addContent(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), required: field.required }));
                        form.addContent(
                            new sap.m.SearchField({
                                width: '100%',
                                visible: field.visible,
                                value: fieldValue,
                                // valueState: fieldValueState,
                                search: onChange,
                            })
                        );
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

        const t = config.settings.translation;
        if (t && t[config.language] && t[config.language].fieldCatalog[field.name]) {
            return t[config.language].fieldCatalog[field.name]
        }

        return field.text;
    },

    translateProperty: function (parent, key, config) {

        if (!config.language) return config.settings.properties[parent][key]

        if (config.settings.translation && config.settings.translation[config.language] && config.settings.translation[config.language][parent][key]) {
            return config.settings.translation[config.language][parent][key]
        }
        return config.settings.properties[parent][key];

    },

    buildTableColumns: function (table, config, events) {

        try {

            if (config.settings.properties.table.enableCompact) {
                table.addStyleClass('sapUiSizeCompact');
            } else {
                table.removeStyleClass('sapUiSizeCompact');
            }

            try {
                table.destroyColumns();
            } catch (e) { }

            let Column = new sap.m.ColumnListItem({ selected: '{_sel}' });

            // Handle Item Press
            if (config.settings.properties.report._navigationItemPress) {

                Column.setType('Active');
                Column.attachPress(function (oEvent) {

                    let context = oEvent.oSource.getBindingContext();
                    let columnData = context.getObject();

                    if (config.settings.properties.report._navigationItemPress.dialogTitleField) {
                        config.settings.properties.report._navigationItemPress.dialogTitleFieldText = columnData[config.settings.properties.report._navigationItemPress.dialogTitleField + '_value'] || columnData[config.settings.properties.report._navigationItemPress.dialogTitleField];
                    }

                    sap.n.Adaptive.navigation(config.settings.properties.report._navigationItemPress, columnData, events, table.sId)
                });

            }

            // Build Columns
            config.settings.fieldsRun.forEach(function (field) {
                if (!field.visible) return;

                let ColumnHeader = new sap.m.Column({
                    width: field.width,
                    minScreenWidth: field.minScreenWidth,
                });

                if (field.hAlign) ColumnHeader.setHAlign(field.hAlign);

                // Enable Sum 
                if (field.enableSum && field.type === 'ObjectNumber') {
                    let sumField = new sap.m.ObjectNumber({
                        number: '{AppConfig>/settings/properties/table/_sum/' + field.name + '}',
                        unit: '{AppConfig>/settings/properties/table/_sum/' + field.name + '_unit}',
                    })
                    ColumnHeader.setFooter(sumField);
                }

                let HBox = new sap.m.HBox();

                HBox.addItem(new sap.m.Label({ text: sap.n.Adaptive.translateFieldLabel(field, config), wrapping: true }));

                let enabled = true;
                if (field.enableSort || field.enableGroup) {
                    let ColumnButton = new sap.ui.core.Icon({
                        src: 'sap-icon://slim-arrow-down',
                        press: function (oEvent) {
                            if (events.onHeaderClick) events.onHeaderClick(field, this);
                        }
                    });
                    ColumnButton.addStyleClass('sapUiTinyMarginBegin');
                    HBox.addItem(ColumnButton);
                }

                ColumnHeader.setHeader(HBox);

                table.addColumn(ColumnHeader);

                let newField = null;
                let formatterProp = 'text';

                const { name, type } = field;
                switch (type) {
                    case 'Link':
                        const linkOpts = {
                            text: getFieldBindingText(field),
                            wrapping: field.wrapping || false,
                            press: function (oEvent) {
                                if (!field._navigation) return;

                                let context = oEvent.oSource.getBindingContext();
                                let columnData = context.getObject();

                                // Sidepanel Lookup Text 
                                if (field._navigation.openAs === 'S') {
                                    const dtf = field._navigation.dialogTitleField;
                                    const fieldName = ModelData.FindFirst(config.settings.fieldsRun, 'name', dtf);
                                    field._navigation.dialogTitleFieldText = fieldName.valueType ? columnData[`${dtf}_value`] : columnData[dtf];
                                }

                                // Add pressed fieldname
                                events.objectPressed = name;
                                sap.n.Adaptive.navigation(field._navigation, columnData, events, newField.sId)
                            }
                        }

                        if (field.linkHrefType) {
                            linkOpts.href = `{${name}_href}`;
                            linkOpts.target = '_blank';
                        }

                        newField = new sap.m.Link(linkOpts);
                        break;

                    case 'ObjectNumber':
                        formatterProp = 'number';
                        const objNumOpts = {
                            number: getFieldBindingText(field),
                        };

                        if (field.numberUnitType) objNumOpts.unit = `{${name}_unit}`;
                        if (field.numberStateType) objNumOpts.state = `{${name}_state}`;

                        newField = new sap.m.ObjectNumber(objNumOpts);

                        if (field.numberUnitType && field.numberUnitFormatter) {
                            let fieldName = `${name}_unit`;
                            newField.bindProperty('unit', {
                                parts: [fieldName],
                                formatter: function (fieldName) {
                                    if (typeof (fieldName) === 'undefined' || fieldName === null) return;
                                    return sap.n.Adaptive.formatter(fieldName, field.numberUnitFormatter);
                                }
                            });
                        }
                        break;

                    case 'ObjectStatus':
                        formatterProp = 'text';
                        const objStatusOpts = {
                            text: getFieldBindingText(field),
                        };

                        if (field.statusTitleType) objStatusOpts.title = `{${name}_title`;
                        if (field.statusIconType) objStatusOpts.icon = `{${name}_icon`;
                        if (field.statusStateType) objStatusOpts.state = `{${name}_state`;

                        newField = new sap.m.ObjectStatus(objStatusOpts);

                        if (field.statusTitleType && field.statusTitleFormatter) {
                            let fieldName = `${name}_title`;
                            newField.bindProperty('title', {
                                parts: [fieldName],
                                formatter: function (fieldName) {
                                    if (typeof (fieldName) === 'undefined' || fieldName === null) return;
                                    return sap.n.Adaptive.formatter(fieldName, field.statusTitleFormatter);
                                }
                            });
                        }
                        break;

                    case 'CheckBox':
                        newField = new sap.m.CheckBox({
                            editable: false,
                            selected: getFieldBindingText(field),
                            wrapping: field.wrapping || false,
                        })
                        break;

                    case 'Switch':
                        newField = new sap.m.Switch({
                            enabled: false,
                            state: getFieldBindingText(field),
                        })
                        break;

                    case 'Image':
                        newField = new sap.m.Image({
                            height: '32px',
                            src: getFieldBindingText(field),
                        })
                        break;

                    case 'Icon':
                        newField = new sap.ui.core.Icon({
                            src: getFieldBindingText(field),
                        })
                        break;

                    case 'Input':
                        newField = new sap.m.Input({
                            value: getFieldBindingText(field),
                        })
                        break;

                    default:
                        newField = new sap.m.Text({
                            text: getFieldBindingText(field),
                            wrapping: field.wrapping || false,
                        })
                        break;
                }

                Column.addCell(newField);

                // Formatter 
                if (field.formatter) {
                    let fieldName = (field.valueType ? `${name}_value` : name);
                    newField.bindProperty(formatterProp, {
                        parts: [fieldName],
                        formatter: function (fieldName) {
                            if (typeof (fieldName) === 'undefined' || fieldName === null) return;
                            return sap.n.Adaptive.formatter(fieldName, field.formatter);
                        }
                    });
                }
            });

            const t = config.settings.properties.table;

            // Row Action 1
            if (t.enableAction1) {
                table.addColumn(
                    new sap.m.Column({ width: t.action1Width || '' })
                );
                Column.addCell(
                    new sap.m.Button({
                        text: t.action1Text,
                        icon: t.action1Icon,
                        type: t.action1Type,
                        press: function (oEvent) {
                            if (!t._action1Nav) return;

                            let context = oEvent.oSource.getBindingContext();
                            let columnData = context.getObject();

                            const k = t._action1Nav.dialogTitleField;
                            if (k) {
                                t._action1Nav.dialogTitleFieldText = columnData[`${k}_value`] || columnData[k];
                            }

                            sap.n.Adaptive.navigation(t._action1Nav, columnData, events, table.sId)
                        }
                    })
                );
            }

            // Row Action 2
            if (t.enableAction2) {
                table.addColumn(
                    new sap.m.Column({ width: t.action2Width || '' })
                );
                Column.addCell(
                    new sap.m.Button({
                        text: t.action2Text,
                        icon: t.action2Icon,
                        type: t.action2Type,
                        width: t.action2Width || '',
                        press: function (oEvent) {
                            if (!t._action2Nav) return;

                            let context = oEvent.oSource.getBindingContext();
                            let columnData = context.getObject();

                            const k = t._action2Nav.dialogTitleField;
                            if (k) {
                                t._action2Nav.dialogTitleFieldText = columnData[`${k}_value`] || columnData[k];
                            }

                            sap.n.Adaptive.navigation(t._action2Nav, columnData, events, table.sId)
                        }
                    })
                );
            }

            // Row Action 3
            if (t.enableAction3) {
                table.addColumn(
                    new sap.m.Column({ width: t.action3Width || '' })
                );
                Column.addCell(
                    new sap.m.Button({
                        text: t.action3Text,
                        icon: t.action3Icon,
                        type: t.action3Type,
                        width: t.action3Width || '',
                        press: function (oEvent) {
                            if (!t._action3Nav) return;

                            let context = oEvent.oSource.getBindingContext();
                            let columnData = context.getObject();

                            const k = t._action3Nav.dialogTitleField;
                            if (k) {
                                t._action3Nav.dialogTitleFieldText = columnData[`${k}_value`] || columnData[k];
                            }

                            sap.n.Adaptive.navigation(t._action3Nav, columnData, events, table.sId)
                        }
                    })
                );
            }

            // Table - Aggregation
            table.bindAggregation('items', { path: '/', template: Column, templateShareable: false });
        } catch (e) {
            console.log(e);
        }
    },

    formatter: function (fieldName, formatter) {
        let formatDate00 = sap.ui.core.format.DateFormat.getDateTimeInstance();
        let formatDate01 = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: 'dd.MM.yyyy' });
        let formatDate02 = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: 'mm-dd-yyyy' });
        let formatDate03 = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: 'yyyy MMM' });
        let formatDate04 = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: 'yyyy QQ' });

        let formatNumber01 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 0, minFractionDigits: 0, groupingEnabled: true, groupingSeparator: ' ' });
        let formatNumber02 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 1, minFractionDigits: 1, groupingEnabled: true, groupingSeparator: ' ', decimalSeparator: ',' });
        let formatNumber03 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 2, minFractionDigits: 2, groupingEnabled: true, groupingSeparator: ' ', decimalSeparator: ',' });
        let formatNumber04 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 3, minFractionDigits: 3, groupingEnabled: true, groupingSeparator: ' ', decimalSeparator: ',' });
        let formatNumber05 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 1, minFractionDigits: 1, groupingEnabled: true, groupingSeparator: ' ', decimalSeparator: '.' });
        let formatNumber06 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 2, minFractionDigits: 2, groupingEnabled: true, groupingSeparator: ' ', decimalSeparator: '.' });
        let formatNumber07 = sap.ui.core.format.NumberFormat.getFloatInstance({ maxFractionDigits: 3, minFractionDigits: 3, groupingEnabled: true, groupingSeparator: ' ', decimalSeparator: '.' });

        switch (formatter) {

            case 'date00':
                return formatDate00.format(sap.n.Adaptive.getDate(fieldName));

            case 'date01':
                return formatDate01.format(sap.n.Adaptive.getDate(fieldName));

            case 'date02':
                return formatDate02.format(sap.n.Adaptive.getDate(fieldName));

            case 'date03':
                return formatDate03.format(sap.n.Adaptive.getDate(fieldName));

            case 'date04':
                return formatDate04.format(sap.n.Adaptive.getDate(fieldName));

            case 'sapdate01':
                return fieldName.substr(6, 2) + '.' + fieldName.substr(4, 2) + '.' + fieldName.substr(0, 4);

            case 'sapdate02':
                return fieldName.substr(4, 2) + '-' + fieldName.substr(6, 2) + '-' + fieldName.substr(0, 4);

            case 'zero':
                return fieldName.replace(/^0+/, '');

            case 'uppercase':
                return fieldName.toUpperCase();

            case 'lowercase':
                return fieldName.toLowerCase();

            case 'number00':
                return parseFloat(fieldName).toLocaleString();

            case 'number01':
                return formatNumber01.format(fieldName);

            case 'number02':
                return formatNumber02.format(fieldName);

            case 'number03':
                return formatNumber03.format(fieldName);

            case 'number04':
                return formatNumber04.format(fieldName);

            case 'number05':
                return formatNumber05.format(fieldName);

            case 'number06':
                return formatNumber06.format(fieldName);

            case 'number07':
                return formatNumber07.format(fieldName);

            case 'file':
                oFileSizeFormat = sap.ui.core.format.FileSizeFormat.getInstance({ binaryFilesize: false, decimals: 2 });
                return oFileSizeFormat.format(fieldName);

            default:
                return fieldName;
        }
    },

    getDate: function (dateValue) {
        if (typeof dateValue === 'string' && dateValue.length === 13) return new Date(parseInt(dateValue));
        return new Date(dateValue);
    },

    getConfig: function (id) {
        return new Promise(function (resolve) {
            if (localAppID !== 'ADAPTIVEDESIGNER') {
                if (sap.n.Adaptive.configurations[id]) return resolve(sap.n.Adaptive.configurations[id]);
            }

            jsonRequest({
                url: AppCache.Url + '/api/functions/Adaptive/Get',
                data: JSON.stringify({ id: id }),
                success: function (data) {
                    sap.n.Adaptive.configurations[id] = data;
                    resolve(data);
                },
                error: function (result, status) {
                    resolve(result);
                }
            });
        });
    },

    checkRequiredSel: function (fields, data) {
        let valid = true;
        fields.filter(function ({ required }) {
            return required;
        }).forEach(function ({ type, name, required }) {
            const v = data[name];
            const k = `${name}ValueState`;

            data[k] = 'None';

            if (!v) {
                valid = false;
                data[k] = 'Error';
            }

            if (['MultiSelect', 'MultiSelectLookup', 'MultiSelectScript'].includes(type) && v && !v.length) {
                valid = false;
                data[k] = 'Error';
            }
        });

        // remove invalid state
        if (valid) {
            fields.filter(function ({ required }) {
                return required;
            }).forEach(function ({ name }) {
                delete data[`${name}ValueState`];
            });
        }

        return valid;
    },

    setDefaultData: function (config, metadata) {
        if (!metadata) return;

        const propReport = metadata.properties.report || [];
        for (let key in propReport) {
            let field = propReport[key];
            if (typeof field.default !== 'undefined' && typeof config.settings.properties.report[key] === 'undefined') config.settings.properties.report[key] = field.default;
        }

        const propForm = metadata.properties.form || [];
        for (let key in propForm) {
            let field = propForm[key];
            if (typeof field.default !== 'undefined' && typeof config.settings.properties.form[key] === 'undefined') config.settings.properties.form[key] = field.default;
        }

        const propTable = metadata.properties.table || [];
        for (let key in propTable) {
            let field = propTable[key];
            if (typeof field.default !== 'undefined' && typeof config.settings.properties.table[key] === 'undefined') config.settings.properties.table[key] = field.default;
        }
    },

    grouping: function (config, groupBy, oContext) {
        let data = oContext.getObject();
        let field = ModelData.FindFirst(config.settings.fieldsRun, 'name', groupBy);
        let fieldName = (field.valueType ? field.name + '_value' : field.name);

        if (field.formatter) return sap.n.Adaptive.formatter(data[fieldName], field.formatter);

        return data[fieldName];
    },

    editor: function (obj, config) {
        obj.editor = {
            data: config.data || '',
            editable: config.editable || false,
            setData: function (data) {
                this.data = data;
                if (typeof obj.editor.sun !== 'undefined') {
                    obj.editor.sun.setContents(this.data);
                    obj.editor.sun.core.history.stack = [];
                    obj.editor.sun.core.history.reset();
                }
            },
            getData: function () {
                return this.data;
            },
            onChange: config.onChange || function () { },
            setEditable: function (status) {
                this.editable = status;
                if (typeof obj.editor.sun !== 'undefined') {
                    if (this.editable) {
                        obj.editor.sun.enabled();
                    } else {
                        obj.editor.sun.disabled();
                    }
                }
            }
        };

        let id;

        id = config.id || ModelData.genID();
        let data = config.data || '';

        obj.addStyleClass(id);

        id = 'nepHtmlEditor-' + ModelData.genID();
        obj.addStyleClass('nepHtmlEditor ');
        obj.addStyleClass(id);
        obj.addItem(new sap.ui.core.HTML(id, {}).setContent(`<textarea id=${id}></textarea>`));

        function resizeEditor(el) {
            if (!el) return;

            const prefix = `.${id} .se-wrapper-inner.se-wrapper`;
            const height = getHeight(el) - getHeight(querySelector('.se-toolbar.sun-editor-common')) - 32 - 4 - 2;
            setHeight(querySelector(`${prefix}-wysiwyg.sun-editor-editable`), height);
            setHeight(querySelector(`${prefix}-code`), height + 22);
        }

        obj.onAfterRendering = function () {
            sap.ui.Device.resize.attachHandler(function (mParams) {
                resizeEditor(obj.getDomRef());
            });

            let height = getHeight(obj.getDomRef()) - 250;
            let createEditor = function () {
                const buttonList = [
                    ['undo', 'redo'],
                    ['font', 'fontSize', 'formatBlock'],
                    ['bold', 'underline', 'italic', 'fontColor', 'hiliteColor'],
                    ['outdent', 'indent', 'align', 'horizontalRule', 'list', 'lineHeight'],
                    ['table', 'link', 'image', 'video', 'audio'],
                    ['showBlocks', 'removeFormat', 'codeView', 'fullScreen'],
                ];

                let editor = SUNEDITOR.create((document.getElementById(id) || id), {
                    width: '100%',
                    height: height,
                    value: obj.editor.data,
                    resizingBar: false,
                    defaultStyle: 'font-family: cursive: font-size:14px',
                    buttonList: config.buttonList || buttonList,
                    font: ['Arial', 'Comic Sans MS', 'Courier New', 'Impact', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Verdana'],
                    attributesWhitelist: {
                        'all': 'style',
                        'img': 'src|style|data-rotatey|data-rotatex|data-index',
                    }
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
                    resizeEditor(obj.getDomRef());
                }, 1);
            }

            if (typeof SUNEDITOR !== 'object') {
                let actions = [];
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
            appendStylesheetToHead('/public/editor/suneditor.min.css');

            request({
                type: 'GET',
                url: '/public/editor/suneditor.min.js',
                success: function (data) {
                    resolve('OK');
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    resolve('ERROR');
                },
                dataType: 'script',
                cache: true
            });
        });
    }
}