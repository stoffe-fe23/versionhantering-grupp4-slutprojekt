const containerAnime = document.querySelector(".container-anime");

for (let i = 0; i <= 100; i++) {
  const blocksAnime = document.createElement("div");
  blocksAnime.classList.add("block-anime");
  containerAnime.appendChild(blocksAnime);
}

function animateBlocks() {
  anime({
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

animateBlocks();
