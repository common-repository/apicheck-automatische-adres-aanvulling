jQuery(document).ready(function ($) {
    function validateEmailInput(inputFieldId) {
        // Set a timeout variable
        let typingTimer;

        // Set the delay time in milliseconds
        const doneTypingDelay = 1000;

        // Get the input field element
        const emailField = document.getElementById(inputFieldId);

        // Add an event listener to the input field for keyup events
        if (emailField) {
            emailField.addEventListener('keyup', () => {

                // Clear the previous timeout if there is one
                clearTimeout(typingTimer);

                // Start a new timeout to run the function after a delay
                typingTimer = setTimeout(() => {
                    // Get the value of the input field
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
                                    emailField.insertAdjacentHTML('beforebegin', errorMessage);
                                } else if (response.result.data.status == 'valid') {
                                    const errorMessages = emailField.parentElement.querySelectorAll('.apichecknlMessage');
                                    errorMessages.forEach(errorMessage => errorMessage.remove());
                                }
                            }
                        });
                    }
                }, doneTypingDelay);
            });
        }
    }

    // Call the function with the input field IDs as arguments
    validateEmailInput('billing_email');
    validateEmailInput('shipping_email');

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
});