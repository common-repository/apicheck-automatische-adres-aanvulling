jQuery(window).on('load', function ($) {
    // Add an event listener to the input field for keyup events
    jQuery(`#email`).on('input', debounce(function () {

        // Get the value of the input field
        const emailField = document.getElementById(`email`);
        if (emailField == null) return;

        const email = emailField.value;

        // Check if the email format is valid using a regular expression
        const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailFormat.test(email);

        // If the email format is invalid, add an error message to the top of the input field
        if (isValidEmail) {
            // If the email format is valid, remove any error message from the input field
            doVerifyEmailCall(email).then((response) => {
                if (response.status == 1) {
                    if (response.result.data.status == 'invalid') {
                        const errorMessage = '<p class="apichecknlMessage">Weet je zeker dat dit e-mail adres juist is?</p>';
                        emailField.insertAdjacentHTML('afterend', errorMessage);
                    } else if (response.result.data.status == 'valid') {
                        const errorMessages = emailField.parentElement.querySelectorAll('.apichecknlMessage');
                        errorMessages.forEach(errorMessage => errorMessage.remove());
                    }
                }
            });
        }
    }.bind(this), 1000));

    function doVerifyEmailCall(email) {
        params = {
            action: 'apichecknl_email_validation_call',
            email: email
        };

        return new Promise((resolve, reject) => {
            try {
                jQuery.post(apichecknl_ajax_object.ajax_url, params, function (response) {
                    // No results have been found
                    if (response.status == 1) {
                        resolve(response);
                    } else if (response.status == 404) {

                    }
                    // Something else happened
                    reject(response);
                });
            } catch (e) {
                reject(e);
            }
        });
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

});