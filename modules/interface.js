/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Functionality for building user interface elements.
*/

import {
    userIsLoggedIn,
    getCurrentUserProfile,
} from './api.js';




///////////////////////////////////////////////////////////////////////////////////////////
// Show an error message to the user. If the autoCloseAfter parameter is set to a number
// of milliseconds the error message will automatically close after that amount of time.
function showErrorMessage(errorText, clearOldMessages = false, autoCloseAfter = 15000) {
    const errorBox = document.querySelector("#errors");

    if (clearOldMessages) {
        errorBox.innerHTML = '';
    }

    console.log("ShowError", errorText);
    errorBox.classList.add("show");
    const errorMsg = document.createElement("div");
    errorMsg.innerText = errorText;
    errorBox.appendChild(errorMsg);
    errorBox.scrollTo();

    if (autoCloseAfter > 1000) {
        setTimeout((errorMsg, errorBox) => {
            errorMsg.remove();
            if (errorBox.children.length <= 0) {
                errorBox.classList.remove("show");
            }
        }, autoCloseAfter, errorMsg, errorBox);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Remove any error messages displayed to the user.
function clearErrorMessages() {
    const errorBox = document.querySelector("#errors");
    errorBox.innerHTML = '';
    errorBox.classList.remove("show");
}


///////////////////////////////////////////////////////////////////////////////////////////
// Show a feedback message that is not an error to the user. If the autoCloseAfter parameter 
// is set to a number of milliseconds the status message will automatically close after that 
// amount of time.
function showStatusMessage(statusText, clearOldMessages = false, autoCloseAfter = 15000) {
    const statusBox = document.querySelector("#status");

    if (clearOldMessages) {
        statusBox.innerHTML = '';
    }

    console.log("Show status", statusText);
    statusBox.classList.add("show");
    const statusMsg = document.createElement("div");
    statusMsg.innerText = statusText;
    statusBox.appendChild(statusMsg);
    statusBox.scrollTo();

    if (autoCloseAfter > 1000) {
        setTimeout((statusMsg, statusBox) => {
            statusMsg.remove();
            if (statusBox.children.length <= 0) {
                statusBox.classList.remove("show");
            }
        }, autoCloseAfter, statusMsg, statusBox);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Remove any error messages displayed to the user.
function clearStatusMessages() {
    const statusBox = document.querySelector("#status");
    statusBox.innerHTML = '';
    statusBox.classList.remove("show");
}


//////////////////////////////////////////////////////////////////////////////////////////////////////
// Toggle Dark Mode on and off
function toggleDarkMode(enableDarkMode) {
    console.log("DARK MODE", enableDarkMode);
    if (enableDarkMode) {
        document.body.classList.add("darkmode");
        document.querySelector("#colormode-toggle-dark").checked = true;
    }
    else {
        document.body.classList.remove("darkmode");
        document.querySelector("#colormode-toggle-light").checked = true;
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////
// Load existing profile info into the User Profile forms.
function loadUserProfile() {
    if (userIsLoggedIn()) {
        getCurrentUserProfile().then((userProfile) => {
            const userName = document.querySelector("#change-name-input");
            const userPicture = document.querySelector("#change-picture-input");
            const userEmail = document.querySelector("#change-email-input");

            userName.value = userProfile.displayName.trim();
            userPicture.value = userProfile.picture.trim();
            userEmail.value = userProfile.email.trim();
            setIsBusy(false);
        }).catch((error) => {
            setIsBusy(false);
        });
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////
// Show the user an indicator that the page is busy doing something. 
function setIsBusy(isBusy) {
    const busySpinner = document.querySelector("#busy");
    if (isBusy) {
        busySpinner.classList.add("show");
    }
    else {
        busySpinner.classList.remove("show");
    }
}


export { showErrorMessage, clearErrorMessages, showStatusMessage, clearStatusMessages, toggleDarkMode, loadUserProfile, setIsBusy }; 