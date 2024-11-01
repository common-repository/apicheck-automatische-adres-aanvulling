<?php

/**
 * ApiCheck Address Validator
 *
 * @package       APICHECK
 * @author        ApiCheck.nl
 * @license       gplv2
 * @version       1.5.3
 *
 * @wordpress-plugin
 * Plugin Name:   Adres & E-mail Validatie voor WooCommerce en Blocks
 * Plugin URI:    https://apicheck.nl/postcode-api-plugin-installeren/
 * Description:   Met onze geavanceerde adres API worden adresgegevens moeiteloos ingevuld, terwijl ook het e-mailadres van gebruikers nauwkeurig wordt geverifieerd. Dit resulteert in een zorgeloze en foutloze ervaring die elke gebruiker verdient.
 * Version:       1.5.3
 * Author:        ApiCheck
 * Author URI:    https://apicheck.nl/
 * Text Domain:   apicheck-woocommerce-postcode-checker
 * Domain Path:   /languages/
 * License:       GPLv3
 * License URI:   https://www.gnu.org/licenses/gpl-3.0.html
 *
 * WC requires at least: 3.7.0
 * WC tested up to: 6.8.0
 *
 * You should have received a copy of the GNU General Public License
 * along with ApiCheck Address Validator. If not, see <https://www.gnu.org/licenses/gpl-3.0.html/>.
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) exit;

// Plugin name
define('APICHECKNL_NAME', 'ApiCheck | Adres & E-mail Validatie');

// Plugin version
define('APICHECKNL_VERSION', '1.5.3');

// Plugin Root File
define('APICHECKNL_PLUGIN_FILE', __FILE__);

// Plugin base
define('APICHECKNL_PLUGIN_BASE', plugin_basename(APICHECKNL_PLUGIN_FILE));

// Plugin Folder Path
define('APICHECKNL_PLUGIN_DIR', plugin_dir_path(APICHECKNL_PLUGIN_FILE));

// Plugin Folder URL
define('APICHECKNL_PLUGIN_URL', plugin_dir_url(APICHECKNL_PLUGIN_FILE));

// After init plugin
add_action('plugins_loaded', 'apicheck_load_textdomain');

if (!function_exists('write_log')) {

    function write_log($log)
    {
        error_log('------------------------------------------------');
        if (true === WP_DEBUG) {
            if (is_array($log) || is_object($log)) {
                error_log(print_r($log, true));
            } else {
                error_log($log);
            }
        }
    }
}

const APICHECKNL_SUPPORTED_COUNTRIES = ['NL', 'BE', 'LU', 'FR'];
const APICHECKNL_SUPPORTED_COUNTRIES_GUTENBERG = ['NL', 'LU'];

function apicheck_load_textdomain()
{
    $domain = 'apicheck-woocommerce-postcode-checker';
    load_plugin_textdomain($domain, false, dirname(plugin_basename(__FILE__)) . '/languages/');
}

class APICheck
{
    private static $_lookup_action = 'apichecknl_lookup_call';
    private static $_search_action = 'apichecknl_search_call';

    private static $_shipping = [
        'prefix' => 'shipping',
        'company' => '#shipping_company',
        'country' => '#shipping_country',
        'city' => '#shipping_city',
        'state' => '#shipping_state',
        'postcode' => '#shipping_postcode',
        'address_1' => '#shipping_address_1',
        'address_2' => '#shipping_address_2',
        // Custom fields
        'street' => '#shipping_street',
        'housenumber' => '#shipping_housenumber',
        'housenumber_addition' => '#shipping_housenumber_addition',
        'municipality_autocomplete' => '#shipping_municipality_autocomplete',
        'street_autocomplete' => '#shipping_street_autocomplete',
    ];

    private static $_billing = [
        'prefix' => 'billing',
        'company' => '#billing_company',
        'country' => '#billing_country',
        'city' => '#billing_city',
        'state' => '#billing_state',
        'postcode' => '#billing_postcode',
        'address_1' => '#billing_address_1',
        'address_2' => '#billing_address_2',
        // Custom fields
        'street' => '#billing_street',
        'housenumber' => '#billing_housenumber',
        'housenumber_addition' => '#billing_housenumber_addition',
        'municipality_autocomplete' => '#billing_municipality_autocomplete',
        'street_autocomplete' => '#billing_street_autocomplete',
    ];

    function __construct()
    {
        add_action('init', [$this, 'apichecknl_start_from_here']);
        add_action('admin_init', [$this, 'apichecknl_if_woocommerce_not_active']);

        if (get_option('apichecknl_validate_number') == 1 || get_option('apichecknl_enable_disabled') == 1) {
            add_action('wp_print_scripts', [$this, 'apichecknl_enqueue_script_front_address_validation']);
            add_filter('woocommerce_localisation_address_formats', [$this, 'custom_address_format'], 10, 1);
            add_filter('woocommerce_checkout_fields', [$this, 'custom_override_checkout_fields'], 1);
            add_filter('woocommerce_default_address_fields', [$this, 'custom_override_account_fields']);
            add_action('woocommerce_checkout_posted_data', [$this, 'checkout_posted_data']);
            add_action('woocommerce_checkout_update_order_review', [$this, 'checkout_update_order_review']);
            add_action('woocommerce_after_checkout_validation', [$this, 'custom_checkout_validation']);
            add_filter('woocommerce_form_field', [$this, 'add_css_class_to_autocomplete_fields'], 10, 4);
        }

        if (get_option('apichecknl_validate_email') == 1) {
            add_action('wp_print_scripts', [$this, 'apichecknl_apichecknl_enqueue_script_front_email_validation']);
        }
    }

    function add_css_class_to_autocomplete_fields($field, $key, $args, $value)
    {
        if (in_array($key, ['billing_municipality_autocomplete', 'billing_street_autocomplete', 'shipping_municipality_autocomplete', 'shipping_street_autocomplete'])) {
            $field = str_replace(array('<span class="woocommerce-input-wrapper">'), array('<span class="woocommerce-input-wrapper auto-search-wrapper">'), $field);
        }
        return $field;
    }

    // Check If WooCommerce exists
    function apichecknl_if_woocommerce_not_active($message)
    {
        if (!is_plugin_active('woocommerce/woocommerce.php')) {
            echo "<div class='notice notice-error is-dismissible'><h4>ApiCheck: WooCommerce is niet actief. Installeer WooCommerce om deze plugin te kunnen gebruiken.</h4></div>";
            deactivate_plugins('/api-check/api-check.php');
        }
    }

    // Add plugin files
    function apichecknl_start_from_here()
    {
        require_once plugin_dir_path(__FILE__) . 'front/apichecknl_lookup_call.php';
        require_once plugin_dir_path(__FILE__) . 'front/apichecknl_search_call.php';
        require_once plugin_dir_path(__FILE__) . 'front/apichecknl_email_validation_call.php';
        require_once plugin_dir_path(__FILE__) . 'back/apichecknl_options_page.php';
    }

    function apichecknl_apichecknl_enqueue_script_front_email_validation()
    {
        // Load styles and scripts for the WooCommerce Blocks checkout page
        if (is_plugin_active('woo-gutenberg-products-block/woocommerce-gutenberg-products-block.php') && function_exists('has_block') && has_block('woocommerce/checkout')) {
            // Styles
            wp_enqueue_style('apichecknl-email-validation-style', plugins_url('assets/css/apicheck-email-validation.css', __FILE__), null, APICHECKNL_VERSION);

            // Load scripts
            wp_register_script('apicheck-email-validation-gutenberg-script', plugins_url('assets/js/apicheck-email-validation-gutenberg.js', __FILE__), ['jquery', 'woocommerce', 'wp-i18n'], APICHECKNL_VERSION, true);
            wp_enqueue_script('apicheck-email-validation-gutenberg-script');
            wp_localize_script('apicheck-email-validation-gutenberg-script', 'apichecknl_ajax_object', ['ajax_url' => admin_url('admin-ajax.php')]);

            // Load styles and scripts for the regular WooCommerce checkout page
        } else if ((function_exists('is_checkout') && is_checkout()) || (function_exists('is_account_page') && is_account_page())) {
            // Styles
            wp_enqueue_style('apichecknl-email-validation-style', plugins_url('assets/css/apicheck-email-validation.css', __FILE__), null, APICHECKNL_VERSION);

            // Load scripts
            wp_register_script('apichecknl-email-validation-script', plugins_url('assets/js/apicheck-email-validation.js', __FILE__), ['jquery', 'woocommerce', 'wp-i18n'], APICHECKNL_VERSION, true);
            wp_enqueue_script('apichecknl-email-validation-script');
            wp_localize_script('apichecknl-email-validation-script', 'apichecknl_ajax_object', ['ajax_url' => admin_url('admin-ajax.php')]);
        }
    }

    // Enqueue Style and Scripts
    function apichecknl_enqueue_script_front_address_validation()
    {
        // Check if WooCommerce Blocks is active, and activate scripts
        if (is_plugin_active('woo-gutenberg-products-block/woocommerce-gutenberg-products-block.php') && function_exists('has_block') && has_block('woocommerce/checkout')) {
            //Styles
            wp_enqueue_style('apichecknl-style', plugins_url('assets/css/apicheck-woo-gutenberg.css', __FILE__), null, APICHECKNL_VERSION);
            wp_enqueue_style('apichecknl-min-style', plugins_url('assets/css/autocomplete.min.css', __FILE__), null, APICHECKNL_VERSION);

            // Scripts
            wp_register_script('apichecknl-woo-gutenberg-script', plugins_url('assets/js/apicheck-woo-gutenberg.js', __FILE__), ['jquery', 'woocommerce', 'wp-i18n'], APICHECKNL_VERSION, true);
            wp_enqueue_script('apichecknl-woo-gutenberg-script');

            wp_localize_script('apichecknl-woo-gutenberg-script', 'apichecknl_params', [
                'url' => admin_url('admin-ajax.php'),
                'action' => self::$_lookup_action,
                'supported_countries' => APICHECKNL_SUPPORTED_COUNTRIES_GUTENBERG,
                'validate_number_addition' => get_option('apichecknl_validate_number_addition'),
                'shipping_countries' => WC()->countries->get_shipping_countries(),
            ]);

            wp_localize_script('apichecknl-woo-gutenberg-script', 'apichecknl_params', [
                'url' => admin_url('admin-ajax.php'),
                'action' => self::$_search_action,
                'supported_countries' => APICHECKNL_SUPPORTED_COUNTRIES_GUTENBERG,
                'validate_number_addition' => get_option('apichecknl_validate_number_addition'),
                'shipping_countries' => WC()->countries->get_shipping_countries(),
            ]);

            // Autocomplete script
            wp_enqueue_script('apichecknl-autocomplete-script', plugins_url('assets/js/autocomplete.min.js', __FILE__), APICHECKNL_VERSION, true);

            wp_set_script_translations('apichecknl-woo-gutenberg-script', 'apicheck-woocommerce-postcode-checker', plugin_dir_path(__FILE__) . 'languages/');

            wp_localize_script(
                'apichecknl-woo-gutenberg-script',
                'apichecknl_ajax_object',
                ['ajax_url' => admin_url('admin-ajax.php')]
            );
            // Load styles and scripts for the regular WooCommerce checkout page
        } else  if ((function_exists('is_checkout') && is_checkout()) || (function_exists('is_account_page') && is_account_page())) {
            // Styles
            wp_enqueue_style('apichecknl-style', plugins_url('assets/css/apicheck.css', __FILE__), null, APICHECKNL_VERSION);
            wp_enqueue_style('apichecknl-min-style', plugins_url('assets/css/autocomplete.min.css', __FILE__), null, APICHECKNL_VERSION);
            wp_enqueue_style('apichecknl-autocomplete-style', plugins_url('assets/css/autocomplete.css', __FILE__), null, APICHECKNL_VERSION);

            // Scripts for WooCommerce
            wp_register_script('apichecknl-script', plugins_url('assets/js/apicheck.js', __FILE__), ['jquery', 'woocommerce', 'wp-i18n'], APICHECKNL_VERSION, true);
            wp_enqueue_script('apichecknl-script');

            // Localize the script unconditionally
            wp_localize_script('apichecknl-script', 'apichecknl_billing_fields', self::$_billing);
            wp_localize_script('apichecknl-script', 'apichecknl_shipping_fields', self::$_shipping);

            wp_localize_script('apichecknl-script', 'apichecknl_params', [
                'url' => admin_url('admin-ajax.php'),
                'action' => self::$_lookup_action,
                'supported_countries' => APICHECKNL_SUPPORTED_COUNTRIES,
                'validate_number_addition' => get_option('apichecknl_validate_number_addition'),
                'shipping_countries' => WC()->countries->get_shipping_countries(),
                'search_action' => self::$_search_action,
            ]);

            // Autocomplete script
            wp_enqueue_script('apichecknl-autocomplete-script', plugins_url('assets/js/autocomplete.min.js', __FILE__), APICHECKNL_VERSION, true);
            wp_set_script_translations('apichecknl-script', 'apicheck-woocommerce-postcode-checker', plugin_dir_path(__FILE__) . 'languages/');

            wp_localize_script(
                'apichecknl-script',
                'apichecknl_ajax_object',
                ['ajax_url' => admin_url('admin-ajax.php')]
            );
        }
    }

    // Re-arrange checkout form fields
    function custom_override_checkout_fields($fields)
    {
        // Billing fields
        $fields['billing']['billing_municipality_autocomplete'] = [
            'id' => 'billing_municipality_autocomplete',
            'type' => 'text',
            'class' => ['form-row form-row-wide validate-required'],
            'label' => __('Plaats of postcode', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => __('Start met typen...', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
        ];

        $fields['billing']['billing_municipality_city'] = [
            'id' => 'billing_municipality_city',
            'type' => 'text',
            'class' => ['form-row-wide hidden-checkout-field'],
            'label' => '',
            'placeholder' => '',
            'required' => false,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['billing']['billing_municipality_postalcode'] = [
            'id' => 'billing_municipality_postalcode',
            'type' => 'text',
            'class' => ['form-row-wide hidden-checkout-field'],
            'label' => '',
            'placeholder' => '',
            'required' => false,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['billing']['billing_street_autocomplete'] = [
            'id' => 'billing_street_autocomplete',
            'type' => 'text',
            'class' => ['form-row form-row-wide validate-required'],
            'label' => __('Straat', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => __('Start met typen...', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
        ];

        $fields['billing']['billing_housenumber'] = [
            'id' => 'billing_housenumber',
            'type' => 'text',
            'class' => ['form-row form-row-first validate-require'],
            'label' => __('Huisnummer', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => '',
            'required' => true,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['billing']['billing_housenumber_addition'] = [
            'id' => 'billing_housenumber_addition',
            'type' => 'text',
            'class' => ['form-row form-row-last'],
            'label' => __('Toevoeging', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => '',
            'required' => false,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['billing']['billing_street'] = [
            'id' => 'billing_street',
            'type' => 'text',
            'class' => ['form-row form-row-wide validate-required'],
            'label' => __('Straat', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => '',
            'required' => true,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        // Shipping fields
        $fields['shipping']['shipping_municipality_autocomplete'] = [
            'id' => 'shipping_municipality_autocomplete',
            'type' => 'text',
            'class' => ['form-row form-row-wide validate-required'],
            'label' => __('Plaats of postcode', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => __('Start met typen...', 'apicheck-woocommerce-postcode-checker'),
            're
            quired' => false,
        ];
        $fields['shipping']['shipping_municipality_city'] = [
            'id' => 'shipping_municipality_city',
            'type' => 'text',
            'class' => ['form-row-wide hidden-checkout-field'],
            'label' => '',
            'placeholder' => '',
            'required' => false,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['shipping']['shipping_municipality_postalcode'] = [
            'id' => 'shipping_municipality_postalcode',
            'type' => 'text',
            'class' => ['form-row-wide hidden-checkout-field'],
            'label' => '',
            'placeholder' => '',
            'required' => false,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['shipping']['shipping_street_autocomplete'] = [
            'id' => 'shipping_street_autocomplete',
            'type' => 'text',
            'class' => ['form-row form-row-wide validate-required'],
            'label' => __('Straat', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => __('Start met typen...', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
        ];

        $fields['shipping']['shipping_housenumber'] = [
            'id' => 'shipping_housenumber',
            'type' => 'text',
            'class' => ['form-row form-row-first validate-require'],
            'label' => __('Huisnummer', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => '',
            'required' => true,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['shipping']['shipping_housenumber_addition'] = [
            'id' => 'shipping_housenumber_addition',
            'type' => 'text',
            'class' => ['form-row form-row-last'],
            'label' => __('Toevoeging', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => '',
            'required' => false,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['shipping']['shipping_street'] = [
            'id' => 'shipping_street',
            'type' => 'text',
            'class' => ['form-row-wide'],
            'label' => __('Straat', 'apicheck-woocommerce-postcode-checker'),
            'placeholder' => '',
            'required' => true,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $billing_order = [
            "billing_first_name",
            "billing_last_name",
            "billing_company",
            "billing_country",
            "billing_municipality_autocomplete",
            "billing_municipality_city",
            "billing_municipality_postalcode",
            "billing_street_autocomplete",
            "billing_postcode",
            "billing_housenumber",
            "billing_housenumber_addition",
            "billing_street",
            "billing_city",
            "billing_phone",
            "billing_email",
            // These fields are hidden by JS
            "billing_address_1",
            "billing_address_2",
        ];

        $shipping_order = [
            "shipping_first_name",
            "shipping_last_name",
            "shipping_company",
            "shipping_country",
            "shipping_municipality_autocomplete",
            "shipping_municipality_city",
            "shipping_municipality_postalcode",
            "shipping_street_autocomplete",
            "shipping_postcode",
            "shipping_housenumber",
            "shipping_housenumber_addition",
            "shipping_street",
            "shipping_city",
            // These fields are hidden by JS
            "shipping_address_1",
            "shipping_address_2",
        ];

        foreach ($billing_order as $field) {
            $ordered_billing_fields[$field] = $fields["billing"][$field];
        }

        foreach ($shipping_order as $field) {
            $ordered_shipping_fields[$field] = $fields["shipping"][$field];
        }

        // Set new fields
        $fields["billing"] = $ordered_billing_fields;
        $fields["shipping"] = $ordered_shipping_fields;

        return $fields;
    }

    // Re-arrange My Account form fields
    function custom_override_account_fields($fields)
    {
        // Billing fields
        $fields['municipality_autocomplete'] = [
            'label' => __('Plaats of postcode', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
            'class' => ['form-row', 'form-row-wide', 'validate-required'],
            'type' => 'text',
            'priority' => 100,
            'placeholder' => __('Start met typen...', 'apicheck-woocommerce-postcode-checker'),
        ];

        $fields['municipality_city'] = [
            'label' => '',
            'required' => false,
            'class' => ['form-row-wide', 'hidden-checkout-field'],
            'type' => 'text',
            'priority' => 110,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['municipality_postalcode'] = [
            'label' => '',
            'required' => false,
            'class' => ['form-row-wide', 'hidden-checkout-field'],
            'type' => 'text',
            'priority' => 120,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['street_autocomplete'] = [
            'label' => __('Straat', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
            'class' => ['form-row', 'form-row-wide', 'validate-required'],
            'type' => 'text',
            'priority' => 130,
            'placeholder' => __('Start met typen...', 'apicheck-woocommerce-postcode-checker'),
        ];

        $fields['housenumber'] = [
            'label' => __('Huisnummer', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
            'class' => ['form-row', 'form-row-first', 'validate-require'],
            'type' => 'text',
            'priority' => 140,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['housenumber_addition'] = [
            'label' => __('Toevoeging', 'apicheck-woocommerce-postcode-checker'),
            'required' => false,
            'class' => ['form-row', 'form-row-last'],
            'type' => 'text',
            'priority' => 150,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $fields['street'] = [
            'label' => __('Straat', 'apicheck-woocommerce-postcode-checker'),
            'required' => true,
            'class' => ['form-row', 'form-row-wide', 'validate-required'],
            'type' => 'text',
            'priority' => 160,
            'custom_attributes' => [
                'autocomplete' => 'off',
            ],
        ];

        $billing_order = [
            "first_name",
            "last_name",
            "company",
            "country",
            "municipality_autocomplete",
            "municipality_city",
            "municipality_postalcode",
            "street_autocomplete",
            "postcode",
            "housenumber",
            "housenumber_addition",
            "street",
            "city",
            // These fields are hidden by JS
            "address_1",
            "address_2",
        ];

        foreach ($billing_order as $field) {
            $ordered_billing_fields[$field] = $fields[$field];
        }

        // Set new fields
        $fields = $ordered_billing_fields;

        return $fields;
    }

    function custom_address_format($formats)
    {
        // Define your desired address format.
        $new_format = "{name}\n{company}\n{address_1} {address_2}\n{city} {postcode}\n{country}";

        // Apply the new format to every country.
        foreach ($formats as $key => $value) {
            $formats[$key] = $new_format;
        }

        return $formats;
    }

    // This function makes sure the new fields are filled
    public function checkout_update_order_review($posted)
    {
        $data = [];
        $vars = explode('&', $posted);
        foreach ($vars as $k => $value) {
            $v = explode('=', urldecode($value));
            $data[$v[0]] = $v[1];
        }

        foreach (['billing', 'shipping'] as $type) {
            foreach ([$type . '_municipality_autocomplete', $type . '_municipality_city', $type . '_municipality_postalcode', $type . '_street_autocomplete', $type . '_housenumber', $type . '_housenumber_addition', $type . '_street'] as $key) {
                if (isset($data[$key]) && $data[$key]) {
                    WC()->session->set("customer_" . $key, $data[$key]);
                }
            }
        }
    }

    // This function manipulates the incoming (new) fields
    public function checkout_posted_data($posted)
    {
        if (!get_option('apichecknl_validate_number')) {
            return $posted;
        }

        foreach (['billing', 'shipping'] as $group) {
            $country = $posted[$group . '_country'];

            $streetName = $group . '_street';
            $streetNumber = $group . '_housenumber';
            $streetNumberSuffix = $group . '_housenumber_addition';

            if ($country === 'BE' || $country === 'FR') {
                // Belgium and France magic
                $posted[$group . '_city'] = $posted[$group . '_municipality_city'];
                $posted[$group . '_postcode'] = $posted[$group . '_municipality_postalcode'];
                $posted[$group . '_street'] = $posted[$group . '_street_autocomplete'];
            }

            // Save 'street', 'number', and 'suffix' as separate fields
            $posted[$group . '_street'] = $posted[$streetName];
            $posted[$group . '_street_number'] = $posted[$streetNumber];
            $posted[$group . '_street_number_suffix'] = $posted[$streetNumberSuffix];

            // Concatenate street and number into address_1 for display purposes
            $posted[$group . '_address_1'] = $posted[$streetName] . ' ' . trim($posted[$streetNumber]);
            // Set suffix as address_2
            $posted[$group . '_address_2'] = trim($posted[$streetNumberSuffix] ?? '');

            // Remove the concatenated streetName, streetNumber, and streetNumberSuffix fields
            unset($posted[$streetName], $posted[$streetNumber], $posted[$streetNumberSuffix]);
        }
        return $posted;
    }


    public function custom_checkout_validation($args)
    {
        write_log('args for validation below @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
        write_log($args);
    }
}

// CHECK WETHER CLASS EXISTS OR NOT.
if (class_exists('APICheck')) {
    $obj = new APICheck();
}
