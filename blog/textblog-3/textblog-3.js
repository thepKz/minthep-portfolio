$(document).ready(function () {
    // Smooth scrolling for anchor links
    $('a[href^="#"]').on('click', function (event) {
        var target = $(this.getAttribute('href'));
        if (target.length) {
            event.preventDefault();
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 70
            }, 200);
        }
    });

    // Collapsible sections
    $('.chapter h3').click(function () {
        $(this).next('.card-body').slideToggle();
    });

    // Back to top button
    var btn = $('#back-to-top');
    $(window).scroll(function () {
        if ($(window).scrollTop() > 300) {
            btn.addClass('show');
        } else {
            btn.removeClass('show');
        }
    });

    btn.on('click', function (e) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, '200');
    });

    // Generic function for example toggle
    function toggleExample(btnId, contentId) {
        $(btnId).click(function () {
            var $exampleContent = $(contentId);
            var $button = $(this);
            $exampleContent.slideToggle();
            $button.text(function (i, text) {
                return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
            });
        });
    }



    // Apply toggle functionality to all example buttons
    toggleExample('#showExampleBtn', '#exampleContent');
    for (let i = 1; i <= 6; i++) {
        toggleExample(`#showExampleBtn2_${i}`, `#exampleContent2_${i}`);
    }
    toggleExample('#showExampleBtn22_2', '#exampleContent22_2');
    toggleExample('#showExampleBtn21_3', '#exampleContent21_3');

    // Apply toggle functionality to chapter 3 and 4 examples
    for (let chapter = 3; chapter <= 6; chapter++) {
        for (let i = 1; i <= 10; i++) {
            toggleExample(`#showExampleBtn${chapter}_${i}`, `#exampleContent${chapter}_${i}`);
        }
    }

    $(window).on('scroll', function() {
        $('.chapter').each(function() {
            if ($(window).scrollTop() >= $(this).offset().top - 100) {
                var id = $(this).attr('id');
                $('#toc .nav-link').removeClass('active');
                $('#toc .nav-link[href="#'+ id +'"]').addClass('active');
            }
        });
    });

    // Smooth scrolling for TOC links
    $('#toc .nav-link').on('click', function(e) {
        e.preventDefault();
        var target = $($(this).attr('href'));
        $('html, body').animate({
            scrollTop: target.offset().top - 80
        }, 500);
    });
});

MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
    },
    svg: {
        scale: 1.5 // Tăng kích thước lên 150%
    }
};
