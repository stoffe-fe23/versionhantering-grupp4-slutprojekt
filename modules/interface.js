/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Functionality for building user interface elements.
*/



///////////////////////////////////////////////////////////////////////////////////////////
//
function showErrorMessage(errorText, clearOldMessages = false) {
    const errorBox = document.querySelector("#errors");

    if (clearOldMessages) {
        errorBox.innerHTML = '';
    }

    console.log("ShowError", errorText);
    errorBox.classList.add("show");
    const errorMsg = document.createElement("div");
    errorMsg.innerText = errorText;
    errorBox.appendChild(errorMsg);
}


///////////////////////////////////////////////////////////////////////////////////////////
//
function clearErrorMessages() {
    const errorBox = document.querySelector("#errors");
    errorBox.innerHTML = '';
    errorBox.classList.remove("show");
}


export { showErrorMessage, clearErrorMessages }; 