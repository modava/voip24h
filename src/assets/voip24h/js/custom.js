$(function () {
    $('#sip-dialpad-header').click(function () {
        $('#sip-dialpad').toggleClass('open');
    });
    $('#a-call-center').click(function () {
        $('#sipClient').toggleClass('active');
    });
});