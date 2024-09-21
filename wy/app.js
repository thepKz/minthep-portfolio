"use strict";
        // GSAP animations
        gsap.registerPlugin(ScrollTrigger);

        // Get the header height
        const headerHeight = document.getElementById('header').offsetHeight;

        // Animate sections on scroll
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                opacity: 0,
                y: 50,
                duration: 1,
                scrollTrigger: {
                    trigger: title,
                    start: `top ${80 + headerHeight}px`,
                    end: `bottom ${20 + headerHeight}px`,
                    toggleActions: 'play none none reverse'
                }
            });
        });

        // Parallax effect for hero section
        gsap.to('.hero-section', {
            backgroundPosition: '50% 100%',
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero-section',
                start: `top ${headerHeight}px`,
                end: `bottom top`,
                scrub: true
            }
        });

        // 3D hover effect for gallery items
        const galleryItems = document.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
            item.addEventListener('mousemove', (e) => {
                const { left, top, width, height } = item.getBoundingClientRect();
                const x = (e.clientX - left) / width;
                const y = (e.clientY - top) / height;
                
                gsap.to(item, {
                    rotationY: 20 * (x - 0.5),
                    rotationX: -20 * (y - 0.5),
                    ease: 'power2.out',
                    transformPerspective: 900,
                    transformOrigin: 'center'
                });
            });
            
            item.addEventListener('mouseleave', () => {
                gsap.to(item, {
                    rotationY: 0,
                    rotationX: 0,
                    ease: 'power2.out'
                });
            });
        });

        // Infinite scroll for brand slider
        const brandCarousel = document.querySelector('.brand-carousel');
        const brandItems = document.querySelectorAll('.brand-item');
        brandItems.forEach(item => {
            const clone = item.cloneNode(true);
            brandCarousel.appendChild(clone);
        });

        // Smooth scroll to main-game section
        document.getElementById('scroll-down-button').addEventListener('click', function(e) {
            e.preventDefault();
            setTimeout(() => {
                const mainGame = document.getElementById('main-game');
                const headerHeight = document.getElementById('header').offsetHeight;
                window.scrollTo({
                    top: mainGame.offsetTop - headerHeight,
                    behavior: 'smooth'
                });
            }, 100);
        });

    
var canvas = document.getElementById('canvas'),
  ctx = canvas.getContext('2d'),
  w = canvas.width = window.innerWidth,
  h = canvas.height = window.innerHeight,
    
  hue = 217,
  stars = [],
  count = 0,
  maxStars = 1400;

// Thanks @jackrugile for the performance tip! https://codepen.io/jackrugile/pen/BjBGoM
// Cache gradient
var canvas2 = document.createElement('canvas'),
    ctx2 = canvas2.getContext('2d');
    canvas2.width = 100;
    canvas2.height = 100;
var half = canvas2.width/2,
    gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
    gradient2.addColorStop(0.025, '#fff');
    gradient2.addColorStop(0.1, 'hsl(' + hue + ', 61%, 33%)');
    gradient2.addColorStop(0.25, 'hsl(' + hue + ', 64%, 6%)');
    gradient2.addColorStop(1, 'transparent');

    ctx2.fillStyle = gradient2;
    ctx2.beginPath();
    ctx2.arc(half, half, half, 0, Math.PI * 2);
    ctx2.fill();

// End cache

function random(min, max) {
  if (arguments.length < 2) {
    max = min;
    min = 0;
  }
  
  if (min > max) {
    var hold = max;
    max = min;
    min = hold;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function maxOrbit(x,y) {
  var max = Math.max(x,y),
      diameter = Math.round(Math.sqrt(max*max + max*max));
  return diameter/2;
}

var Star = function() {

  this.orbitRadius = random(maxOrbit(w,h));
  this.radius = random(60, this.orbitRadius) / 12;
  this.orbitX = w / 2;
  this.orbitY = h / 2;
  this.timePassed = random(0, maxStars);
  this.speed = random(this.orbitRadius) / 50000;
  this.alpha = random(2, 10) / 10;

  count++;
  stars[count] = this;
}

Star.prototype.draw = function() {
  var x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX,
      y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY,
      twinkle = random(10);

  if (twinkle === 1 && this.alpha > 0) {
    this.alpha -= 0.05;
  } else if (twinkle === 2 && this.alpha < 1) {
    this.alpha += 0.05;
  }

  ctx.globalAlpha = this.alpha;
    ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius);
  this.timePassed += this.speed;
}

for (var i = 0; i < maxStars; i++) {
  new Star();
}

function animation() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'hsla(' + hue + ', 64%, 6%, 1)';
    ctx.fillRect(0, 0, w, h)
  
  ctx.globalCompositeOperation = 'lighter';
  for (var i = 1, l = stars.length; i < l; i++) {
    stars[i].draw();
  };  
  
  window.requestAnimationFrame(animation);
}

animation();


