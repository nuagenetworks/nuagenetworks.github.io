(function() {
    var lastOffset = 0;

    $(window).scroll(function()
    {
        var offset =  window.pageYOffset,
            newTop = - lastOffset / 2;
            goingUp = offset < lastOffset;
            lastOffset = offset;

        $(".call-out").css("top", newTop)
        $(".site-header").css("top", (newTop <= -150 && !goingUp) ? -150 : 0 )
    })
})()