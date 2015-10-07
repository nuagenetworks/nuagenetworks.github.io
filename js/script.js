(function(){
    $(window).scroll(function()
    {
        var offset =  window.pageYOffset,
            newTop = - window.pageYOffset / 2;

        $(".call-out").css("top",  newTop)

        if (newTop <= -150)
            $(".site-header").css("top", newTop + 150 )
        else
            $(".site-header").css("top", 0)
    })
})()