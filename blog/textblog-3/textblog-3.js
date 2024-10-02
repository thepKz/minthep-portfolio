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

    // Example toggle functionality
    $('#showExampleBtn').click(function () {
        var $exampleContent = $('#exampleContent');
        var $button = $(this);

        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    // Example toggle functionality for 2.1
    $('#showExampleBtn2_1').click(function () {
        var $exampleContent = $('#exampleContent2_1');
        var $button = $(this);

        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    //showExampleBtn2_2
    $('#showExampleBtn2_2').click(function () {
        var $exampleContent = $('#exampleContent2_2');
        var $button = $(this);

        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    //showExampleBtn2_3
    $('#showExampleBtn2_3').click(function () {
        var $exampleContent = $('#exampleContent2_3');
        var $button = $(this);

        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });
    $('#showExampleBtn22_2').click(function () {
        var $exampleContent = $('#exampleContent22_2');
        var $button = $(this);
        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    $('#showExampleBtn21_3').click(function () {
        var $exampleContent = $('#exampleContent21_3');
        var $button = $(this);
        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    $('#showExampleBtn2_4').click(function () {
        var $exampleContent = $('#exampleContent2_4');
        var $button = $(this);
        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    $('#showExampleBtn2_5').click(function () {
        var $exampleContent = $('#exampleContent2_5');
        var $button = $(this);
        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });

    $('#showExampleBtn2_6').click(function () {
        var $exampleContent = $('#exampleContent2_6');
        var $button = $(this);
        $exampleContent.slideToggle();
        $button.text(function (i, text) {
            return text === "Hiển thị ví dụ" ? "Ẩn ví dụ" : "Hiển thị ví dụ";
        });
    });
    for (let i = 1; i <= 10; i++) {
        $(`#showExampleBtn3_${i}`).click(function () {
            var $exampleContent = $(`#exampleContent3_${i}`);
            var $button = $(this);
            $exampleContent.slideToggle();
            $button.text(function (i, text) {
                return text === "Hiển thị ví dụ" ? "Hiển thị ví dụ" : "Ẩn ví dụ";
            });
        });
    }
    for (let i = 1; i <= 10; i++) {
        $(`#showExampleBtn4_${i}`).click(function () {
            var $exampleContent = $(`#exampleContent4_${i}`);
            var $button = $(this);
            $exampleContent.slideToggle();
            $button.text(function (i, text) {
                return text === "Hiển thị ví dụ" ? "Hiển thị ví dụ" : "Ẩn ví dụ";
            });
        });
    }
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


function checkProbability() {
    const answer = parseFloat(document.getElementById('probability-answer').value);
    const correctAnswer = 5/8;
    const feedback = document.getElementById('probability-feedback');
    
    if (Math.abs(answer - correctAnswer) < 0.01) {
        feedback.textContent = 'Chính xác! Xác suất là 5/8 = 0.625';
        feedback.style.color = 'green';
    } else {
        feedback.textContent = 'Chưa đúng. Hãy thử lại!';
        feedback.style.color = 'red';
    }
}