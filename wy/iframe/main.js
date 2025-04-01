var itemsImg = document.querySelectorAll(".item img")

// itemsImg.forEach(function(item, i) {
//   item.src = "img/taisaolailawonyoung/" + (i + 12) + ".jpg";
// });

var TL = gsap.timeline({scrollTrigger: {
  trigger: "main",
  pin: ".items",
  pinSpacing: false,
  scrub: 2,
  start: () => window.innerHeight + " bottom",
  end: "bottom bottom",
  invalidateOnRefresh: true
}})

TL.to(".items__inner", {rotate: 0}, 0)
TL.fromTo(".items .items__col:nth-child(2n + 0)", {y: "-0vh"}, {y: "50vh"}, 0)
TL.fromTo(".items .items__col:nth-child(2n + 1)", {y: "50vh"}, {y: "0vh"}, 0)
TL.to(".item", {width: "50vw"}, 0)
TL.fromTo(".item img", {scale: 2}, {scale: 1}, 0)

var contentTL = gsap.timeline({scrollTrigger: {
  trigger: "main",
  scrub: 2,
  start: () => window.innerHeight * 1 + " bottom",
  end: "bottom bottom",
  invalidateOnRefresh: true
}})
contentTL.fromTo(".content", 1, {borderRadius: "100%", scale: 0}, {borderRadius: "0%", scale: 1})
contentTL.fromTo(".content h1", 1, {scale: 0}, {scale: 1})
contentTL.fromTo(".content p", 1, {scale: 0}, {scale: 1})