/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Main script of the page. Respond to user input. 
*/

import {
    addChatMessage,
    getChatMessages,
    userLogin,
    userLogoff,
    userIsLoggedIn,
    createNewUser,
    getCurrentUserName,
    getCurrentUserProfile,
    userUpdateProfile,
    setUserLoginCallback,
    setUserLogoffCallback,
    getUserPicture,
    userDelete,
    userSetPassword,
    userSendEmailVerification
} from './modules/api.js';

import { showErrorMessage, clearErrorMessages } from './modules/interface.js';
import { createColorPicker } from './modules/message.js';


// Configure function to run when a user has logged in
setUserLoginCallback(userLoggedInCallback);

// Configure function to run when the user has logged off
setUserLogoffCallback(userLoggedOffCallback);


// EXAMPLE: Build color picker menu for "New Message" form
// createNewMessageColorPicker();



// Open the login/new user dialog box
document.querySelector("#user-menu-button").addEventListener("click", (event) => {
    const loginDialog = document.querySelector("#user-login-dialog");
    loginDialog.showModal();
});

// Close the login dialog when clicking outside it
document.querySelector("#user-login-dialog").addEventListener("click", (event) => {
    if (event.target.id == event.currentTarget.id) {
        event.currentTarget.close();
    }
});

// Close the login dialog when pressing the ESC key
document.querySelector("#user-login-dialog").addEventListener("keyup", (event) => {
    if (event.key == "Escape") {
        event.currentTarget.close();
    }
});




///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Create a new Message
/* document.querySelector("#store-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (userIsLoggedIn()) {
        const messageInput = document.querySelector("#store-value");
        const messageColor = document.querySelector("#store-color").value.trim();

        addChatMessage(messageInput.value.trim(), messageColor).then((newDoc) => {
            messageInput.value = '';
            messageInput.focus();
        }).catch((error) => {
            showErrorMessage(error);
        });
    }
}); */


///////////////////////////////////////////////////////////////////////////////////////////
// Login form
document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!userIsLoggedIn()) {
        const loginName = document.querySelector("#login-email").value.trim();
        const loginPassword = document.querySelector("#login-password").value.trim();

        userLogin(loginName, loginPassword).then(() => {
            document.querySelector("#user-login-dialog").close();
        }).catch((error) => {
            /*
                If login fails errorCode may be set to one of the following:
                 - auth/invalid-email: Thrown if the email address is not valid.
                 - auth/user-disabled: Thrown if the user corresponding to the given email has been disabled.
                 - auth/user-not-found: Thrown if there is no user corresponding to the given email.
                 - auth/wrong-password: Thrown if the password is invalid for the given email, or the account corresponding to the email does not have a password set.
                 - auth/invalid-credential: Also seems to be thrown if the specified user does not exist? 
            */
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("LOGIN ERROR", errorMessage, errorCode);
            showErrorMessage(`Login error: ${errorMessage} (${errorCode})`);
        });

        event.currentTarget.reset();
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// Log off button
document.querySelector("#logoff-button").addEventListener("click", (event) => {
    if (userIsLoggedIn()) {
        userLogoff().then(() => {
            document.querySelector("#user-login-dialog").close();
        });
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Create new user form
document.querySelector("#new-user-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const newEmail = document.querySelector("#new-user-email").value.trim();
    const newPassword = document.querySelector("#new-user-password").value.trim();
    const newPasswordConfirm = document.querySelector("#new-user-password-again").value.trim();
    const newName = document.querySelector("#new-user-name").value.trim();

    if (newPassword == newPasswordConfirm) {
        createNewUser(newEmail, newPassword, newName).catch((error) => {
            /*
                If an error occurs during creation, errorCode may be one of:
                - auth/email-already-in-use: Thrown if there already exists an account with the given email address.
                - auth/invalid-email: Thrown if the email address is not valid.
                - auth/operation-not-allowed: Thrown if email/password accounts are not enabled.
                - auth/weak-password: Specified password is too weak and disallowed
            */
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("USER CREATE ERROR", errorMessage, errorCode);
            showErrorMessage(`New user error: ${errorMessage} (${errorCode})`);
        });
        event.currentTarget.reset();
    }
    else {
        console.log("Passwords do not match!");
    }

});


///////////////////////////////////////////////////////////////////////////////////////////
// User Profile button
document.querySelector("#update-user").addEventListener("click", (event) => {
    if (userIsLoggedIn()) {
        const inputField = document.querySelector("#change-name-input");
        inputField.value = getCurrentUserName();

        document.querySelector("#user-login-dialog").close();
        document.querySelector("#user-profile-dialog").showModal();
    }
});

// Close the user profile dialog when clicking outside it
document.querySelector("#user-profile-dialog").addEventListener("click", (event) => {
    if (event.target.id == event.currentTarget.id) {
        event.currentTarget.close();
    }
});

// Close the user profile  dialog when pressing the ESC key
document.querySelector("#user-profile-dialog").addEventListener("keyup", (event) => {
    if (event.key == "Escape") {
        event.currentTarget.close();
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Change user name form
document.querySelector("#change-name-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (userIsLoggedIn()) {
        const inputValue = document.querySelector("#change-name-input").value.trim();
        const profileData = { displayName: inputValue };

        userUpdateProfile(profileData).then((param) => {
            getCurrentUserProfile().then((currUser) => {
                const userName = getCurrentUserName();
                document.querySelector("#logged-in-email").innerHTML = `${userName} <span>(${currUser.email})</span>`;
                document.querySelector("#user-menu-button span").innerText = userName;
                console.log("PROFILE UPDATED", currUser, param);
            });
        });
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// USER LOG IN: This function is run when user login is completed
function userLoggedInCallback(currUser) {
    console.log("ANV INLOGG", currUser);

    getCurrentUserProfile().then((currUser) => {
        const loginForm = document.querySelector("#login-form");
        const logoutBox = document.querySelector("#logged-in");
        const userEmail = document.querySelector("#logged-in-email");
        const userDate = document.querySelector("#logged-in-last");

        userEmail.innerHTML = `${getCurrentUserName()} <span>(${currUser.email})</span>`;
        userDate.innerText = `last login: ${currUser.lastLogin}`;
        loginForm.classList.remove("show");
        logoutBox.classList.add("show");

        document.querySelector("#user-menu-button span").innerText = getCurrentUserName();
        getUserPicture().then((userPicture) => {
            document.querySelector("#user-menu-button img").src = userPicture;
        });


        showLoggedInUserElements(true);
    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// USER LOG OFF: This function is run when user logoff is concluded.
function userLoggedOffCallback() {
    const loginForm = document.querySelector("#login-form");
    const logoutBox = document.querySelector("#logged-in");
    const userEmail = document.querySelector("#logged-in-email");
    const userDate = document.querySelector("#logged-in-last");

    userEmail.innerText = '';
    userDate.innerText = '';
    loginForm.classList.add("show");
    logoutBox.classList.remove("show");

    document.querySelector("#user-menu-button span").innerText = "Log in";
    document.querySelector("#user-menu-button img").src = './images/profile-test-image.png';

    showLoggedInUserElements(false);
    console.log("ANV. UTLOGG");
}


///////////////////////////////////////////////////////////////////////////////////////////
// Toggle visible interface components depending on if a user is logged on or not
function showLoggedInUserElements(isLoggedOn) {
    const newMessageButton = document.querySelector("#message-new-wrapper");
    const newUserForm = document.querySelector("#new-user-form");

    if (isLoggedOn) {
        newUserForm.classList.remove("show");
        newMessageButton.classList.add("show");
    }
    else {
        newUserForm.classList.add("show");
        newMessageButton.classList.remove("show");
    }

}


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Create select menu with color picker for message background colors
/* function createNewMessageColorPicker() {
    const targetContainer = document.querySelector("#store-color-wrapper");
    const colorPickerElem = createColorPicker();
    colorPickerElem.id = 'store-color';
    targetContainer.appendChild(colorPickerElem);
} */