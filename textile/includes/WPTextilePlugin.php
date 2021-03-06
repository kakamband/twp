<?php

/*
*   A helper class to interact with Textile API
*/

class WPTextilePlugin {

    private $menu_slug;

    /*
    *   Add action hooks and set initial values
    */
    public function __construct() {
        $this->menu_slug = 'wptextile';
        $this->page_title = 'Textile Plugin';
        $this->menu_title = 'Textile Plugin';

        add_action('init', array($this, 'init_actions'));

        // Admin
        add_action('admin_init', array($this, 'admin_init_actions'));
        add_action('admin_menu', array($this, 'admin_page_hook'));


        
    }


    /*
    *   Enqueues JS and CSS scripts
    */
    public function admin_enqueue_scripts( $hook ) {
        // My custom page
        if( 'plugins_page_wptextile' != $hook ) return;
        
        // JS Scripts
        $version = false;
        $in_footer = true;
        $dependencies = array();
        wp_enqueue_script(
            'wptextileplugin_admin_js',
            plugins_url( '../admin/js/wptextileplugin_admin.js', __FILE__ ),
            $dependencies,
            $version,
            $in_footer
        );
        $title_nonce = wp_create_nonce( 'title_example' );
        $textile_config = get_option('wptextile_options');
        $apikey = !empty($textile_config['wptextile_userdata_apikey']) ?
            $textile_config['wptextile_userdata_apikey'] : '';
        $apisecret = !empty($textile_config['wptextile_userdata_apisecret']) ?
            $textile_config['wptextile_userdata_apisecret'] : '';
        $privateidentity = !empty($textile_config['wptextile_userdata_privateidentity']) ?
            $textile_config['wptextile_userdata_privateidentity'] : '';
        $bucketkey = !empty($textile_config['wptextile_userdata_bucketkey']) ?
            $textile_config['wptextile_userdata_bucketkey'] : '';
        $bucketname = !empty($textile_config['wptextile_userdata_bucketname']) ?
            $textile_config['wptextile_userdata_bucketname'] : '';
            
        wp_localize_script( 'wptextileplugin_admin_js', 'TEXTILE_AJAX_OBJ', array(
           'ajax_url' => admin_url( 'admin-ajax.php' ),
           'nonce'    => $title_nonce,
           'apikey' => $apikey,
           'apisecret' => $apisecret,
           'privateidentity' => $privateidentity,
           'bucketkey' => $bucketkey,
           'bucketname' => $bucketname,
        ));
        
    }

    /*
    *   Enqueues JS and CSS scripts
    */
    public function enqueue_scripts() {
        // JS Scripts
        $version = false;
        $in_footer = true;
        $dependencies = array('jquery');
        wp_enqueue_script(
            'wptextileplugin_js',
            plugins_url( '../public/js/wptextileplugin.js', __FILE__ ),
            $dependencies,
            $version,
            $in_footer
        );
        $title_nonce = wp_create_nonce( 'title_example' );
        $apikey = get_option('wptextile_options');
        wp_localize_script( 'wptextileplugin_js', 'TEXTILE_AJAX_OBJ', array(
           'ajax_url' => admin_url( 'admin-ajax.php' ),
           'nonce'    => $title_nonce,
           'apikey' => $apikey
        ));

        // CSS
        $css_dependencies = array();
        $css_version = false;
        $css_in_footer = false;
        wp_enqueue_style(
            'wptextileplugin_css',
            plugins_url( '../public/css/wptextileplugin.css', __FILE__ ),
            $css_dependencies,
            $css_version
        );
    }

    /*
    *   Admin section
    */
    public function admin_page_hook()
    {
        // add_submenu_page
        // add_management_page()
        $hook = add_plugins_page(
            __( $this->page_title, 'textdomain' ),
            __( $this->menu_title, 'textdomain' ),
            'manage_options',
            $this->menu_slug,
            array($this, 'admin_page_html')
        );

        // add_action( 'load-' . $hook, array($this, 'admin_page_form_submit'));

    }

    public function admin_page_init_settings()
    {
        // Register a new setting for my plugins page.
        $new_option = 'wptextile_options';
        register_setting( $this->menu_slug, $new_option);
     
        // Register a new section in my plugins page.
        $section = 'wptextile_section_userdata';
        add_settings_section(
            $section,
            'User data',
            array($this, 'admin_page_settings_section_userdata_html'),
            $this->menu_slug
        );
     
        // Register a new field in the "wptextile_section_userdata" section, inside my page
        add_settings_field(
            'wptextile_userdata_apikey', // As of WP 4.6 this value is used only internally.
                                    // Use $args' label_for to populate the id inside the callback.
            'API KEY:',
            array($this, 'admin_page_settings_add_field_userdata'),
            $this->menu_slug,
            $section,
            array(
                'label_for'         => 'wptextile_userdata_apikey',
                'class'             => 'wptextile_row',
                'wptextile_attribute' => $new_option,
            )
        );

        // Register a new field 
        add_settings_field(
            'wptextile_userdata_apisecret', 
            'API SECRET:',
            array($this, 'admin_page_settings_add_field_userdata'),
            $this->menu_slug,
            $section,
            array(
                'label_for'         => 'wptextile_userdata_apisecret',
                'class'             => 'wptextile_row',
                'wptextile_attribute' => $new_option,
            )
        );

        // Register a new field
        add_settings_field(
            'wptextile_userdata_bucketname', 
            'BUCKET NAME:',
            array($this, 'admin_page_settings_add_field_userdata'),
            $this->menu_slug,
            $section,
            array(
                'label_for'         => 'wptextile_userdata_bucketname',
                'class'             => 'wptextile_row',
                'wptextile_attribute' => $new_option,
            )
        );

        // Register a new field
        add_settings_field(
            'wptextile_userdata_privateidentity',
            'PRIVATE IDENTITY:',
            array($this, 'admin_page_settings_add_field_userdata'),
            $this->menu_slug,
            $section,
            array(
                'label_for'         => 'wptextile_userdata_privateidentity',
                'class'             => 'wptextile_row',
                'wptextile_attribute' => $new_option,
                'disabled' => true
            )
        );

        // Register a new field
        add_settings_field(
            'wptextile_userdata_bucketkey', 
            'BUCKET KEY:',
            array($this, 'admin_page_settings_add_field_userdata'),
            $this->menu_slug,
            $section,
            array(
                'label_for'         => 'wptextile_userdata_bucketkey',
                'class'             => 'wptextile_row',
                'wptextile_attribute' => $new_option,
                'disabled' => true
            )
        );

        
       
    }

    /*
    *   Admin section
    */
    public function admin_page_settings_section_userdata_html($args) {
        echo '<p id="'. esc_attr( $args['id'] ) . ' ">You need an API KEY to use this demo. Please follow the instructions on the next link to get your key: <a href="https://docs.textile.io/tutorials/hub/development-mode/#create-insecure-keys" target="_blank">https://docs.textile.io/tutorials/hub/development-mode/#create-insecure-keys</a></p>';
        // esc_html_e( json_encode($args), $this->menu_slug );
    }

    /*
    *   Admin section
    */
    public function admin_page_settings_add_field_userdata($args) {
        $id = !empty($args['label_for']) ? esc_attr($args['label_for']) : '';
        $attribute = !empty($args['wptextile_attribute']) ? esc_attr($args['wptextile_attribute']) : '';
        $disabled = !empty($args['disabled']) ? ' readonly="readonly" ' : '';

        $value = get_option( $attribute );
        $id_attr = $attribute.'['.$id.']';

        $apikey = !empty($value[$id]) ? esc_attr($value[$id]) : '';


        echo '<input '. $disabled . ' name="' .
            $id_attr . '" id="' . $id .
            '" type="text" class="regular-text" value="' . $apikey .
            '" />';
    }

    /*
    *   Admin section
    */
    public function admin_page_html() {
        // check user capabilities
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        echo '<div class="wrap">';
        echo '<h1>';
        echo esc_html( get_admin_page_title() );
        echo '</h1>';
        echo '<form action="options.php" method="post">';

        // output security fields for the registered setting "wporg"
        settings_fields( $this->menu_slug );
        // output setting sections and their fields
        // (sections are registered for "wporg", each field is registered to a specific section)
        do_settings_sections( $this->menu_slug );

        // output save settings button
        submit_button( __( 'Save Settings', 'textdomain' ) );

        echo '</form>';
        // Image uploader
        echo $this->admin_page_html_image_uploader();

        // RESULT AREA
        echo '<div id="wptextile_result_area" class="container">';
        echo '</div>';
        echo '</div>';

    }

    private function admin_page_html_image_uploader() {
        $content = '';
        $content .= 'Upload Image: <input type="file" id="textile_image" >:';
        $content .= '<input id="textile_btn_upload" type="button" value="Upload to IPFS">';
        return $content;
    }
   

    /*
    *   Actions executed when plugin is running on Admin page
    */
    public function admin_init_actions($data) {
       
        $this->admin_page_init_settings();

        // Scripts
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
    }
    
    
    /*
    *   Actions executed when plugin is running on main page
    */
    public function init_actions() {
        // Scripts
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
    }


    /*
    *   On plugin activation
    */
    public function activate() {
        // do not generate any output here
        
            
    }


    /*
    *    On plugin deactivation
    */
    public function deactivate() {
        // do not generate any output here
        echo 'BYE';
    }

}