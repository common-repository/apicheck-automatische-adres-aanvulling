<?php

add_action('wp_ajax_apichecknl_search_call', 'apichecknl_search_call');
add_action('wp_ajax_nopriv_apichecknl_search_call', 'apichecknl_search_call');

const ALLOWED_AJAX_STRINGS_SEARCH = [
    'name',
    'postalcode_id',
    'street_id',
    'number',
    'numberAddition',
    'searchType',
    'country',
    'action'
];

const ALLOWED_AJAX_INTS_SEARCH = [
    'number',
    'name',
    'limit'
];

const ALLOWED_SEARCH_TYPES_SEARCH = [
    'city',
    'postalcode',
    'street',
    'address',
];

function apichecknl_search_call()
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
        // Set country to lower to use in API
        $country = strtolower($country);

        $search_type = sanitize_text_field($_POST['searchType']);
        if (!in_array($search_type, ALLOWED_SEARCH_TYPES_SEARCH)) {
            wp_die();
        }

        // Unset numberAddition when setting is disabled
        if (get_option('apichecknl_validate_number_addition') == false) {
            unset($_POST['numberAddition']);
        }

        $params = [];

        foreach ($_POST as $key => $value) {
            if (!in_array($key, ALLOWED_AJAX_STRINGS_SEARCH) && !in_array($key, ALLOWED_AJAX_INTS_SEARCH)) {
                write_log("$key is not in ALLOWED_AJAX_STRINGS or ALLOWED_AJAX_INTS");
                continue;
            }
            if (in_array(strtolower($key), array_map('strtolower', ALLOWED_AJAX_STRINGS_SEARCH))) {
                $params[$key] = sanitize_text_field($value);
            } elseif (in_array($key, ALLOWED_AJAX_INTS_SEARCH)) {
                $params[$key] = intval($value);
            }
        }
        
        $query = http_build_query($params);

        $url = "https://api.apicheck.nl/search/v1/{$search_type}/{$country}?{$query}";
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

        if (!is_array($response) || !isset($response['body'])) {
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
