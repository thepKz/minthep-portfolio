if(window.innerWidth < 1200) {
    new Swiper(".swiper-container",{
        direction: "horizontal",
        slidesPerView: 1,
        nextButton: ".swiper-button-next",
        prevButton: ".swiper-button-prev",
        paginationClickable: !0,
        spaceBetween: 0,
        autoplay: 2500,
        loop: !0
    })
} else {
    new Swiper(".swiper-container",{
        direction: "horizontal",
        slidesPerView: 1,
        parallax: !0,
        nextButton: ".swiper-button-next",
        prevButton: ".swiper-button-prev",
        paginationClickable: !0,
        spaceBetween: 0,
        speed: 1500,
        parallax: !0,
        loop: !0
    })
}
