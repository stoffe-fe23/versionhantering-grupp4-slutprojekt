// Automatically scroll to the top of the page by pressing a button.
// Elvira Ericsson 
export function scroll () {
    const scrollToTopButton = document.getElementById('to-the-top-button');
    if (
      document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
      scrollToTopButton.style.display = "flex";
    } else {
      scrollToTopButton.style.display = "none";
    }
}
  
export function scrollToTopFunction (event) {
    document.documentElement.scrollTop = 0;
    event.preventDefault();
}