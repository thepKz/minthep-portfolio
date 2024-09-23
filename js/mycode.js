document.addEventListener('DOMContentLoaded', function () {
    if (window.innerWidth > 1000) {
        // Khởi tạo ScrollReveal
        const sr = ScrollReveal({
            reset: true,
            distance: '150px',
            duration: 1000,
            delay: 150,
            easing: 'ease-in-out'
        });

        // Áp dụng hiệu ứng cho các phần tử
        sr.reveal('.box-bottom', { origin: 'bottom' });
        sr.reveal('.box-left', { origin: 'left' });
        sr.reveal('.box-top', { origin: 'top' });
        sr.reveal('.box-right', { origin: 'right' });

        // Hiệu ứng cho các đoạn p trong phần About Me
        const paragraphs = document.querySelectorAll('.about-me p');
        paragraphs.forEach(function(paragraph, index) {
            sr.reveal(paragraph, {
                delay: 100 * index,
                distance: '500px',
                duration: 2000,
                origin: 'right'
            });
        });
    }

    // Xử lý navbar toggle
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        navbarToggler.addEventListener('click', function() {
            navbarCollapse.classList.toggle('show');
        });
    }
});
