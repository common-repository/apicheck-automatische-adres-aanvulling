<?php

// Create custom plugin settings menu
add_action('admin_menu', 'apichecknl_plugin_create_menu');

function apichecknl_plugin_create_menu()
{
    // Add submenu page under WooCommerce
    add_submenu_page(
        'woocommerce',
        'ApiCheck WooCommerce Instellingen',
        'ApiCheck',
        'manage_options',
        __FILE__,
        'apichecknl_plugin_settings_page'
    );

    // Call register settings function
    add_action('admin_init', 'register_apichecknl_plugin_settings');
}

function register_apichecknl_plugin_settings()
{
    // Register our settings
    register_setting('apichecknl-plugin-settings-group', 'apichecknl_api_key');
    register_setting('apichecknl-plugin-settings-group', 'apichecknl_validate_number');
    register_setting('apichecknl-plugin-settings-group', 'apichecknl_validate_number_addition');
    register_setting('apichecknl-plugin-settings-group', 'apichecknl_validate_email');
}

function apichecknl_plugin_settings_page()
{
?>
    <div class="wrap" style="background: #fff; padding: 10px 20px;">

        <img height="60px" src="<?php echo (APICHECKNL_PLUGIN_URL) ?>/assets/img/logo.png" alt="ApiCheck Logo">

        <h1><?php _e('ApiCheck WooCommerce en Gutenberg Blocks', 'apicheck-woocommerce-postcode-checker'); ?></h1>
        <hr>

        <p>
            <?php _e('Met onze adres Validatie API weet je 100% zeker dat je klanten het juiste adres en e-mail adres invullen.', 'apicheck-woocommerce-postcode-checker'); ?>
            <br>
            <?php _e('Op basis van het geselecteerde land maken wij het de klant zo makkelijk mogelijk gemaakt om een adres in te voeren.', 'apicheck-woocommerce-postcode-checker'); ?>
            <br>
            <?php _e('Voor Nederland is een postcode, huisnummer en eventueel toevoeging al voldoende voor een volledig, en compleet adres.', 'apicheck-woocommerce-postcode-checker'); ?>
        </p>

        <?php if (isset($_GET['settings-updated'])) {
            echo "<div class='updated'><p>";
            _e('De instellingen zijn opgeslagen.', 'apicheck-woocommerce-postcode-checker');
            echo "</p></div>";
        } ?>

        <form method="post" action="options.php">
            <?php settings_fields('apichecknl-plugin-settings-group'); ?>
            <?php do_settings_sections('apichecknl-plugin-settings-group'); ?>

            <hr>

            <table class="form-table">
                <h2 class="title">Algemeen</h2>

                <?php _e('Via het <a target="_blank" href="https://app.apicheck.nl/dashboard/">Dashboard</a> is het mogelijk om een API-key aan te maken. Deze key is in het onderstaand formulier nodig.', 'apicheck-woocommerce-postcode-checker'); ?>
                <br>
                <?php _e('Meer hulp nodig? Neem <a target="_blank" href="https://apicheck.nl/faqs/">contact</a> op, of bekijk de WordPress plugin <a target="_blank" href="https://apicheck.nl/postcode-api-plugin-installeren/">documentatie</a>. ', 'apicheck-woocommerce-postcode-checker'); ?>

                <tr valign="top">
                    <th scope="row"><?php _e('API-key', 'apicheck-woocommerce-postcode-checker'); ?></th>
                    <td>
                        <input class="regular-text" type="text" name="apichecknl_api_key" value="<?php echo esc_attr(get_option('apichecknl_api_key')); ?>" placeholder="<?php _e('Vul je ApiCheck api-key in', 'apicheck-woocommerce-postcode-checker'); ?>" />
                    </td>
                </tr>
            </table>

            <hr>

            <table class="form-table">
                <h2 class="title">Adres validatie</h2>
                <p>Vul automatisch adressen in zodat je zeker weet dat klanten het juiste adres invoeren. <br>Hiermee voorkom je bestellingen naar verkeerde, of niet bestaande adressen.</p>
                <tr valign="top">
                    <th scope="row"><?php _e('Schakel adres aanvulling en validatie in', 'apicheck-woocommerce-postcode-checker'); ?></th>
                    <td><input type="checkbox" name="apichecknl_validate_number" value="1" <?php checked(1, get_option('apichecknl_validate_number'), true); ?> /></td>
                </tr>
                <tr valign="top">
                    <th scope="row"><?php _e('Valideer ook huisnummer-toevoeging', 'apicheck-woocommerce-postcode-checker'); ?></th>
                    <td><input type="checkbox" name="apichecknl_validate_number_addition" value="1" <?php checked(1, get_option('apichecknl_validate_number_addition'), true); ?> /></td>
                </tr>
            </table>

            <hr>

            <table class="form-table">
                <h2 class="title">E-mail validatie</h2>
                <p>Controleer op fouten in het ingevoerde email adres. <br>Hiermee voorkom je dat belangrijke order-updates niet bij de klant terecht komen.</p>
                <tr valign="top">
                    <th scope="row"><?php _e('Schakel e-mail validatie in', 'apicheck-woocommerce-postcode-checker'); ?></th>
                    <td><input type="checkbox" name="apichecknl_validate_email" value="1" <?php checked(1, get_option('apichecknl_validate_email'), true); ?> /></td>
                </tr>
            </table>

            <?php submit_button(); ?>
        </form>
    </div>
<?php } ?>