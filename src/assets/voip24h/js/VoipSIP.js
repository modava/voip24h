var VoipSIP = null;
$(function () {
    var reconnect;
    user = window['user'];
    urlGetUserInfo = window['urlGetUserInfo'];
    if (user === null || typeof user !== 'object' || JSON.stringify(Object.keys(user).sort()) !== JSON.stringify(['User', 'Pass', 'Realm', 'Display', 'WSServer'].sort())) {
        console.log('User setting failed', user);
        return;
    }

    function initVoipSIP() {
        return new Promise(resolve => {
            VoipSIP = {
                config: {
                    password: user.Pass,
                    displayName: user.Display,
                    uri: 'sip:' + user.User + '@' + user.Realm,
                    wsServers: user.WSServer,
                    registerExpires: 30,
                    traceSip: true,
                    log: {level: 3,}
                },
                ringtone: document.getElementById('ringtone'),
                ringbacktone: document.getElementById('ringbacktone'),
                dtmfTone: document.getElementById('dtmfTone'),
                Sessions: [],
                callTimers: {},
                callActiveID: null,
                callVolume: 99,
                Stream: null,
                formatPhone: function (phone) {
                    var num;
                    if (phone.indexOf('@')) {
                        num = phone.split('@')[0];
                    } else {
                        num = phone;
                    }
                    num = num.toString().replace(/[^0-9]/g, '');
                    if (num.length === 10) {
                        return '(' + num.substr(0, 3) + ') ' + num.substr(3, 3) + '-' + num.substr(6, 4);
                    } else if (num.length === 11) {
                        return '(' + num.substr(1, 3) + ') ' + num.substr(4, 3) + '-' + num.substr(7, 4);
                    } else {
                        return num;
                    }
                },
                startRingTone: function () {
                    try {
                        VoipSIP.ringtone.play();
                    } catch (e) {
                    }
                },
                stopRingTone: function () {
                    try {
                        VoipSIP.ringtone.pause();
                    } catch (e) {
                    }
                },
                startRingbackTone: function () {
                    try {
                        VoipSIP.ringbacktone.play();
                    } catch (e) {
                    }
                },
                stopRingbackTone: function () {
                    try {
                        VoipSIP.ringbacktone.pause();
                    } catch (e) {
                    }
                },
                getUniqueID: function () {
                    return Math.random().toString(36).substr(2, 9);
                },
                newSession: async function (newSess) {
                    console.log('newSess', newSess);
                    $(".btnCall").attr('disabled', 'disabled');
                    $('#sip-dialpad').addClass('open');
                    newSess.displayName = newSess.remoteIdentity.displayName || newSess.remoteIdentity.uri.user;
                    newSess.ctxid = VoipSIP.getUniqueID();
                    /* get user info */
                    var userInfo = {
                        'ho_ten': newSess.displayName,
                        'phu_trach': null
                    };
                    if (urlGetUserInfo != null) {
                        try {
                            var phone = newSess.displayName.split('@');
                            if (phone.length > 1) {
                                phone = phone[0].split(':')[1];
                            } else {
                                phone = phone[0];
                            }
                            await $.get(urlGetUserInfo, {
                                phone: phone
                            }, (res) => {
                                userInfo = Object.assign(userInfo, res);
                            }, 'json');
                        } catch (e) {
                        }
                    }
                    newSess.userInfo = userInfo;
                    var status;
                    if (!$('#sipClient').hasClass('active')) $('#sipClient').addClass('active');
                    if (newSess.direction === 'incoming') {
                        status = "Incoming: " + newSess.displayName;
                        VoipSIP.startRingTone();
                    } else {
                        status = "Calling: " + newSess.displayName;
                        VoipSIP.startRingbackTone();
                    }
                    $("#numDisplay").val('');
                    $("#numDisplay").val(newSess.displayName);
                    $('#MainCallSipBoard').empty();
                    $('#MainCallSipBoard').append('<button class="btn btn-danger btn-block btnHangUp" id="MainCallSipBoardbtnHangUp" data-sessionid="' + newSess.id + '" title="Hangup">Hangup</button>');
                    VoipSIP.logCall(newSess, 'ringing');
                    VoipSIP.setCallSessionStatus(status);
                    newSess.on('progress', function (e) {
                        confirmOnUnload();
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        if (e.direction === 'outgoing') {
                            VoipSIP.setCallSessionStatus('Calling...');
                        }
                    });
                    newSess.on('connecting', function (e) {
                        console.log('connecting');
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        if (e.direction === 'outgoing') {
                            VoipSIP.setCallSessionStatus('Connecting...');
                        }
                    });
                    newSess.on('accepted', function (e) {
                        console.log('accepted');
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        if (VoipSIP.callActiveID && VoipSIP.callActiveID !== newSess.ctxid) {
                            VoipSIP.phoneHoldButtonPressed(VoipSIP.callActiveID);
                        }
                        VoipSIP.stopRingbackTone();
                        VoipSIP.stopRingTone();
                        VoipSIP.setCallSessionStatus('Answered');
                        VoipSIP.logCall(newSess, 'answered');
                        VoipSIP.callActiveID = newSess.ctxid;
                    });
                    newSess.on('hold', function (e) {
                        console.log('hold');
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        VoipSIP.callActiveID = null;
                        VoipSIP.logCall(newSess, 'holding');
                    });
                    newSess.on('unhold', function (e) {
                        console.log('unhold');
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        VoipSIP.logCall(newSess, 'resumed');
                        VoipSIP.callActiveID = newSess.ctxid;
                    });
                    newSess.on('muted', function (e) {
                        console.log('moted');
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        VoipSIP.Sessions[newSess.ctxid].isMuted = true;
                        VoipSIP.setCallSessionStatus("Muted");
                    });
                    newSess.on('unmuted', function (e) {
                        console.log('unmuted');
                        $("#numDisplay").val('');
                        $("#numDisplay").val(newSess.displayName);
                        VoipSIP.Sessions[newSess.ctxid].isMuted = false;
                        VoipSIP.setCallSessionStatus("Answered");
                    });
                    newSess.on('cancel', function (e) {
                        unconfirmOnUnload();
                        $('#sip-dialpad').removeClass('open');
                        $("#numDisplay").val('');
                        $(".btnCall").removeAttr('disabled');
                        VoipSIP.stopRingTone();
                        VoipSIP.stopRingbackTone();
                        VoipSIP.setCallSessionStatus("Canceled");
                        if (this.direction === 'outgoing') {
                            VoipSIP.callActiveID = null;
                            newSess = null;
                            VoipSIP.logCall(this, 'ended');
                        }
                    });
                    newSess.on('bye', function (e) {
                        unconfirmOnUnload();
                        $('#sip-dialpad').removeClass('open');
                        $("#numDisplay").val('');
                        $(".btnCall").removeAttr('disabled');
                        VoipSIP.stopRingTone();
                        VoipSIP.stopRingbackTone();
                        VoipSIP.setCallSessionStatus("");
                        VoipSIP.logCall(newSess, 'ended');
                        VoipSIP.callActiveID = null;
                        newSess = null;
                    });
                    newSess.on('failed', function (e) {
                        unconfirmOnUnload();
                        $('#sip-dialpad').removeClass('open');
                        $("#numDisplay").val('');
                        $(".btnCall").removeAttr('disabled');
                        VoipSIP.stopRingTone();
                        VoipSIP.stopRingbackTone();
                        VoipSIP.setCallSessionStatus('');
                    });
                    newSess.on('rejected', function (e) {
                        unconfirmOnUnload();
                        $('#sip-dialpad').removeClass('open');
                        $("#numDisplay").val('');
                        $(".btnCall").removeAttr('disabled');
                        VoipSIP.stopRingTone();
                        VoipSIP.stopRingbackTone();
                        VoipSIP.setCallSessionStatus('Rejected');
                        VoipSIP.callActiveID = null;
                        VoipSIP.logCall(this, 'ended');
                        newSess = null;
                    });
                    VoipSIP.Sessions[newSess.ctxid] = newSess;
                },
                getUserMediaFailure: function (e) {
                    window.console.error('getUserMedia failed:', e);
                    // VoipSIP.setError(true, 'Media Error.', 'You must allow access to your microphone.  Check the address bar.', true);
                },
                getUserMediaSuccess: function (stream) {
                    VoipSIP.Stream = stream;
                },
                setCallSessionStatus: function (status) {
                    $('#txtCallStatus').html(status);
                },
                setStatus: function (status) {
                    $("#txtRegStatus").html('<i class="fa fa-signal m-0"></i> ' + status);
                },
                logCall: function (session, status) {
                    window['sessionAbc'] = session;
                    var log = {
                        clid: session.displayName,
                        uri: session.remoteIdentity.uri.toString(),
                        id: session.ctxid,
                        time: new Date().getTime(),
                        ho_ten: session?.userInfo?.ho_ten,
                        phu_trach: session?.userInfo?.phu_trach
                    }, calllog = JSON.parse(localStorage.getItem('sipCalls'));
                    console.log('log', log);
                    if (!calllog) {
                        calllog = {};
                    }
                    if (!calllog.hasOwnProperty(session.ctxid)) {
                        calllog[log.id] = {
                            id: log.id,
                            clid: log.clid,
                            uri: log.uri,
                            start: log.time,
                            flow: session.direction,
                            ho_ten: log.ho_ten,
                            phu_trach: log.phu_trach
                        };
                    }
                    if (status === 'ended') {
                        calllog[log.id].stop = log.time;
                    }
                    if (status === 'ended' && calllog[log.id].status === 'ringing') {
                        calllog[log.id].status = 'missed';
                    } else {
                        calllog[log.id].status = status;
                    }
                    console.log('calllog ', log.id, calllog[log.id]);
                    localStorage.setItem('sipCalls', JSON.stringify(calllog));
                    VoipSIP.logShow();
                },
                logItem: function (item) {
                    $(".btnCall").attr('disabled', 'disabled');
                    var callActive = (item.status !== 'ended' && item.status !== 'missed'),
                        callLength = (item.status !== 'ended') ? '<span id="' + item.id + '"></span>' : moment.duration(item.stop - item.start).humanize(),
                        callClass = '', callIcon, i, iend,
                        showDelete = false;
                    switch (item.status) {
                        case 'ringing'  :
                            callClass = 'list-group-item-success';
                            callIcon = 'fa-bell';
                            showDelete = true;
                            break;
                        case 'missed'   :
                            callClass = 'list-group-item-danger';
                            if (item.flow === "incoming") {
                                callIcon = 'fa-chevron-left bellflagincoming';
                            }
                            if (item.flow === "outgoing") {
                                callIcon = 'fa-chevron-right bellflagoutgoing';
                            }
                            showDelete = true;
                            break;
                        case 'holding'  :
                            callClass = 'list-group-item-warning';
                            callIcon = 'fa-pause';
                            break;
                        case 'answered' :
                        case 'resumed'  :
                            callClass = 'list-group-item-info';
                            callIcon = 'fa-phone-square';
                            break;
                        case 'ended'  :
                            if (item.flow === "incoming") {
                                callIcon = 'fa-chevron-left bellflagincoming';
                            }
                            if (item.flow === "outgoing") {
                                callIcon = 'fa-chevron-right bellflagoutgoing';
                            }
                            showDelete = true;
                            break;
                    }
                    i = '<div class="list-group-item sip-logitem clearfix ' + callClass + ' Vlabel_' + item.flow + ' LavAcTive' + callActive + '" data-uri="' + item.uri + '" data-sessionid="' + item.id + '" title="Double Click to Call"><div class="clearfix call-info"><div class="pull-left"><span><i class="fa fa-fw ' + callIcon + ' fa-fw m-0"></i> ' + (item?.ho_ten ? item?.ho_ten : VoipSIP.formatPhone(item.uri)) + '</span><small>' + moment(item.start).format('MM/DD hh:mm:ss a') + '</small></div><div class="pull-right text-right"><em>' + item.clid + '</em><br>' + callLength + '</div></div>';
                    if (item?.phu_trach != null) i += '<div>' + item.phu_trach + '</div>';
                    if (callActive) {
                        $(".btnCall").attr('disabled', 'disabled');
                        i += '<div class="btn-group btn-group-xs pull-right">';
                        if (item.status === 'ringing' && item.flow === 'incoming') {
                            i += '<button class="btn btn-xs btn-success btnCall" title="Call"><i class="fa fa-phone m-0"></i></button>';
                        } else {
                            i += '<button class="btn btn-xs btn-primary btnHoldResume" title="Hold"><i class="fa fa-pause m-0"></i></button><button class="btn btn-xs btn-info btnTransfer" title="Transfer"><i class="fa fa-random m-0"></i></button><button class="btn btn-xs btn-warning btnMute" title="Mute"><i class="fa fa-fw fa-microphone m-0"></i></button>';
                        }
                        i += '<button class="btn btn-xs btn-danger btnHangUp" title="Hangup"><i class="fa fa-stop m-0"></i></button></div>';
                        $('#MainCallSipBoard').append('<button class="btn btn-danger btn-block btnHangUp" id="MainCallSipBoardbtnHangUp" data-sessionid="' + item.id + '" title="Hangup">Hangup</button>');
                        $('#MainCallSipBoardbtnHangUp').click(function (event) {
                            event.preventDefault();
                            var sessionid = $(this).data('sessionid');
                            VoipSIP.sipHangUp(sessionid);
                            return false;
                        });
                    } else {
                        $(".btnCall").removeAttr('disabled');
                    }

                    /* Added by Hoang Duc 2020-09-22 */
                    if (showDelete) {
                        i += '<span class="pull-right"><i class="fa fa-trash text-muted sipLogItemClear" title="Clear Log"></i></span>';
                    }
                    /* End - Added by Hoang Duc 2020-09-22 */

                    i += '</div>';
                    $('#sip-logitems').append(i);
                    if (item.status === 'answered') {
                        var tEle = document.getElementById(item.id);
                        VoipSIP.callTimers[item.id] = new Stopwatch(tEle);
                        VoipSIP.callTimers[item.id].start();
                    }
                    if (callActive && item.status !== 'ringing') {
                        VoipSIP.callTimers[item.id].start({startTime: item.start});
                    }
                    $('#sip-logitems').scrollTop(0);
                },
                logShow: function () {
                    var calllog = JSON.parse(localStorage.getItem('sipCalls')), x = [];
                    if (calllog !== null) {
                        $('#sip-splash').addClass('d-none');
                        $('#sip-log').removeClass('d-none');
                        $('#sip-logitems').empty();
                        $('#MainCallSipBoard').empty();
                        $.each(calllog, function (k, v) {
                            x.push(v);
                        });
                        x.sort(function (a, b) {
                            return b.start - a.start;
                        });
                        $.each(x, function (k, v) {
                            VoipSIP.logItem(v);
                        });
                    } else {
                        $('#sip-splash').removeClass('d-none');
                        $('#sip-log').addClass('d-none');
                    }
                },
                logClear: function () {
                    localStorage.removeItem('sipCalls');
                    VoipSIP.logShow();
                },
                /* Added by Hoang Duc 2020-09-22 to clear Log Item*/
                logClearItem: function (id) {
                    let sipCalls =  JSON.parse(localStorage.getItem('sipCalls'));
                    delete sipCalls[id];

                    localStorage.setItem('sipCalls', JSON.stringify(sipCalls));

                    if (Object.keys(sipCalls).length > 0) {
                    } else {
                        $('#sip-splash').removeClass('d-none');
                        $('#sip-log').addClass('d-none');
                    }
                    jQuery('[data-sessionid="' + id+ '"]').remove();
                },
                /* End - Added by Hoang Duc 2020-09-22 */
                sipCall: function (target) {
                    try {
                        var s = VoipSIP.phone.invite(target, {
                            media: {
                                stream: VoipSIP.Stream,
                                constraints: {audio: true, video: false},
                                render: {remote: $('#audioRemote').get()[0]},
                                RTCConstraints: {"optional": [{'DtlsSrtpKeyAgreement': 'true'}]}
                            }
                        });
                        s.direction = 'outgoing';
                        VoipSIP.newSession(s);
                    } catch (e) {
                        throw(e);
                    }
                },
                sipTransfer: function (sessionid) {
                    var s = VoipSIP.Sessions[sessionid], target = window.prompt('Enter destination number', '');
                    VoipSIP.setCallSessionStatus('<i>Transfering the call...</i>');
                    s.refer(target);
                },
                sipHangUp: function (sessionid) {
                    var s = VoipSIP.Sessions[sessionid];
                    if (!s) {
                        return;
                    } else if (s.startTime) {
                        s.bye();
                    } else if (s.reject) {
                        s.reject();
                    } else if (s.cancel) {
                        s.cancel();
                    }
                },
                sipSendDTMF: function (digit) {
                    try {
                        VoipSIP.dtmfTone.play();
                    } catch (e) {
                    }
                    var a = VoipSIP.callActiveID;
                    if (a) {
                        var s = VoipSIP.Sessions[a];
                        s.dtmf(digit);
                    }
                },
                phoneCallButtonPressed: function (sessionid) {
                    let num = $("#numDisplay").val();
                    if (num.length >= 1) {
                        var s = VoipSIP.Sessions[sessionid], target = $("#numDisplay").val();
                        if (!s) {
                            $("#numDisplay").val("");
                            VoipSIP.sipCall(target);
                        } else if (s.accept && !s.startTime) {
                            s.accept({
                                media: {
                                    stream: VoipSIP.Stream,
                                    constraints: {audio: true, video: false},
                                    render: {remote: $('#audioRemote').get()[0]},
                                    RTCConstraints: {"optional": [{'DtlsSrtpKeyAgreement': 'true'}]}
                                }
                            });
                        }
                    } else {
                        $(".btnCall").removeAttr('disabled');
                    }
                },
                phoneMuteButtonPressed: function (sessionid) {
                    var s = VoipSIP.Sessions[sessionid];
                    if (!s.isMuted) {
                        s.mute();
                    } else {
                        s.unmute();
                    }
                },
                phoneHoldButtonPressed: function (sessionid) {
                    var s = VoipSIP.Sessions[sessionid];
                    if (s.isOnHold().local === true) {
                        s.unhold();
                    } else {
                        s.hold();
                    }
                },
                setError: function (err, title, msg, closable) {
                    if (err === true) {
                        VoipSIP.setStatus("Error");
                    } else {
                        $('#numDisplay').removeProp('disabled');
                    }
                },
                hasWebRTC: function () {
                    console.log('aaa', navigator.webkitGetUserMedia, navigator.mozGetUserMedia, navigator.getUserMedia);
                    if (navigator.webkitGetUserMedia) {
                        return true;
                    } else if (navigator.mozGetUserMedia) {
                        return true;
                    } else if (navigator.getUserMedia) {
                        return true;
                    } else {
                        // VoipSIP.setError(true, 'Unsupported Browser.', 'Your browser does not support the features required for this phone.');
                        window.console.error("WebRTC support not found");
                        return false;
                    }
                }
            };
            VoipSIP.phone = new SIP.UA(VoipSIP.config);
            eventVoipSIP();
            resolve();
        });
    }

    function eventVoipSIP() {
        return new Promise(resolve => {
            if (VoipSIP == null) initVoipSIP();
            VoipSIP.phone.on('connected', function (e) {
                VoipSIP.setStatus("Connected");
            });
            VoipSIP.phone.on('disconnected', function (e) {
                VoipSIP.setStatus("Disconnected");
                reconnect = setInterval(function () {
                    VoipSIP.setStatus("Reconnect");
                    VoipSIP.connect();
                }, 3000);
                // VoipSIP.setError(true, 'Websocket Disconnected.', 'An Error occurred connecting to the websocket.');
                /*localStorage.removeItem('SIPCreds');
                $("#sessions > .session").each(function (i, session) {
                    VoipSIP.removeSession(session, 500);
                });*/
            });
            VoipSIP.phone.on('registered', function (e) {
                localStorage.setItem('ctxPhone', 'true');
                $("#mldError").modal('hide');
                VoipSIP.setStatus("VOIP24H - " + user.Display);
            });
            VoipSIP.phone.on('registrationFailed', function (e) {
                // VoipSIP.setError(true, 'Registration Error.', 'An Error occurred registering your phone. Check your settings.');
                localStorage.removeItem('SIPCreds');
                VoipSIP.setStatus("Error: Registration Failed");
            });
            VoipSIP.phone.on('unregistered', function (e) {
                // VoipSIP.setError(true, 'Registration Error.', 'An Error occurred registering your phone. Check your settings.');
                localStorage.removeItem('SIPCreds');
                VoipSIP.setStatus("Error: Registration Failed");
            });
            VoipSIP.phone.on('invite', function (incomingSession) {
                var s = incomingSession;
                s.direction = 'incoming';
                micPermissionAllowed(VoipSIP.newSession, VoipSIP.newSession, s);
            });
            resolve();
        });
    }

    async function micPermissionAllowed(grantedCallBack, deninedCallBack, v = null) {
        await navigator.permissions.query(
            // { name: 'camera' }
            {name: 'microphone'}
            // { name: 'geolocation' }
            // { name: 'notifications' }
            // { name: 'midi', sysex: false }
            // { name: 'midi', sysex: true }
            // { name: 'push', userVisibleOnly: true }
            // { name: 'push' } // without userVisibleOnly isn't supported in chrome M45, yet
        ).then(function (permissionStatus) {
            state = permissionStatus.state;
            if (state === 'granted') {
                if (typeof grantedCallBack === 'function') grantedCallBack(v);
                return true;
            } else {
                console.log('Mic permission denined');
                alert('Please check your mic (permission)');
                if (typeof deninedCallBack === 'function') {
                    permissionStatus.onchange = function () {
                        console.log('Mic permission change');
                        if (this.state === 'granted') {
                            console.log('Mic permission granted');
                            deninedCallBack(v);
                        }
                    }
                }
                return false;
            }
        })
    }

    function hasWebRTC() {
        console.log('aaa', navigator.webkitGetUserMedia, navigator.mozGetUserMedia, navigator.getUserMedia);
        if (navigator.webkitGetUserMedia) {
            return true;
        } else if (navigator.mozGetUserMedia) {
            return true;
        } else if (navigator.getUserMedia) {
            return true;
        } else {
            // VoipSIP.setError(true, 'Unsupported Browser.', 'Your browser does not support the features required for this phone.');
            window.console.error("WebRTC support not found");
            return false;
        }
    }

    function confirmOnUnload() {
        var closeEditorWarning = function () {
            return 'If you close this window, you will not be able to make or receive calls from your browser.';
        };
        var closePhone = function () {
            localStorage.removeItem('ctxPhone');
            VoipSIP.phone.stop();
        };
        window.onbeforeunload = closeEditorWarning;
        window.onunload = closePhone;
    }

    function unconfirmOnUnload() {
        window.onbeforeunload = null;
        window.onunload = null;
    }

    if (!hasWebRTC()) {
        console.log("WebRTC required");
        return;
    }
    $('#sipClient').keydown(function (event) {
        if (event.which === 8) {
            $('#numDisplay').focus();
        }
    });
    $('#numDisplay').keypress(async function (e) {
        if (e.which === 13) {
            if (VoipSIP === null) await initVoipSIP();
            micPermissionAllowed(VoipSIP.phoneCallButtonPressed, VoipSIP.phoneCallButtonPressed);
        }
    });
    $('.digit').click(function (event) {
        event.preventDefault();
        var num = $('#numDisplay').val(), dig = $(this).data('digit');
        digitlabel();
        $('#numDisplay').val(num + dig);
        VoipSIP.sipSendDTMF(dig);
        return false;
    });
    $('.btnCall').click(function (event) {
        $(this).attr('disabled', 'disabled');
        VoipSIP.phoneCallButtonPressed();
    });
    $("#AcbtnCallClean").click(function () {
        VoipSIP.dtmfTone.play();
        let num = $('#numDisplay').val();
        if (num.length > 0) {
            $('#numDisplay').val(num.substring(0, num.length - 1));
        }
        digitlabel();
    });
    $('.sipLogClear').click(function (event) {
        event.preventDefault();
        $('.btnHangUp').remove();
        VoipSIP.logClear();
    });
    $('#sip-logitems').delegate('.sip-logitem .btnCall', 'click', function (event) {
        $(this).attr('disabled', 'disabled');
        var sessionid = $(this).closest('.sip-logitem').data('sessionid');
        VoipSIP.phoneCallButtonPressed(sessionid);
        return false;
    });
    $('#sip-logitems').delegate('.sip-logitem .btnHoldResume', 'click', function (event) {
        var sessionid = $(this).closest('.sip-logitem').data('sessionid');
        VoipSIP.phoneHoldButtonPressed(sessionid);
        return false;
    });
    $('#sip-logitems').delegate('.sip-logitem .btnHangUp', 'click', function (event) {
        var sessionid = $(this).closest('.sip-logitem').data('sessionid');
        VoipSIP.sipHangUp(sessionid);
        return false;
    });
    $('#sip-logitems').delegate('.sip-logitem .btnTransfer', 'click', function (event) {
        var sessionid = $(this).closest('.sip-logitem').data('sessionid');
        VoipSIP.sipTransfer(sessionid);
        return false;
    });
    $('#sip-logitems').delegate('.sip-logitem .btnMute', 'click', function (event) {
        var sessionid = $(this).closest('.sip-logitem').data('sessionid');
        VoipSIP.phoneMuteButtonPressed(sessionid);
        return false;
    });
    $('#sip-logitems').delegate('.sip-logitem', 'dblclick', function (event) {
        event.preventDefault();
        var uri = $(this).data('uri');
        $('#numDisplay').val(uri);
        micPermissionAllowed(VoipSIP.phoneCallButtonPressed, VoipSIP.phoneCallButtonPressed);
    });
    /* Added by Hoang Duc 2020-09-22 to register button clear call log item*/
    $('#sip-logitems').delegate('.sipLogItemClear', 'click', function (event) {
        let confirm = window.confirm('Xóa log?');
        if (confirm) {
            let logId = $(this).closest('.list-group-item').data('sessionid');
            VoipSIP.logClearItem(logId);
        }
    });
    /* End - Added by Hoang Duc 2020-09-22 to register button clear call log item*/
    $('body').on('click', '.call-to', function (event) {
        event.preventDefault();
        if (!$('#sipClient').hasClass('active')) $('#sipClient').addClass('active');
        var uri = $(this).data('uri');
        $('#numDisplay').val(uri);
        micPermissionAllowed(VoipSIP.phoneCallButtonPressed, VoipSIP.phoneCallButtonPressed);
    });
    $('#sldVolume').on('change', function () {
        var v = $(this).val() / 100, btn = $('#btnVol'), icon = $('#btnVol').find('i'), active = VoipSIP.callActiveID;
        if (VoipSIP.Sessions[active]) {
            VoipSIP.Sessions[active].player.volume = v;
            VoipSIP.callVolume = v;
        }
        $('audio').each(function () {
            $(this).get()[0].volume = v;
        });
        if (v < 0.1) {
            btn.removeClass(function (index, css) {
                return (css.match(/(^|\s)btn\S+/g) || []).join(' ');
            }).addClass('btn btn-sm btn-danger');
            icon.removeClass().addClass('fa fa-fw fa-volume-off');
        } else if (v < 0.8) {
            btn.removeClass(function (index, css) {
                return (css.match(/(^|\s)btn\S+/g) || []).join(' ');
            }).addClass('btn btn-sm btn-info');
            icon.removeClass().addClass('fa fa-fw fa-volume-down');
        } else {
            btn.removeClass(function (index, css) {
                return (css.match(/(^|\s)btn\S+/g) || []).join(' ');
            }).addClass('btn btn-sm btn-primary');
            icon.removeClass().addClass('fa fa-fw fa-volume-up');
        }
        return false;
    });
    var Stopwatch = function (elem, options) {
        function createTimer() {
            return document.createElement("span");
        }

        var timer = createTimer(), offset, clock, interval;
        options = options || {};
        options.delay = options.delay || 1000;
        options.startTime = options.startTime || Date.now();
        elem.appendChild(timer);

        function start() {
            if (!interval) {
                offset = options.startTime;
                interval = setInterval(update, options.delay);
            }
        }

        function stop() {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        }

        function reset() {
            clock = 0;
            render();
        }

        function update() {
            clock += delta();
            render();
        }

        function render() {
            timer.innerHTML = moment(clock).format('mm:ss');
        }

        function delta() {
            var now = Date.now(), d = now - offset;
            offset = now;
            return d;
        }

        reset();
        this.start = start;
        this.stop = stop;
    };
    initVoipSIP();
    setTimeout(async function () {
        await VoipSIP.logShow();
    }, 2000);

    function digitlabel() {
        let num = $('#numDisplay').val();
        if (num.length > 0) {
            $("#AcbtnCallClean").addClass('active');
        } else {
            $("#AcbtnCallClean").removeClass('active');
        }
    }
});
