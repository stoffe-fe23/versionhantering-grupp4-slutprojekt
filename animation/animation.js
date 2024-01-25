/*
    Contribution by Luna (group 6)
*/
let backgroundAnimation;

// Luna: animate background elements
function animateBlocks() {
    backgroundAnimation = anime({
        targets: ".block-anime",
        translateX: function () {
            return anime.random(-700, 700);
        },
        translateY: function () {
            return anime.random(-500, 500);
        },
        scale: function () {
            return anime.random(1, 5);
        },
        easing: "linear",
        duration: 8000,
        delay: anime.stagger(10),
        complete: animateBlocks,
    });
}

// Stoffe: Added extra to be able to toggle on/off the background anim with a user setting
function playBackgroundAnimation(playAnim) {
    const animationContainer = document.querySelector(".container-anime");

    if (playAnim) {
        backgroundAnimation.play();
        animationContainer.classList.remove("hide");
    }
    else {
        backgroundAnimation.pause();
        animationContainer.classList.add("hide");
    }

}

// Luna: Create background elements and start animating
async function animateBackground() {
    const containerAnime = document.querySelector(".container-anime");

    for (let i = 0; i <= 75; i++) {
        const blocksAnime = document.createElement("div");
        blocksAnime.classList.add("block-anime");
        containerAnime.appendChild(blocksAnime);
    }

    animateBlocks();
    backgroundAnimation.pause();
    document.querySelector(".container-anime").classList.add("hide");
}

animateBackground();