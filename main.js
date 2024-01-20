/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Main script of the page. Respond to user input. 
*/

import {
    userLogin,
    userLogoff,
    userIsLoggedIn,
    createNewUser,
    getCurrentUserName,
    getCurrentUserProfile,
    userUpdateProfile,
    setUserLoginCallback,
    setUserLogoffCallback,
    userDelete,
    userSetPassword,
    userSendEmailVerification
} from './modules/api.js';

import { showErrorMessage, clearErrorMessages, toggleDarkMode } from './modules/interface.js';
import { createMessageCard } from './modules/message.js';


// Configure function to run when a user has logged in
setUserLoginCallback(userLoggedInCallback);

// Configure function to run when the user has logged off
setUserLogoffCallback(userLoggedOffCallback);

// Set default darkmode setting depending on visitor's system setting. 
toggleDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);



///////////////////////////////////////////////////////////////////////////////////
// Update the darkmode setting if the user's system setting changes. 
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    toggleDarkMode(event.matches);
});


///////////////////////////////////////////////////////////////////////////////////
// Radio-group to toggle darkmode on and off manually. 
document.querySelectorAll(`#colormode-toggle-wrapper input[name="colormode-toggle"]`).forEach((modeRadio) => {
    modeRadio.addEventListener("change", (event) => {
        toggleDarkMode(event.currentTarget.value == "dark");
    })
});


///////////////////////////////////////////////////////////////////////////////////////////
// Main navigation menu
document.querySelectorAll("#mainmenu a.menu-option").forEach((menuLink) => {
    menuLink.addEventListener("click", (event) => {
        event.preventDefault();

        const messagesSection = document.querySelector("#messages");
        const aboutSection = document.querySelector("#about");
        const contactSection = document.querySelector("#contact");

        clearErrorMessages();

        messagesSection.classList.add("hide");
        aboutSection.classList.add("hide");
        contactSection.classList.add("hide");

        switch (event.currentTarget.id) {
            case "menu-messages": messagesSection.classList.remove("hide"); break;
            case "menu-about": aboutSection.classList.remove("hide"); break;
            case "menu-contact": contactSection.classList.remove("hide"); break;
        }

        // document.querySelector("#mainmenu-toggle").checked = false;
    });
});



///////////////////////////////////////////////////////////////////////////////////////////
// Button to add a new message - show New Message editor
document.querySelector("#message-new-button").addEventListener("click", (event) => {
    event.preventDefault();

    if (userIsLoggedIn(true)) {
        // Avoid opening another new message if one is already open...
        const newMessageCard = document.querySelector("#new-message-card");
        if ((newMessageCard === null) || (newMessageCard === undefined)) {
            const messageBoard = document.querySelector("#messageboard");
            const newMessageForm = createMessageCard(null, null, true);
            const newMessageInput = newMessageForm.querySelector(".message-edit-text");

            messageBoard.prepend(newMessageForm);
            newMessageInput.focus();
        }
    }
    else if (userIsLoggedIn()) {
        showErrorMessage("Your account must be verified to post messages. Check your inbox for an e-mail with a verification link.");
    }
    else {
        showErrorMessage("You must be logged in to add new messages.");
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// User button events

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
// Login form
document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!userIsLoggedIn()) {
        const loginName = document.querySelector("#login-email").value.trim();
        const loginPassword = document.querySelector("#login-password").value.trim();

        userLogin(loginName, loginPassword).then(() => {
            document.querySelector("#user-login-dialog").close();
        }).catch((error) => {
            if (error.code !== undefined) {
                switch (error.code) {
                    case "auth/invalid-email": showErrorMessage("The specified email address is invalid."); break;
                    case "auth/user-disabled": showErrorMessage("Your user account has been suspended. Unable to log in."); break;
                    case "auth/user-not-found": showErrorMessage("The specified user account does not exist."); break;
                    case "auth/wrong-password": showErrorMessage("Incorrect username or password."); break;
                    case "auth/invalid-credential": showErrorMessage("Incorrect username or password."); break;
                    default: showErrorMessage(`Login error: ${error.message} (${error.code})`); break;
                }
            }
            else {
                showErrorMessage(`Login error: ${error}`);
            }
            console.error("LOGIN ERROR", error);
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
// Create new user form
document.querySelector("#new-user-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const newEmail = document.querySelector("#new-user-email").value.trim();
    const newPassword = document.querySelector("#new-user-password").value.trim();
    const newPasswordConfirm = document.querySelector("#new-user-password-again").value.trim();
    const newName = document.querySelector("#new-user-name").value.trim();

    if (newPassword == newPasswordConfirm) {
        createNewUser(newEmail, newPassword, newName).then((data) => {
            userSendEmailVerification().then(() => {
                console.log("Verification mail sent.");
            });
        }).catch((error) => {
            if (error.code !== undefined) {
                switch (error.code) {
                    case "auth/email-already-in-use": showErrorMessage("Unable to create new account. You already have an account."); break;
                    case "auth/invalid-email": showErrorMessage("The specified email address is invalid."); break;
                    case "auth/operation-not-allowed": showErrorMessage("You cannot create an account at this time. Try again later?"); break;
                    case "auth/weak-password": showErrorMessage("The specified password is too weak. Use something less easy to guess."); break;
                    default: showErrorMessage(`New user error: ${error.message} (${error.code})`); break;
                }
            }
            else {
                showErrorMessage(`New user error: ${error}`);
            }
            console.log("USER CREATE ERROR", error);
        });
        event.currentTarget.reset();
    }
    else {
        console.log("Passwords do not match!");
    }

});


///////////////////////////////////////////////////////////////////////////////////////////
// Profile data form, change name and profile picture
document.querySelector("#user-profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (userIsLoggedIn()) {
        const inputValue = document.querySelector("#change-name-input").value.trim();
        const profileData = { displayName: inputValue };

        userUpdateProfile(profileData).then((param) => {
            getCurrentUserProfile().then((currUser) => {
                const userName = getCurrentUserName();
                document.querySelector("#logged-in-email").innerHTML = `${userName} <span>(${currUser.email})</span>`;
                document.querySelector("#user-menu-button span").innerText = userName;

                document.querySelector("#user-profile-dialog").close();
                console.log("PROFILE UPDATED", currUser, param);
            });
        });
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// Account info form, change email address, password or remove account
document.querySelector("#user-account-form").addEventListener("submit", (event) => {
    const oldPassword = document.querySelector("#change-confirm-input");

    // TODO: Update account data if something has changed, or remove account if that button is pressed
    //  * Get current profile data to compare with: getCurrentUserProfile()
    //  * Remove the user account with userDelete(oldPassword)
    //  * Update user password with userSetPassword(oldPassword, newPassword)
    //  * Change email address with userSetEmail(oldPassword, newEmail)

    // User pressed the save-submit button
    if (event.submitter.id == "change-account-submit") {
        const newPassword = document.querySelector("#change-password-input");
        const confirmPassword = document.querySelector("#change-password-again-input");
        const newEmail = document.querySelector("#change-email-input");

        if (newPassword.value.trim() !== confirmPassword.value.trim()) {
            showErrorMessage("Your new password does not match.");
        }

        console.log("TODO", "Update account button pressed!");
    }
    // User pressed the delete submit button
    else if (event.submitter.id == "change-account-remove") {
        console.log("TODO", "Delete account button pressed!");
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// USER LOG IN: This function is run when user login is completed
function userLoggedInCallback() {
    getCurrentUserProfile().then((currUser) => {
        const loginForm = document.querySelector("#login-form");
        const loggedInBox = document.querySelector("#logged-in");
        const newUserForm = document.querySelector("#new-user-form");
        const newMessageButton = document.querySelector("#message-new-wrapper");

        const userEmail = document.querySelector("#logged-in-email");
        const userName = document.querySelector("#logged-in-name");
        const userDate = document.querySelector("#logged-in-last");

        userName.innerText = currUser.displayName;
        userEmail.innerHTML = currUser.email;
        userDate.innerText = `last login: ${currUser.lastLogin}`;

        loginForm.classList.remove("show");
        newUserForm.classList.remove("show");

        loggedInBox.classList.add("show");
        newMessageButton.classList.add("show");

        document.querySelector("#user-menu-button span").innerText = currUser.displayName;
        document.querySelector("#user-menu-button img").src = currUser.picture;


    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// USER LOG OFF: This function is run when user logoff is concluded.
function userLoggedOffCallback() {
    const loginForm = document.querySelector("#login-form");
    const loggedInBox = document.querySelector("#logged-in");
    const newUserForm = document.querySelector("#new-user-form");
    const newMessageButton = document.querySelector("#message-new-wrapper");

    const userEmail = document.querySelector("#logged-in-email");
    const userName = document.querySelector("#logged-in-name");
    const userDate = document.querySelector("#logged-in-last");

    userName.innerText = '';
    userEmail.innerText = '';
    userDate.innerText = '';

    loggedInBox.classList.remove("show");
    newMessageButton.classList.remove("show");
    loginForm.classList.add("show");
    newUserForm.classList.add("show");

    document.querySelector("#user-menu-button span").innerText = "Log in";
    document.querySelector("#user-menu-button img").src = './images/profile-test-image.png';

    console.log("ANV. UTLOGG");
}
