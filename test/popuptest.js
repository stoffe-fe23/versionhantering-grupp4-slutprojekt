document.querySelector("#update-user").addEventListener("click", (event) => {
    if (userIsLoggedIn()) {
        const inputField = document.querySelector("#change-name-input");
        inputField.value = getCurrentUserName();
        inputField.focus();
        inputField.select();
        document.querySelector("#change-name-dialog").showModal();
    }
});