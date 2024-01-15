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
} from './modules/api.js';


// Configure function to run when a user has logged in
setUserLoginCallback(userLoggedInCallback);

// Configure function to run when the user has logged off
setUserLogoffCallback(userLoggedOffCallback);


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Create a new Message
document.querySelector("#store-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (userIsLoggedIn()) {
        const messageInput = document.querySelector("#store-value");

        addChatMessage(messageInput.value.trim()).then((newDoc) => {
            console.log("New document", newDoc.path, newDoc.id, newDoc);
            refreshMessages();
            messageInput.value = '';
            messageInput.focus();
        });
    }
});

///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Update Messages from database
document.querySelector("#fetch-values").addEventListener("click", (event) => {
    refreshMessages();
});

///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Fetch the 20 most recent Messages from the database and display them
function refreshMessages() {
    getChatMessages(20).then((dbData) => {
        const outputBox = document.querySelector("#output");
        outputBox.innerHTML = "";


        if ((dbData !== undefined) && (dbData !== null) && (typeof dbData == "object") && (Object.keys(dbData).length > 0)) {
            for (const docName in dbData) {
                outputBox.appendChild(newOutputMessage(dbData[docName], docName));
            }
        }

        console.log("CHAT MESSAGES", dbData);
    });
}

///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Build and return a Message HTML/DOM-element
//          dataItem is an object containing the message data
//          docName is the message-ID (i.e. document name in the database) used to uniquely identify this message
function newOutputMessage(dataItem, docName) {
    const dataContainer = document.createElement("div");
    const dataDate = document.createElement("div");
    const dataMessage = document.createElement("div");
    const dataAuthor = document.createElement("div");

    console.log("DATAITEM", docName, dataItem);
    dataDate.classList.add("fetched-data-date");
    dataMessage.classList.add("fetched-data-message");
    dataAuthor.classList.add("fetched-data-author");
    dataDate.innerText = ((dataItem.date.seconds !== undefined) && (dataItem.date.seconds !== null) ? timestampToDateTime(dataItem.date.seconds, false) : "Date missing");
    dataMessage.innerText = ((dataItem.message !== undefined) && (dataItem.message.length > 0) ? dataItem.message : "No message");
    dataAuthor.innerText = ((dataItem.authorname !== undefined) && (dataItem.authorname.length > 0) ? dataItem.authorname : "No name");

    dataContainer.append(dataDate, dataMessage, dataAuthor);

    // Store the messageID and authorID in an attribute for potential use in edit/delete ops
    dataContainer.setAttribute("messageid", docName);
    dataContainer.setAttribute("authorid", dataItem.authorid);

    return dataContainer;
}


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Login form
document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!userIsLoggedIn()) {
        const loginName = document.querySelector("#login-email").value.trim();
        const loginPassword = document.querySelector("#login-password").value.trim();

        userLogin(loginName, loginPassword).catch((error) => {
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
        });

        event.currentTarget.reset();
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Log off button
document.querySelector("#logoff-button").addEventListener("click", (event) => {
    if (userIsLoggedIn()) {
        userLogoff();
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
        });
        event.currentTarget.reset();
    }
    else {
        console.log("Passwords do not match!");
    }

});


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Change user name button
document.querySelector("#update-user").addEventListener("click", (event) => {
    if (userIsLoggedIn()) {
        const inputField = document.querySelector("#change-name-input");
        inputField.value = getCurrentUserName();
        inputField.focus();
        inputField.select();
        document.querySelector("#change-name-dialog").showModal();
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
                console.log("PROFILE UPDATED", currUser, param);
                document.querySelector("#change-name-dialog").close();
                document.querySelector("#logged-in-email").innerHTML = `${getCurrentUserName()} <span>(${currUser.email})</span>`;
            });
        });
    }
});




///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: This function is run when user login is completed
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
        showMessageForm(true);
    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: This function is run when user logoff is concluded.
function userLoggedOffCallback() {
    const loginForm = document.querySelector("#login-form");
    const logoutBox = document.querySelector("#logged-in");
    const userEmail = document.querySelector("#logged-in-email");
    const userDate = document.querySelector("#logged-in-last");

    userEmail.innerText = '';
    userDate.innerText = '';
    loginForm.classList.add("show");
    logoutBox.classList.remove("show");
    showMessageForm(false);
    console.log("ANV. UTLOGG");
}


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Toggle visible components depending on if a user is logged on or not
function showMessageForm(isVisible) {
    const storeForm = document.querySelector("#store-value-wrapper");
    const storeButton = document.querySelector("#store-button");
    const nameButton = document.querySelector("#update-user");
    const userUserForm = document.querySelector("#new-user-form");

    storeButton.disabled = !isVisible;
    nameButton.disabled = !isVisible;
    if (isVisible) {
        storeForm.classList.add("show");
        userUserForm.classList.remove("show");
    }
    else {
        storeForm.classList.remove("show");
        userUserForm.classList.add("show");
    }

}

///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Convert a timestamp number to a displayable date string
function timestampToDateTime(timestamp, isMilliSeconds = true) {
    const dateObj = new Date(isMilliSeconds ? timestamp : timestamp * 1000);
    return `${dateObj.toLocaleDateString('sv-SE')} ${dateObj.toLocaleTimeString('sv-SE')}`;
}