<?php

namespace modava\voip24h;

use yii\helpers\Html;

class CallCenter extends \yii\base\Widget
{
    public $Pass;
    public $Display;
    public $User;
    public $Realm;
    public $WSServer;

    public $itemContent = '<span class="badge badge-pill badge-danger"><i class="fa fa-phone fa-2x"></i></span>';
    public $itemUrl = 'javascript:void(0);';
    public $itemOptions = [];

    public $layout = "{item}\n{callcenter}";

    private $insFile;

    public function run()
    {
        $view = $this->getView();
        $this->insFile = CallCenterAsset::register($view);
        return preg_replace_callback('/{\\w+}/', function ($matches) {
            $content = $this->renderSection($matches[0]);

            return $content === false ? $matches[0] : $content;
        }, $this->layout);
    }

    public function renderSection($name)
    {
        switch ($name) {
            case '{item}':
                return $this->renderItem();
            case '{callcenter}':
                return $this->renderCallCenter();
            default:
                return false;
        }
    }

    public function renderItem()
    {
        $this->itemOptions['id'] = 'a-call-center';
        return Html::a($this->itemContent, $this->itemUrl, $this->itemOptions);
    }

    public function renderCallCenter()
    {
        return $this->render('callCenterWidget', [
            'pathAsset' => $this->insFile->baseUrl . '/voip24h',
            'user' => json_encode([
                'Pass' => $this->Pass,
                'Display' => $this->Display,
                'User' => $this->User,
                'Realm' => $this->Realm,
                'WSServer' => $this->WSServer,
            ])
        ]);
    }
}