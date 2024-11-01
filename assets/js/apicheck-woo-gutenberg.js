jQuery(window).on('load', function ($) {
    const { __ } = wp.i18n;
    if (typeof wp !== 'undefined') {

        let checkoutFields;

        const LookupHandler = function (type) {
            this.formType = type;
            // Bind the click handler to the instance
            this.clickHandler = this.clickHandler.bind(this);
            jQuery(document).on('click', '.components-form-token-field__suggestions-list li', this.clickHandler);

            // Bind the place order handler to the instance 
            this.placeOrderHandler = this.placeOrderHandler.bind(this);
            jQuery('.wc-block-components-checkout-place-order-button').on('click', this.placeOrderHandler);

            this.setupFields();
            this.shippingCountryChanged();
        }

        LookupHandler.prototype.setupFields = function () {
            const address1 = jQuery(`#${this.formType}-address_1`)[0];
            const address2 = jQuery(`#${this.formType}-address_2`)[0];
            const city = jQuery(`#${this.formType}-city`)[0];
            const postcode = jQuery(`#${this.formType}-postcode`)[0];
            const country = jQuery(`#${this.formType}-country`)[0];

            // If all elements are present, stop the interval and execute your code
            if (address1 && address2 && city && postcode && country) {
                checkoutFields = {
                    address_1: {
                        input: address1,
                        label: jQuery(`label[for="${this.formType}-address_1"]`)[0],
                        container: jQuery(`#${this.formType} .wc-block-components-text-input.wc-block-components-address-form__address_1`)[0]
                    },
                    address_2: {
                        input: address2,
                        label: jQuery(`label[for="${this.formType}-address_2"]`)[0],
                        container: jQuery(`#${this.formType} .wc-block-components-text-input.wc-block-components-address-form__address_2`)[0]
                    },
                    city: {
                        input: city,
                        label: jQuery(`label[for="${this.formType}-city"]`)[0],
                        container: jQuery(`#${this.formType} .wc-block-components-text-input.wc-block-components-address-form__city`)[0]
                    },
                    postcode: {
                        input: postcode,
                        label: jQuery(`label[for="${this.formType}-postcode"]`)[0],
                        container: jQuery(`#${this.formType} .wc-block-components-text-input.wc-block-components-address-form__postcode`)[0]
                    },
                    country: {
                        input: country,
                        label: jQuery(`label[for="${this.formType}-country"]`)[0],
                        container: jQuery(`#${this.formType} .wc-block-components-text-input.wc-block-components-address-form__country`)[0]
                    }
                };
            } else {
                console.log(`Not all fields that ApiCheck needs are present. Disabling ApiCheck for: ${this.formType}`);
                if (!address1) console.log('Missing address1 field');
                if (!address2) console.log('Missing address2 field');
                if (!city) console.log('Missing city field');
                if (!postcode) console.log('Missing postcode field');
                if (!country) console.log('Missing country field');
                return;
            }
        };

        LookupHandler.prototype.createCustomField = function (name, labelText, fieldType, classes, required, readOnly) {
            const container = document.createElement('div');
            container.classList.add('wc-block-components-text-input', ...classes, `wc-block-components-address-form__${name}`, 'apicheck-custom-field');

            const input = document.createElement('input');
            input.type = fieldType;
            input.id = `${this.formType}-${name}`;
            input.autocapitalize = 'sentences';
            input.autocomplete = `${this.formType} ${name}`;
            input.setAttribute('aria-label', name.charAt(0).toUpperCase() + name.slice(1));
            input.required = required;
            input.readOnly = readOnly
            input.setAttribute('aria-invalid', false);

            const label = document.createElement('label');
            label.setAttribute('for', `${this.formType}-${name}`);
            label.textContent = labelText

            container.appendChild(input);
            container.appendChild(label);

            return container;
        }

        LookupHandler.prototype.moveAndHideFields = function (enableValidation) {
            // Check if custom fields already exist when enableValidation is true
            if (enableValidation == true && jQuery(`#${this.formType}-housenumber`).length && jQuery(`#${this.formType}-housenumber_suffix`).length && jQuery(`#${this.formType}-street`).length) {
                jQuery(`#${this.formType}-postcode`).parent().insertBefore(jQuery(`#${this.formType}-housenumber`).parent());
                return;
            }

            // Create custom fields for street, house number and house number suffix
            if (enableValidation == true) {
                // Check if custom fields already exist before creating them
                if (!jQuery(`#${this.formType}-housenumber`).length) {
                    jQuery(`#${this.formType}-postcode`).parent().after(this.createCustomField('housenumber', 'Huisnummer', 'text', [], true, false));
                }
                if (!jQuery(`#${this.formType}-housenumber_suffix`).length) {
                    jQuery(`#${this.formType}-housenumber`).parent().after(this.createCustomField('housenumber_suffix', 'Toevoeging', 'text', [], false, false));
                }
                if (!jQuery(`#${this.formType}-street`).length) {
                    jQuery(`#${this.formType}-housenumber_suffix`).parent().after(this.createCustomField('street', 'Straat', 'text', [], true, true));
                }

                jQuery(`.wc-block-components-address-form__postcode`).attr('style', 'width: calc(33% - 12px) !important; max-width: 100% !important;');
                jQuery(checkoutFields.address_1.container).hide();
                jQuery(checkoutFields.address_2.container).hide();
                jQuery(`#${this.formType}-city`).prop('readonly', true);
                this.addFocusListenersToCustomFields();
                this.listenForLookupInput();
            } else {
                if (checkoutFields) {
                    jQuery(checkoutFields.address_1.container).show();
                    jQuery(checkoutFields.address_2.container).show();
                    jQuery(checkoutFields.city.container).show();
                    document.querySelector('.wc-block-components-address-form__last_name').after(document.querySelector('.wc-block-components-country-input'));
                }
                jQuery('.wc-block-components-country-input').insertAfter('.wc-block-components-address-form__last_name');
                jQuery('.wc-block-components-address-form__postcode').attr('style', 'width: calc(100% - 12px) !important; max-width: 100% !important;');
                jQuery('.wc-block-components-address-form__housenumber').remove();
                jQuery('.wc-block-components-address-form__housenumber_suffix').remove();
                jQuery('.wc-block-components-address-form__street').remove();
            }
        }

        LookupHandler.prototype.addFocusListenersToCustomFields = function () {
            // Loop through each custom field and add event listeners
            jQuery('.apicheck-custom-field input').each(function () {
                // Add event listener for focus in
                jQuery(this).on('focusin', function () {
                    // Add is-active class to the field's container
                    if (!jQuery(this).prop('readonly')) {
                        jQuery(this).parent().addClass('is-active');
                    }
                });

                // Add event listener for focus out
                jQuery(this).on('focusout', function () {
                    // Check if input value is empty
                    if (!jQuery(this).val() && !jQuery(this).prop('readonly')) {
                        // Remove is-active class from the field's container
                        jQuery(this).parent().removeClass('is-active');
                    }
                });
            });
        }

        LookupHandler.prototype.validateCustomFields = function () {
            // Loop through each custom field
            jQuery('.apicheck-custom-field').each(function () {
                // Get the input element and its value
                var $input = jQuery(this).find('input');
                var value = $input.val();

                // Check if the field is required and its value is empty
                if ($input.prop('required') && value === '') {
                    // Add has-error class to the field's container
                    jQuery(this).addClass('has-error');

                    // Check if validation error message element already exists
                    var $error = jQuery(this).find('.wc-block-components-validation-error');
                    if ($error.length === 0) {
                        // Create validation error message element
                        $error = jQuery('<div class="wc-block-components-validation-error" role="alert"><p>Please enter a valid ' + $input.siblings('label').text() + '</p></div>');

                        // Append validation error message element
                        jQuery(this).append($error);
                    }
                } else {
                    // Remove has-error class from the field's container
                    jQuery(this).removeClass('has-error');

                    // Remove validation error message element
                    jQuery(this).find('.wc-block-components-validation-error').remove();
                }
            });
        }

        LookupHandler.prototype.getSelectedShippingCountry = function () {
            const shippingCountries = apichecknl_params.shipping_countries;
            var selectedCountry = jQuery(`#${this.formType}-country .components-combobox-control__input`).val();
            if (!selectedCountry) {
                selectedCountry = jQuery(`#${this.formType}-country .components-form-token-input-0`).val();
            }
            const countryCode = Object.keys(shippingCountries).find(key => shippingCountries[key] === selectedCountry);
            return countryCode ? countryCode.toLowerCase() : '';
        }

        LookupHandler.prototype.shippingCountryChanged = function () {
            if (apichecknl_params.supported_countries.includes(this.getSelectedShippingCountry().toUpperCase())) {
                this.moveAndHideFields(true);
            } else {
                this.moveAndHideFields(false);
            }
        }

        // Validation logic
        LookupHandler.prototype.validateAddress = function () {
            var postcode = checkoutFields.postcode.input.value;
            var housenumber = jQuery(`#${this.formType}-housenumber`).val();
            var housenumber_suffix = jQuery(`#${this.formType}-housenumber_suffix`).val();

            if (postcode && housenumber) {
                // Show loaders
                jQuery(`#${this.formType}-street`).css("opacity", "0.5").addClass('loadinggif');
                jQuery(`#${this.formType}-city`).css("opacity", "0.5").addClass('loadinggif');

                const params = {
                    country: this.getSelectedShippingCountry(),
                    number: housenumber,
                };
                params.postalcode = postcode;
                if (housenumber_suffix) {
                    params.numberAddition = housenumber_suffix;
                }
                this.doLookupCall(params).then(data => {
                    // Hide loaders
                    jQuery(`#${this.formType}-street`).css("opacity", 1).removeClass('loadinggif')
                    jQuery(`#${this.formType}-city`).css("opacity", 1).removeClass('loadinggif')

                    // Clear notice
                    jQuery('.wc-block-components-notices').remove();

                    // Set the street field value
                    jQuery(`#${this.formType}-street`).val(data.street);
                    jQuery(`#${this.formType} > div.wc-block-components-text-input.wc-block-components-address-form__street.apicheck-custom-field`).addClass('is-active');

                    // Set the hidden fields to display the correct values
                    const shippingAddressInput = document.getElementById(`${this.formType}-address_1`);
                    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(shippingAddressInput, data.street + ' ' + housenumber + (housenumber_suffix ? ' ' + housenumber_suffix : ''));
                    var ev2 = new Event('input', { bubbles: true });
                    shippingAddressInput.dispatchEvent(ev2);

                    const shippingCityInput = document.getElementById(`${this.formType}-city`);
                    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(shippingCityInput, data.city);
                    var ev2 = new Event('input', { bubbles: true });
                    shippingCityInput.dispatchEvent(ev2);

                }, error => {
                    //  Hide loaders
                    jQuery(`#${this.formType}-street`).css("opacity", 1).removeClass('loadinggif')
                    jQuery(`#${this.formType}-city`).css("opacity", 1).removeClass('loadinggif')

                    // Handle error
                    if (error.status === 404) {
                        this.showAddressNotFoundMessage(__('Huisnummer of toevoeging niet gevonden. Controleer het adres, en vul handmatig aan.', 'apicheck-woocommerce-postcode-checker'));
                        // Clear readonly fields
                        jQuery(`#${this.formType}-street`).prop('readonly', false);
                        jQuery(`#${this.formType}-city`).prop('readonly', false);
                    } else {
                        jQuery(`#${this.formType}-street`).prop('readonly', false);
                        jQuery(`#${this.formType}-city`).prop('readonly', false);
                    }

                    // Listen for input events on postcode and housenumber fields
                    jQuery(`#${this.formType}-postcode, #${this.formType}-housenumber, #${this.formType}-housenumber_suffix, #${this.formType}-street`).on('input', debounce(function () {
                        // Set the hidden fields to display the correct values
                        const addressInput = document.getElementById(`${this.formType}-address_1`);
                        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                        nativeInputValueSetter.call(addressInput, jQuery(`#${this.formType}-street`).val() + ' ' + jQuery(`#${this.formType}-housenumber`).val() + ' ' + jQuery(`#${this.formType}-housenumber_suffix`).val());
                        var ev2 = new Event('input', { bubbles: true });
                        addressInput.dispatchEvent(ev2);
                    }.bind(this), 500));

                });
            }
        }

        LookupHandler.prototype.listenForLookupInput = function () {
            // Store the instance of the LookupHandler in a variable
            var self = this;
            // Listen for input events on postcode and housenumber fields
            jQuery(`#${this.formType}-postcode, #${self.formType}-housenumber, #${self.formType}-housenumber_suffix`).on('input', debounce(function () {
                var postcode = jQuery(`#${self.formType}-postcode`).val();
                var housenumber = jQuery(`#${self.formType}-housenumber`).val();
                if (postcode && housenumber) {
                    // Wait for 500ms before triggering the validation function
                    debounce(self.validateAddress.bind(self), 500)();
                }
            }, 500));
        }

        LookupHandler.prototype.doLookupCall = function (params) {
            params.action = 'apichecknl_lookup_call';
            return new Promise((resolve, reject) => {
                try {
                    jQuery.post(apichecknl_ajax_object.ajax_url, params, function (response) {
                        // No results have been found
                        if (response.status == 1) {
                            resolve(response.result.data);
                        } else if (response.status == 404) {
                            // Check if we need to show a error message
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

        LookupHandler.prototype.showAddressNotFoundMessage = function (message) {
            jQuery('.wc-block-components-notices').remove();
            jQuery('.wc-block-components-address-form').before(
                `<div class="wc-block-components-notices">
                <div class="wc-block-components-notices__notice woocommerce-error components-notice is-info is-dismissible">
                    <div class="components-notice__content">${message}
                        <div class="components-notice__actions">
                        </div>
                    </div>
                    <button type="button" class="components-button components-notice__dismiss has-icon" aria-label="Dismiss this notice"><svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"></path></svg></button>
                </div>
            </div>`);
        }

        // Debounce helper function as a method of LookupHandler class
        function debounce(func, wait) {
            var timeout;

            return function () {
                var context = this,
                    args = arguments;

                var later = function () {
                    timeout = null;
                    func.apply(context, args);
                };

                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Click handler as a method of LookupHandler class
        LookupHandler.prototype.clickHandler = function (event) {
            this.shippingCountryChanged(jQuery(event.currentTarget).text());
        }

        // Place order handler as a method of LookupHandler class
        LookupHandler.prototype.placeOrderHandler = function (event) {
            // Validate the custom fields
            this.validateCustomFields(jQuery(event.currentTarget).text());
        }

        // Create a new instance of the LookupHandler for billing
        const shippingFields = document.querySelector('#shipping-fields');
        const billingFields = document.querySelector('#billing-fields');

        if (shippingFields) {
            new LookupHandler('shipping');
        } else if (billingFields) {
            new LookupHandler('billing');
        }

        const checkboxBilling = document.querySelector('.wc-block-components-checkbox.wc-block-checkout__use-address-for-billing input[type="checkbox"]');
        if (checkboxBilling) {
            checkboxBilling.addEventListener('change', function () {
                if (!this.checked) {
                    // Create a new instance of the LookupHandler class when the checkbox is checked
                    lookupHandler = new LookupHandler('billing');
                } else {
                    lookupHandler = null;
                }
            });
        }

        const checkboxShipping = document.querySelector('.wc-block-components-checkbox.wc-block-checkout__use-address-for-shipping input[type="checkbox"]');
        if (checkboxShipping) {
            checkboxShipping.addEventListener('change', function () {
                if (!this.checked) {
                    // Create a new instance of the LookupHandler class when the checkbox is checked
                    lookupHandler = new LookupHandler('shipping');
                } else {
                    lookupHandler = null;
                }
            });
        }
    } else {
        // Gutenberg blocks are not yet loaded
        // Wait and check again
        jQuery(arguments.callee);
    }
});