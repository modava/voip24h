<?php

namespace modava\voip24h;

use yii\web\AssetBundle;

class CallCenterAsset extends AssetBundle
{
    public $sourcePath = '@modava/voip24h/assets';

    public $css = [
        'voip24h/css/main.css',
    ];

    public $js = [
        'voip24h/js/sip.js',
        'voip24h/js/moment.min.js',
        'voip24h/js/VoipSIP.js',
        'voip24h/js/custom.js'
    ];

    public $jsOptions = array(
        'position' => \yii\web\View::POS_END
    );
    public $depends = [
        'yii\web\YiiAsset',
        'yii\bootstrap\BootstrapAsset',
    ];
}