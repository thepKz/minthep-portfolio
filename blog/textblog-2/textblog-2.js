document.addEventListener('DOMContentLoaded', function() {
    // Progressive Disclosure
    const sectionToggles = document.querySelectorAll('.section-toggle');
    sectionToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const content = this.nextElementSibling;
            if (content.style.display === 'none' || content.style.display === '') {
                content.style.display = 'block';
                this.classList.add('active');
                this.innerHTML += ' <span class="toggle-indicator">▲</span>';
            } else {
                content.style.display = 'none';
                this.classList.remove('active');
                this.innerHTML = this.innerHTML.replace(' <span class="toggle-indicator">▲</span>', '');
            }
        });
    });
    document.querySelectorAll('.section-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const content = this.nextElementSibling;
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });
    });
    // Back to top button
    const backToTopButton = document.getElementById("back-to-top");
    window.onscroll = function() {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            backToTopButton.style.display = "block";
        } else {
            backToTopButton.style.display = "none";
        }
    };

    backToTopButton.onclick = function() {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    };


    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Add hover effect to table rows
    const tableRows = document.querySelectorAll('tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.transform = 'scale(1.02)';
            row.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.transform = 'scale(1)';
            row.style.boxShadow = 'none';
        });
    });

    // Thêm hiệu ứng parallax cho header
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        let scrollPosition = window.pageYOffset;
        header.style.backgroundPositionY = scrollPosition * 0.5 + 'px';
    });

    // Thêm hiệu ứng typing cho tiêu đề
    function typeWriter(element, text, i = 0) {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(() => typeWriter(element, text, i), 500);
        }
    }

    const mainTitle = document.querySelector('h1');
    typeWriter(mainTitle, mainTitle.textContent);
    mainTitle.textContent = '';

    // Thêm hiệu ứng cho các phần tử khi scroll
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    });

    fadeElements.forEach(element => {
        observer.observe(element);
    });
});