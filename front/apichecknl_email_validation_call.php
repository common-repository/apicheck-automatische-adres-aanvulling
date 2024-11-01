<?php

add_action('wp_ajax_apichecknl_email_validation_call', 'apichecknl_email_validation_call');
add_action('wp_ajax_nopriv_apichecknl_email_validation_call', 'apichecknl_email_validation_call');

const ALLOWED_AJAX_STRINGS_VERIFY = [
    'email',
];

function apichecknl_email_validation_call()
{
    try {
        $api_key = get_option('apichecknl_api_key');

        // Unset numberAddition when setting is disabled
        if (get_option('apichecknl_validate_email') == false) {
            wp_die();
        }

        if (!isset($_POST['email'])) {
            wp_die();
        }

        $params = [];

        // Create request params
        foreach ($_POST as $key => $value) {
            if (in_array($key, ALLOWED_AJAX_STRINGS_VERIFY)) {
                $params[$key] = sanitize_text_field($value);
            }
        }

        $query = http_build_query($params);

        // Create and execute call
        $url = 'https://api.apicheck.nl/verify/v1/email/' . '?' . $query;
        $args = [
            'headers' => [
                'origin' => site_url(),
                'x-api-key' => $api_key
            ],
            'timeout' => 600
        ];
        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            $res = ["result" => null, "status" => 0];
            wp_send_json($res);
            wp_die();
        }

        if (!is_array($response) || !isset($response['body']) || !isset($response['response']['code'])) {
            $res = ["result" => null, "status" => 0];
            wp_send_json($res);
            wp_die();
        }

        $code = intval($response['response']['code']);

        $result = json_decode($response['body']);
        if ($code !== 200 || json_last_error() !== JSON_ERROR_NONE) {
            $res = ["result" => null, "status" => $code];
            wp_send_json($res);
        }

        $res = ["result" => $result, "status" => 1];
        wp_send_json($res);
    } catch (Exception $exception) {
        write_log($exception . '');
    }
}
