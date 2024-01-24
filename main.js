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
    userSetEmail,
    userSendEmailVerification,
    getLastUserId,
    deleteChatMessagesByAuthor,
    getIsValidImageUrl,
} from './modules/api.js';

import { showErrorMessage, clearErrorMessages, toggleDarkMode, loadUserProfile, showStatusMessage, setIsBusy } from './modules/interface.js';
import { createMessageCard, updateMessageCardsOwned, updateMessageCardsLiked } from './modules/message.js';


let likedMarkersInit = false;


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


///////////////////////////////////////////////////////////////////////////////////
// Radio-group to toggle background animation on and off
document.querySelectorAll(`#animation-toggle-wrapper input[name="animation-toggle"]`).forEach((modeRadio) => {
    modeRadio.addEventListener("change", (event) => {
        playBackgroundAnimation(event.currentTarget.value == "on");
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


        // Johanna Ostling kod
        let mySound = new Audio('./audio/snare-112754.mp3')
        mySound.play()
        // Johanna end

        // Hides the main menu in burger menu mode after picking a menu option. 
        document.querySelector("#mainmenu-toggle").checked = false;
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

// Open the User popup dialog with the login/new user dialog box and user profile editor
document.querySelector("#user-menu-button").addEventListener("click", (event) => {
    const loginDialog = document.querySelector("#user-login-dialog");
    loadUserProfile();
    loginDialog.showModal();
});

// Close the dialog when clicking the close button
document.querySelector("#user-login-close").addEventListener("click", (event) => {
    document.querySelector("#user-login-dialog").close();
});

// Close the dialog when pressing the ESC key
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
                    case "auth/invalid-email": showErrorMessage("The specified email address is invalid.", true, 10000); break;
                    case "auth/user-disabled": showErrorMessage("Your user account has been suspended. Unable to log in.", true, 10000); break;
                    case "auth/user-not-found": showErrorMessage("The specified user account does not exist.", true, 10000); break;
                    case "auth/wrong-password": showErrorMessage("Incorrect username or password.", true, 10000); break;
                    case "auth/invalid-credential": showErrorMessage("Incorrect username or password.", true, 10000); break;
                    default: showErrorMessage(`Login error: ${error.message} (${error.code})`, true, 10000); break;
                }
            }
            else {
                showErrorMessage(`Login error: ${error}`, true);
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
                showStatusMessage("A verification link has been sent by e-mail to the address you specified. (Check your spam-box too).");
            });
        }).catch((error) => {
            if (error.code !== undefined) {
                switch (error.code) {
                    case "auth/email-already-in-use": showErrorMessage("Unable to create new account. You already have an account.", true, 10000); break;
                    case "auth/invalid-email": showErrorMessage("The specified email address is invalid.", true, 10000); break;
                    case "auth/operation-not-allowed": showErrorMessage("You cannot create an account at this time. Try again later?", true, 10000); break;
                    case "auth/weak-password": showErrorMessage("The specified password is too weak. Use something less easy to guess.", true, 10000); break;
                    default: showErrorMessage(`New user error: ${error.message} (${error.code})`, true, 10000); break;
                }
            }
            else {
                showErrorMessage(`New user error: ${error}`, true, 10000);
            }
        });
        event.currentTarget.reset();
    }
    else {
        showErrorMessage("You did not enter the same desired password twice. Try again.", true, 10000);
    }

});


///////////////////////////////////////////////////////////////////////////////////////////
// Profile data form, change name and profile picture
document.querySelector("#user-profile-form").addEventListener("submit", (event) => {
    event.preventDefault();

    if (userIsLoggedIn()) {
        const profileDialog = document.querySelector("#user-login-dialog");
        const inputName = document.querySelector("#change-name-input").value.trim();
        const inputPicture = document.querySelector("#change-picture-input").value.trim();
        const profileData = {};

        getCurrentUserProfile().then((currentProfile) => {
            if (currentProfile.displayName != inputName) {
                if (inputName.length > 2) {
                    profileData.displayName = inputName;
                }
                else {
                    showErrorMessage("Your display name must be at least 3 characters long.", true, 10000);
                }
            }

            // Profile image value has been changed
            if (currentProfile.picture != inputPicture) {
                // Clear current profile image if set to empty string
                if (inputPicture.length == 0) {
                    profileData.picture = './images/user-icon.png';
                    updateProfileDataFromObject(profileData);
                    profileDialog.close();
                }
                else {
                    // If an image URL is set, attempt to validate it
                    getIsValidImageUrl(inputPicture).then((isValid) => {
                        // Delayed profile update since check may take time
                        if (isValid) {
                            profileData.picture = inputPicture;
                            updateProfileDataFromObject(profileData);
                            profileDialog.close();
                        }
                        else {
                            showErrorMessage("The specified portrait URL does not seem to be an image?", true, 10000);
                        }
                    });
                }
            }
            else {
                updateProfileDataFromObject(profileData);
                profileDialog.close();
            }
        });
    }
});


document.querySelector("#user-show-signup").addEventListener("click", (event) => {
    const loginForm = document.querySelector("#login-form");
    const newUserForm = document.querySelector("#new-user-form");

    loginForm.classList.add("hide");
    newUserForm.classList.remove("hide");
});

document.querySelector("#user-show-login").addEventListener("click", (event) => {
    const loginForm = document.querySelector("#login-form");
    const newUserForm = document.querySelector("#new-user-form");

    loginForm.classList.remove("hide");
    newUserForm.classList.add("hide");
});


///////////////////////////////////////////////////////////////////////////////////////////
// Account info form, change email address, password or remove account
document.querySelector("#user-account-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const oldPasswordBox = document.querySelector("#change-confirm-input");
    const oldPassword = oldPasswordBox.value.trim();

    // User pressed the save-submit button
    if (event.submitter.id == "change-account-submit") {
        const newPassword = document.querySelector("#change-password-input");
        const confirmPassword = document.querySelector("#change-password-again-input");
        const newEmail = document.querySelector("#change-email-input");


        getCurrentUserProfile().then((userProfile) => {
            const newEmailValue = newEmail.value.trim();
            const newPassValue = newPassword.value.trim();
            const newPassConfirmValue = confirmPassword.value.trim();

            // Change Email
            if (userProfile.email != newEmailValue) {
                userSetEmail(oldPassword, newEmailValue).then(() => {
                    showStatusMessage("Your e-mail address has been changed.", false, 10000);
                }).catch((error) => {
                    showErrorMessage(`Error changing e-mail address: ${error.message}`, true);
                });
            }

            // Change Password
            if ((newPassValue.length > 0) || (newPassConfirmValue.length > 0)) {
                if (newPassValue !== newPassConfirmValue) {
                    showErrorMessage("Your new password does not match.", true);
                }
                else {
                    userSetPassword(oldPassword, newPassValue).then(() => {
                        showStatusMessage("Your password has been changed", false, 10000);
                    }).catch((error) => {
                        showErrorMessage(`Error changing password: ${error.message}`, true);
                    });
                }
            }

            // Clear password fields.
            oldPasswordBox.value = '';
            newPassword.value = '';
            confirmPassword.value = '';
        });
    }
    // User pressed the delete button
    else if (event.submitter.id == "change-account-remove") {
        if (confirm("Are you sure you wish to completely remove your user account? This action cannot be undone!")) {
            userDelete(oldPassword).then(() => {
                deleteChatMessagesByAuthor(getLastUserId());
                showStatusMessage("Your account has been removed.", false, 10000);
            }).catch((error) => {
                showErrorMessage(`Error removing user account: ${error.message}`, true);
            });
        }
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// Update the current user profile with the specified values
function updateProfileDataFromObject(profileData) {
    if (Object.keys(profileData).length > 0) {
        userUpdateProfile(profileData).then((param) => {
            getCurrentUserProfile().then((currUser) => {
                document.querySelector("#logged-in-name").innerHTML = currUser.displayName;
                document.querySelector("#logged-in-email").innerHTML = currUser.email;
                document.querySelector("#user-menu-button span").innerText = currUser.displayName;
                document.querySelector("#user-menu-button img").src = currUser.picture;
            });
            showStatusMessage("Your user profile has been updated", false, 10000);
        }).catch((error) => {
            showErrorMessage(`Error saving your profile: ${error.message}`, true);
        });
    }
}



///////////////////////////////////////////////////////////////////////////////////////////
// USER LOG IN: This function is run when user login is completed
function userLoggedInCallback() {
    setIsBusy(true);
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

        updateMessageCardsOwned(currUser.uid, true);

        // Skip this on initial page load for a previously logged on user, 
        // since the messages already should be in the correct state. 
        if (likedMarkersInit) {
            updateMessageCardsLiked(currUser.uid);
        }
        likedMarkersInit = true;
        setIsBusy(false);
    }).catch((error) => {
        setIsBusy(false);
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

    const lastUser = getLastUserId();

    userName.innerText = '';
    userEmail.innerText = '';
    userDate.innerText = '';

    loggedInBox.classList.remove("show");
    newMessageButton.classList.remove("show");
    loginForm.classList.add("show");
    newUserForm.classList.add("show");

    document.querySelector("#user-menu-button span").innerText = "Log in";
    document.querySelector("#user-menu-button img").src = './images/user-icon.png';

    updateMessageCardsOwned(lastUser, false);
    updateMessageCardsLiked(false);
}
