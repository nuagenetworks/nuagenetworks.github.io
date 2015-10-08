(function() {
    var lastOffset = 0;

    $(window).scroll(function()
    {
        var offset =  window.pageYOffset,
            newTop = - lastOffset / 2;
            goingUp = offset < lastOffset;
            lastOffset = offset;

        if (newTop > -400)
            $(".call-out").css("top", newTop)

        if (goingUp)
        {
            $(".site-header").css("top", 0)
        }
        else
        {
            if (newTop <= -150)
                $(".site-header").css("top", -150 )
            else
                $(".site-header").css("top", 0)
        }
    })
})()