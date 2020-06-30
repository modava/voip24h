<?php

/* @var $pathAsset string */
/* @var $user string */

?>
    <div id="sipClient">
        <div id="sip-dialpad">
            <div id="sip-dialpad-header">
                <i class="fa fa-angle-double-down"></i>
            </div>
            <div id="sip-dialpad-content">
                <div class="row sipStatus">
                    <div class="col-md-6 col-12 p-0" id="txtRegStatus"></div>
                    <div class="col-md-6 col-12 p-0" id="txtCallStatus"></div>
                </div>
                <div id="ipnkeyboardMain">
                    <div id="ipnkeyboard">
                        <input type="text" name="number" id="numDisplay" class="form-control text-center input-sm"
                               value="" autocomplete="off"/>
                        <button class="btn" id="AcbtnCallClean" title="Send"><i class="fa fa-remove"></i></button>
                    </div>
                </div>
                <div class="mt-2">
                    <div class="row m-0">
                        <button type="button" class="btn btn-default digit linecenter" data-digit="1">
                            1<span>&nbsp;</span></button>
                        <button type="button" class="btn btn-default digit" data-digit="2">2<span>ABC</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="3">3<span>DEF</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="4">4<span>GHI</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="5">5<span>JKL</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="6">6<span>MNO</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="7">7<span>PQRS</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="8">8<span>TUV</span>
                        </button>
                        <button type="button" class="btn btn-default digit" data-digit="9">9<span>WXYZ</span>
                        </button>
                        <button type="button" class="btn btn-default digit linecenter" data-digit="*">
                            *<span>&nbsp;</span></button>
                        <button type="button" class="btn btn-default digit" data-digit="0">0<span>+</span></button>
                        <button type="button" class="btn btn-default digit linecenter" data-digit="#">
                            #<span>&nbsp;</span>
                        </button>
                    </div>
                    <div>
                        <div>
                            <button class="btn btn-success btn-block btnCall" title="Send">
                                <i class="fa fa-phone"></i> Dial
                            </button>
                        </div>
                        <div class="mt-2" id="MainCallSipBoard">
                        </div>
                    </div>
                </div>
            </div>
            <div id="well-sip">
                <div class="well-sip h-100">
                    <div id="sip-splash" class="text-muted text-center">
                        <div class="panel-body">
                            <h4 class="page-header"><span> Lịch sử cuộc gọi</span></h4>
                            <p class="lead">To make a call enter a number or SIP address in the box above.</p>
                            <small>Closing this window will cause calls to go to voicemail.</small>
                        </div>
                    </div>
                    <div id="sip-log" class="h-100 d-none">
                        <div class="panel-heading">
                            <h4 class="text-muted panel-title">Recent Calls <span class="pull-right"><i
                                            class="fa fa-trash text-muted sipLogClear" title="Clear Log"></i></span>
                            </h4>
                        </div>
                        <div id="sip-logitems" class="list-group">
                            <p class="text-muted text-center">No recent calls from this browser.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade" id="mdlError" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static"
             data-keyboard="false">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">Sip Error</h4>
                    </div>
                    <div class="modal-body text-center text-danger">
                        <h3><i class="fa fa-3x fa-ban"></i></h3>
                        <p class="lead">Sip registration failed. No calls can be handled.</p>
                    </div>
                </div>
            </div>
        </div>
        <audio id="ringtone" src="<?= $pathAsset . '/sounds/incoming.mp3'; ?>" loop></audio>
        <audio id="ringbacktone" src="<?= $pathAsset . '/sounds/outgoing.mp3'; ?>" loop></audio>
        <audio id="dtmfTone" src="<?= $pathAsset . '/sounds/dtmf.mp3'; ?>"></audio>
        <audio id="audioRemote"></audio>
    </div>
<?php
$script = <<< JS
try{
var user = $user;
} catch (e) {
}
JS;
$this->registerJs($script, \yii\web\View::POS_HEAD);