// Based upon code from https://github.com/LordOfTheStack/UI5-WCAG-HELPER
// Removed jQuery usage

// MIT License

// Copyright (c) 2020 Lord Phillip Smith

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

function applyWCAGFixes() {
    const panelAfterRender = sap.m.Panel.prototype.onAfterRendering;
    sap.m.Panel.prototype.onAfterRendering = function () {
        const dom = this.getDomRef();
        if (dom && !this.getHeaderText()) {
            dom.removeAttribute("aria-labelledby");
        }

        panelAfterRender.apply(this);
    };

    const buttonAfterRender = sap.m.Button.prototype.onAfterRendering;
    sap.m.Button.prototype.onAfterRendering = function () {
        const dom = this.getDomRef();
        if (!this.getText() && dom) {
            const tooltip = dom.getAttribute("title");

            if (tooltip) {
                dom.setAttribute("aria-label", tooltip);
            }
        }

        buttonAfterRender.apply(this);
    };

    const checkboxAfterRender = sap.m.CheckBox.prototype.onAfterRendering;
    sap.m.CheckBox.prototype.onAfterRendering = function () {
        const dom = this.getDomRef();

        if (dom) {
            const input = dom.getElementsByTagName("input")[0];
            const ariaLabel = dom.getAttribute("aria-labelledby");

            if (ariaLabel) {
                const splitLabel = ariaLabel.split(" ");

                if (splitLabel && splitLabel.length) {
                    const formLabel = document.getElementById(splitLabel[0]);

                    if (formLabel) {
                        formLabel.setAttribute("for", input.id);
                    }
                }
            }

            if (input && ariaLabel) {
                input.setAttribute("aria-labelledby", ariaLabel);
            }

            const text = this.getText();
            if (input && !ariaLabel) {
                input.setAttribute("aria-label", text);
            }
        }

        checkboxAfterRender.apply(this);
    };

    const selectAfterRender = sap.m.Select.prototype.onAfterRendering;
    sap.m.Select.prototype.onAfterRendering = function () {
        const dom = this.getDomRef();

        if (dom) {
            const labels = dom.getElementsByTagName("label");

            if (labels && labels.length) {
                for (const label of labels) {
                    label.outerHTML = label.outerHTML.replace(/label/g, "span");
                }
            }
        }

        selectAfterRender.apply(this);
    };

    navBar.addEventDelegate({
        onAfterRendering: function () {
            const dom = navBar.getDomRef();

            if (dom) {
                const current = dom.getAttribute("aria-label");

                if (!current) {
                    dom.setAttribute("aria-label", "Launchpad NavBar");
                }
            }
        },
    });

    function setAriaLabel(obj, label) {
        obj.addEventDelegate({
            onAfterRendering: function () {
                const dom = obj.getDomRef();

                if (!dom) {
                    return;
                }

                const current = dom.getAttribute("aria-label");

                if (!current) {
                    dom.setAttribute("aria-label", label);
                }
            },
        });
    }

    setAriaLabel(topMenu, "Launchpad Top Menu");
    setAriaLabel(navBar, "Launchpad NavBar");
    setAriaLabel(launchpadSettingsHeader, "Launchpad Settings Header");
    setAriaLabel(launchpadOverflowHeader, "Launchpad Overflow Header");

    function setAriaRole(item, role) {
        item.addEventDelegate({
            onAfterRendering: function () {
                const dom = item.getDomRef();

                if (!dom) {
                    return;
                }

                dom.setAttribute("role", role);
            },
        });
    }

    AppCacheListMenu.addEventDelegate({
        onAfterRendering: function () {
            const dom = AppCacheListMenu.getDomRef();

            if (!dom) {
                return;
            }

            const listItem = dom.querySelector(".sapMListItems");
            listItem.setAttribute("aria-label", "Launchpad Settings Menu");

            if (listItem?.children) {
                const children = Array.from(listItem.children);
                children.forEach(child => child.setAttribute("role", "listitem"));
            }
        },
    });
}