<?php

add_action('wp_ajax_apichecknl_lookup_call', 'apichecknl_lookup_call');
add_action('wp_ajax_nopriv_apichecknl_lookup_call', 'apichecknl_lookup_call');

const ALLOWED_AJAX_STRINGS_LOOKUP = [
    'postalcode',
    'street',
    'numberAddition',
    'municipality',
    'boxNumber'
];
const ALLOWED_AJAX_INTS_LOOKUP = [
    'postalcode_id',
    'street_id',
    'number',
];

function apichecknl_lookup_call()
{
    try {
        $api_key = get_option('apichecknl_api_key');

        if (!isset($_POST['country'])) {
            wp_die();
        }

        $country = strtoupper(sanitize_text_field($_POST['country']));
        if (!in_array($country, APICHECKNL_SUPPORTED_COUNTRIES)) {
            wp_die();
        }

        $params = [];

        if (isset($_POST['numberAddition'])) {
            if ($_POST['numberAddition'] == '') {
                unset($_POST['numberAddition']);
            }
        }

        // Unset numberAddition when setting is disabled
        if (get_option('apichecknl_validate_number_addition') == false) {
            unset($_POST['numberAddition']);
        }

        // Create request params
        foreach ($_POST as $key => $value) {
            if (in_array($key, ALLOWED_AJAX_STRINGS_LOOKUP)) {
                $params[$key] = sanitize_text_field($value);
            } elseif (in_array($key, ALLOWED_AJAX_INTS_LOOKUP)) {
                $params[$key] = intval($value);
            }
        }

        $query = http_build_query($params);

        // Create and execute call
        $url = 'https://api.apicheck.nl/lookup/v1/postalcode/' . strtolower($country) . '?' . $query;
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
