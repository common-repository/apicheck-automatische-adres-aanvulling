jQuery(document).ready(function ($) {
    const { __ } = wp.i18n;

    let debounceTimout = null;
    let prevSearchAddressValues = { billing: '', shipping: '' };

    const LookupHandler = function (fields) {
        this.prefix = fields.prefix;

        this.$companyField = $(fields.company + '_field');
        this.$countryField = $(fields.country + '_field');
        this.$stateField = $(fields.state + '_field');
        this.$cityField = $(fields.city + '_field');
        this.$address1Field = $(fields.address_1 + '_field');
        this.$address2Field = $(fields.address_2 + '_field');
        this.$streetField = $(fields.street + '_field');
        this.$postcodeField = $(fields.postcode + '_field');

        this.$housenumberField = $(fields.housenumber + '_field');
        this.$housenumberAdditionField = $(fields.housenumber_addition + '_field');
        this.$autocompleteMunicipalityField = $(fields.municipality_autocomplete + '_field');
        this.$autocompleteStreetField = $(fields.street_autocomplete + '_field');

        // Find and set fields
        this.$company = this.$companyField.find(':input');
        this.$country = this.$countryField.find(':input');
        this.$state = this.$stateField.find(':input');
        this.$city = this.$cityField.find(':input');
        this.$address1 = this.$address1Field.find(':input');
        this.$address2 = this.$address2Field.find(':input');
        this.$street = this.$streetField.find(':input');
        this.$postcode = this.$postcodeField.find(':input');

        this.$housenumber = this.$housenumberField.find(':input');
        this.$housenumberAddition = this.$housenumberAdditionField.find(':input');
        this.$autocompleteMunicipality = this.$autocompleteMunicipalityField.find(':input');
        this.$autocompleteStreet = this.$autocompleteStreetField.find(':input');

        this.selectedPostalcodeId = null;
        this.selectedCityId = null;
        this.selectedStreetId = null;

        if (!this.isCheckout()) {
            return;
        }

        prevSelectedCountry = this.getSelectedCountryCode();
        this.$country.on('change', () => {
            this.setupFields(fields.prefix);
        });

        this.setupFields(fields.prefix);

        for (let type of ['billing', 'shipping']) {
            var lookupHandler = this;
            jQuery(document).on("input", `#${type}_postcode, #${type}_housenumber`, () => {
                clearTimeout(debounceTimout);
                debounceTimout = setTimeout(function () {
                    lookupHandler.FieldChanged(type)
                }, 500);
            });

            if (apichecknl_params.validate_number_addition == "1") {
                jQuery(document).on("input", `#${type}_housenumber_addition`, () => {
                    clearTimeout(debounceTimout);
                    debounceTimout = setTimeout(function () {
                        lookupHandler.FieldChanged(type)
                    }, 500);
                });
            }
        }

        const parseCitySearchResults = (data) => {
            const result = data.result.data.Results;
            const parsedResults = [];
            result.forEach((item) => {
                if (item.Postalcodes) {
                    item.Postalcodes.forEach((postalcode) => {
                        parsedResults.push({
                            'name': item.name + " - " + postalcode.name,
                            'city': item.name,
                            'postalcode': postalcode.name,
                            'city_id': item.city_id,
                            'postalcode_id': postalcode.postalcode_id,
                        });
                    });
                } else {
                    parsedResults.push({
                        'name': item.name + " - " + item.City.name,
                        'city': item.City.name,
                        'postalcode': item.name,
                        'city_id': item.City.city_id,
                        'postalcode_id': item.postalcode_id,
                    });
                }
            });
            return parsedResults;
        }

        const onSearchCity = async ({ currentValue }) => {
            const isNumeric = /^[0-9]+$/.test(currentValue);
            const params = {
                searchType: isNumeric ? 'postalcode' : 'city',
                country: lookupHandler.getSelectedCountryCode(),
                name: currentValue,
            };
            try {
                const data = await lookupHandler.doSearchCall(params);
                return parseCitySearchResults(data);
            } catch (error) {
                this.showManualEntryFields();
                this.releaseFieldsLock();
                console.error(error);
            }
        };

        const onSearchStreet = async ({ currentValue }) => {
            const params = {
                searchType: 'street',
                country: lookupHandler.getSelectedCountryCode(),
                postalcode_id: this.selectedPostalcodeId,
                city_id: this.selectedCityId,
                name: currentValue,
                limit: 25
            };
            try {
                const data = await lookupHandler.doSearchCall(params);
                return parseStreetSearchResults(data);
            } catch (error) {
                this.showManualEntryFields();
                this.releaseFieldsLock();
                console.error(error);
            }
        };

        const parseStreetSearchResults = (data) => {
            result = data.result.data.Results;
            // Rebuild array for autocomplete
            parsedResults = [];
            result.forEach((item) => {
                parsedResults.push({
                    'name': item.name,
                    'id': item.street_id,
                });
            });
            return parsedResults;
        }

        const createOrUpdateHiddenField = function (prefix, fieldId, value) {
            let hiddenField = $(`#${prefix}_${fieldId}`);
            if (hiddenField.length === 0) {
                hiddenField = $('<input>').attr({
                    type: 'hidden',
                    id: `${prefix}_${fieldId}`,
                    name: `${prefix}_${fieldId}`,
                }).appendTo(`form.checkout`);
            }
            hiddenField.val(value);
        };

        const onSubmitCity = ({ index, element, object, results }) => {
            if (object != undefined) {
                const prefix = fields.prefix;
                $(`#${prefix}_municipality_city`).val(object.city);
                $(`#${prefix}_municipality_postalcode`).val(object.postalcode);
                this.selectedCityId = object.city_id;
                this.selectedPostalcodeId = object.postalcode_id;
                $(`#${prefix}_postcode`).val(object.postalcode);
                $(`#${prefix}_city`).val(object.city);
                createOrUpdateHiddenField(prefix, 'city_id', object.city_id);
                createOrUpdateHiddenField(prefix, 'postalcode_id', object.postalcode_id);
            }
        };

        const onSubmitStreet = ({ index, element, object, results }) => {
            if (object != undefined) {
                const prefix = fields.prefix;
                this.selectedStreetId = object.id;
                $(`#${prefix}_street`).val(object.name);
                $(`#${prefix}_address_1`).val(object.name);
                createOrUpdateHiddenField(prefix, 'selectedStreetId', object.id);
            }
        };

        new Autocomplete(`${fields.prefix}_municipality_autocomplete`, {
            delay: 500,
            clearButton: false,
            disableCloseOnSelect: false,
            showAllValues: false,
            onSearch: onSearchCity,
            onSelectedItem: ({ element, object }) => {
                if (!object) return;
                element.value = object.name;
            },
            onResults: ({ matches }) =>
                matches.map((el) => `<li>${el.name}</li>`).join(""),
            onSubmit: onSubmitCity
        });

        new Autocomplete(`${fields.prefix}_street_autocomplete`, {
            delay: 500,
            clearButton: false,
            disableCloseOnSelect: false,
            showAllValues: false,
            onSearch: onSearchStreet,
            onResults: ({ matches }) =>
                matches.map((el) => `<li>${el.name}</li>`).join(""),
            onSubmit: onSubmitStreet
        });

    };

    LookupHandler.prototype.isCheckout = function () {
        return this.$country.length > 0 && this.$postcode.length > 0 && this.$city.length > 0;
    };

    LookupHandler.prototype.markFieldsAsRequired = function (fields) {
        const required = '<abbr class="required" title="">*</abbr>';

        fields.forEach(field => {
            field.find('label').children().remove();
            field.addClass('validated-required').find('label').append(required);
        });
    };

    LookupHandler.prototype.setupFields = function (type) {
        setTimeout(() => {
            jQuery(`#${type}_street`).val(jQuery(`#${type}_address_1`).val().replace(/\d+/g, ''));
            let selectedCountryCode = this.getSelectedCountryCode();
            this.reorderFields(selectedCountryCode);
            this.listen(selectedCountryCode);
        }, 1);
    };

    LookupHandler.prototype.listen = function (selectedCountryCode) {
        setTimeout(() => {
            if (this.isCountryEligibleForLookup(selectedCountryCode)) {
                this.applyFieldsLock();
            } else {
                this.$postcode.off('blur input');
                this.$housenumber.off('blur input');
                this.$housenumberAddition.off('blur input');
                this.hardResetFields(selectedCountryCode);
                this.releaseFieldsLock();
            }
        }, 1);
    };

    LookupHandler.prototype.reorderFields = function (selectedCountryCode) {
        jQuery(`.apichecknlMessage`).remove();
        if (!this.isCountryEligibleForLookup(selectedCountryCode)) {
            this.showDefaultFields();
            return;
        }
        setTimeout(() => {
            this.hardResetFields(selectedCountryCode);
            if (selectedCountryCode === 'NL' || selectedCountryCode === 'LU') {
                jQuery(`#manual_entry_${this.prefix}_field`).remove();
                this.handleLookupCountries();
            } else if (selectedCountryCode === 'BE' || selectedCountryCode === 'FR') {
                this.handleSearchCountries();
            }
        }, 1);
    };

    LookupHandler.prototype.handleLookupCountries = function () {
        this.markFieldsAsRequired([this.$streetField, this.$housenumberField]);
        this.showFields([this.$streetField, this.$cityField, this.$postcodeField, this.$housenumberField, this.$housenumberAdditionField]);
        this.hideFields([this.$autocompleteMunicipalityField, this.$autocompleteStreetField, this.$address1Field, this.$address2Field]);
        this.$cityField.insertAfter(this.$streetField);
        this.$postcodeField.insertBefore(this.$housenumberField);
    }

    LookupHandler.prototype.handleSearchCountries = function () {
        this.markFieldsAsRequired([this.$autocompleteMunicipalityField, this.$autocompleteStreetField, this.$housenumberField]);
        this.showFields([this.$autocompleteMunicipalityField, this.$autocompleteStreetField]);
        this.hideFields([this.$postcodeField, this.$streetField, this.$cityField, this.$address1Field, this.$address2Field]);
        this.$autocompleteStreetField.insertAfter(this.$autocompleteMunicipalityField);

        if (jQuery(`#manual_entry_${this.prefix}`).length == 0) {
            const message = __('Adres handmatig invullen?', 'apicheck-woocommerce-postcode-checker');
            this.$countryField.after(`<p class="form-row form-row-wide" id="manual_entry_${this.prefix}_field"><input type="checkbox" id="manual_entry_${this.prefix}" name="manual_entry_${this.prefix}"><label for="manual_entry_${this.prefix}" style="display: unset !important; margin-left:5px;">${message}</label></p>`);
        }

        var lookupHandler = this;
        jQuery('#manual_entry_' + this.prefix).on('change', function () {
            if (this.checked) {
                jQuery(`.apichecknlMessage`).remove();
                lookupHandler.showManualEntryFields();
            } else {
                lookupHandler.markFieldsAsRequired([lookupHandler.$autocompleteMunicipalityField, lookupHandler.$autocompleteStreetField, lookupHandler.$housenumberField]);
                lookupHandler.showFields([lookupHandler.$autocompleteMunicipalityField, lookupHandler.$autocompleteStreetField]);
                lookupHandler.hideFields([lookupHandler.$postcodeField, lookupHandler.$streetField, lookupHandler.$cityField, lookupHandler.$address1Field, lookupHandler.$address2Field]);
            }
        });
    }

    LookupHandler.prototype.showManualEntryFields = function () {
        setTimeout(() => {
            this.hideFields([this.$autocompleteMunicipalityField, this.$autocompleteStreetField]);
            this.showFields([this.$streetField, this.$cityField, this.$postcodeField]);
            this.releaseFieldsLock();
        }, 1);
    }

    LookupHandler.prototype.showDefaultFields = function () {
        this.showFields([this.$streetField]);
        this.hideFields([this.$autocompleteMunicipalityField, this.$autocompleteStreetField, this.$address1Field, this.$address2Field]);
    }

    LookupHandler.prototype.showFields = function (fields) {
        fields.forEach(field => {
            field.show();
        });
    };

    LookupHandler.prototype.hideFields = function (fields) {
        fields.forEach(field => {
            field.hide();
        });
    };

    LookupHandler.prototype.getSelectedCountryCode = function () {
        return this.$country.val().trim();
    };

    LookupHandler.prototype.applyFieldsLock = function () {
        this.$postcode.attr('autocomplete', 'off');
        this.$postcode.attr('maxlength', 7);
        this.$street.attr('readonly', true);
        this.$city.attr('readonly', true);
        this.$state.attr('readonly', true);
        this.$stateField.addClass('apichecknl-hidden');
    }

    LookupHandler.prototype.releaseFieldsLock = function () {
        this.$postcode.removeAttr('autocomplete');
        this.$postcode.removeAttr('maxlength');
        this.$street.removeAttr('readonly');
        this.$city.removeAttr('readonly');
        this.$state.removeAttr('readonly');
    };

    LookupHandler.prototype.softResetFields = function () {
        this.$street.val('');
        this.$city.val('');
        this.$state.val('').trigger('change');
    };

    LookupHandler.prototype.hardResetFields = function (selectedCountryCode) {
        if (this.prevSelectedCountryCode === 'BE' || this.prevSelectedCountryCode === 'FR') {
            this.$autocompleteMunicipalityField.val('');
            this.$autocompleteMunicipality.val('');
            this.$autocompleteStreetField.val('');
            this.$autocompleteStreet.val('');
            this.$city.val('');
            this.$cityField.val('');
            this.$street.val('');
            this.$streetField.val('');
            this.$postcode.val('');
            this.$postcodeField.val('');
        }

        this.prevSelectedCountryCode = selectedCountryCode;
    };

    LookupHandler.prototype.isCountryEligibleForLookup = function (selectedCountryCode) {
        selectedCountryCode = selectedCountryCode || this.getSelectedCountryCode();
        if (apichecknl_params.supported_countries.indexOf(selectedCountryCode) != -1) {
            return true
        } else {
            return false;
        }
    };

    // Check if the selected country is eligible for lookup
    if (typeof apichecknl_billing_fields !== 'undefined') {
        new LookupHandler(apichecknl_billing_fields);
    }

    // Check if the selected country is eligible for lookup
    if (typeof apichecknl_shipping_fields !== 'undefined') {
        new LookupHandler(apichecknl_shipping_fields);
    }

    LookupHandler.prototype.getSelectedCountry = function (type) {
        if (jQuery('#' + type + "_country option:selected").val() == undefined) {
            return jQuery('#' + type + "_country").val();
        } else {
            return jQuery('#' + type + "_country option:selected").val().trim().toUpperCase();
        }
    }

    LookupHandler.prototype.FieldChanged = function (type) {
        this.prefix = type;

        // Get the selected country
        var country = this.getSelectedCountry(type);
        // Check if the selected country is eligible for lookup
        if (!LookupHandler.prototype.isCountryEligibleForLookup(country)) {
            return;
        }

        // Get the postcode value from the specified field
        var postcode = jQuery(`#${type}_postcode`).val().trim() || jQuery(`#${type}_municipality_postalcode`).val().trim();
        // Get the housenumber value from the specified field
        var housenumber = jQuery(`#${type}_housenumber`).val().trim();
        // Get the housenumber addition value from the specified field
        var housenumberAddition = jQuery(`#${type}_housenumber_addition`).val().trim();

        // Return if any of the required values are not present
        if (!country || !housenumber || !postcode) {
            return;
        }

        // Create a hash of the current search values
        let hash = country + '/' + housenumber + '/' + housenumberAddition + '/' + postcode;
        if (prevSearchAddressValues[type] === hash) {
            return;
        }
        prevSearchAddressValues[type] = hash;
        let params = {};

        if (country === 'BE' || country === 'FR') {
            params = {
                searchType: 'address',
                country: country,
                number: housenumber,
            };

            params.postalcode_id = jQuery(`#${type}_postalcode_id`).val();
            params.street_id = jQuery(`#${type}_selectedStreetId`).val();

            if (housenumberAddition) {
                params.numberAddition = housenumberAddition;
            }

            jQuery(`#${type}_address_2`).val(params.number);

            this.doSearchCall(params, type)
                .then(data => {
                    if (data.result.count === 0) {
                        jQuery(`.woocommerce-${type}-fields .apichecknlMessage`).remove();
                        this.showAddressNotFoundMessage(type, 'street_autocomplete', __('Huisnummer of toevoeging niet gevonden. Controleer het adres, en vul handmatig aan.', 'apicheck-woocommerce-postcode-checker'));
                        jQuery(`#${type}_municipality_autocomplete_field`).hide();
                        jQuery(`#${type}_street_autocomplete_field`).hide();
                        jQuery(`#${type}_postcode_field`).show();
                        jQuery(`#${type}_street_field`).show();
                        jQuery(`#${type}_city_field`).show();

                        jQuery(`#${type}_postalcode`).removeAttr('autocomplete');
                        jQuery(`#${type}_postalcode`).removeAttr('maxlength');
                        jQuery(`#${type}_street`).removeAttr('readonly');
                        jQuery(`#${type}_city`).removeAttr('readonly');
                        jQuery(document.body).trigger("update_checkout");
                    } else {
                        // Remove error when results are found
                        jQuery(`.woocommerce-${type}-fields .apichecknlMessage`).remove();
                    }
                }, error => {
                    jQuery(document.body).trigger("update_checkout");
                });
        } else {
            // Show loader
            jQuery(`#${type}_street`).css("opacity", "0.5").addClass('loadinggif');
            jQuery(`#${type}_city`).css("opacity", "0.5").addClass('loadinggif');

            params = {
                country: country,
                number: housenumber,
            };
            params.postalcode = postcode;
            if (housenumberAddition) {
                params.numberAddition = housenumberAddition;
            }

            var lookupHandler = this;
            this.doLookupCall(params, type)
                .then(data => {
                    // Hide loader
                    jQuery(`#${type}_street`).css("opacity", 1).removeClass('loadinggif').val(data.result.data.street);
                    jQuery(`#${type}_city`).css("opacity", 1).removeClass('loadinggif').val(data.result.data.city);
                    jQuery(`#${type}_postcode`).val(data.result.data.postalcode);
                    // Set hidden fields data
                    jQuery(`#${type}_address_1`).val(data.result.data.street + ' ' + data.result.data.number);
                    jQuery(`#${type}_address_2`).val(housenumberAddition);
                    jQuery(document.body).trigger("update_checkout");
                    if (data.result.count === 0) {
                        jQuery(`.woocommerce-${type}-fields .apichecknlMessage`).remove();
                        lookupHandler.showAddressNotFoundMessage(type, 'street', __('Er is geen adres gevonden met deze gegevens. Controleer en vul je adres handmatig in.', 'apicheck-woocommerce-postcode-checker'));
                        jQuery(`#${type}_street`).removeAttr('readonly');
                        jQuery(`#${type}_city`).removeAttr('readonly');
                    } else {
                        // Remove error when results are found
                        jQuery(`.woocommerce-${type}-fields .apichecknlMessage`).remove();
                    }
                }, error => {
                    // Hide loader
                    jQuery(`#${type}_street`).removeAttr('readonly');
                    jQuery(`#${type}_city`).removeAttr('readonly');
                    jQuery(`#${type}_street`).css("opacity", 1).removeClass('loadinggif');
                    jQuery(`#${type}_city`).css("opacity", 1).removeClass('loadinggif');
                    jQuery(document.body).trigger("update_checkout");
                });
        }
    }

    LookupHandler.prototype.doLookupCall = function (data, type) {
        data.action = 'apichecknl_lookup_call';
        type = type.replace('#', '');

        lookupHandler = this;
        return new Promise((resolve, reject) => {
            try {
                jQuery.post(apichecknl_ajax_object.ajax_url, data, function (response) {
                    // No results have been found
                    if (response.status == 1) {
                        jQuery(`.woocommerce-${type}-fields .apichecknlMessage`).remove();
                        resolve(response);
                    } else if (response.status == 404) {
                        // Check if we need to show a error message
                        jQuery(`.woocommerce-${type}-fields .apichecknlMessage`).remove();
                        lookupHandler.showAddressNotFoundMessage(type, 'country', __('Er is geen adres gevonden met deze gegevens. Controleer en vul je adres handmatig in.', 'apicheck-woocommerce-postcode-checker'));
                        jQuery(`#${type}_street`).removeAttr('readonly');
                        jQuery(`#${type}_city`).removeAttr('readonly');
                        reject(response);
                    }
                    // Something else happened
                    reject(response);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    LookupHandler.prototype.doSearchCall = function (data) {
        data.action = 'apichecknl_search_call';
        return new Promise((resolve, reject) => {
            try {
                jQuery.post(apichecknl_ajax_object.ajax_url, data, function (response) {
                    // No results have been found
                    if (response.status == 1) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    LookupHandler.prototype.showAddressNotFoundMessage = function (type, field, message) {
        jQuery(`#${type}_${field}_field`).after("<div id='apichecknlMessage' class='apichecknlMessage'>" + message + "</div>");
        const element = document.getElementById("apichecknlMessage");
        element.scrollIntoView();
    }
});