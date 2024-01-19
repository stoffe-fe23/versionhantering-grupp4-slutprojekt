
/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Functionality for showing, creating and editing messages.
*/

import {
    userIsLoggedIn,
    getIsUserId,
    getChatMessagesOnUpdate,
    deleteChatMessage,
    editChatMessage,
    addChatMessage,
    likeChatMessage,
    getIsValidText,
    getCurrentUserProfile,
    getCurrentUserId,
    getCurrentUserName,
    buildAuthorProfilesCache,
} from './api.js';

import { showErrorMessage, clearErrorMessages } from './interface.js';


const SHOW_MAX_MESSAGES = 32;
const SHORT_MESSAGE_LIMIT = 200;


// Colors (with associated CSS class identifier) available in color pickers
// Key is the name of a CSS class with a "background-" prefix.
const messageBackgroundColors = {
    lightgreen: 'Green',
    lightyellow: 'Yellow',
    lightblue: 'Blue',
    lightpink: 'Pink',
    lightgray: 'Gray'
};

// Globals used by listener for changes to the "chatmeddelande" DB-collection.
let messagesSnapshot;
let authorsSnapshot;
let authorCacheInitialized = false;
let boardInitialized = false;
let userProfileCache = {};


initializeDatabaseListeners();



///////////////////////////////////////////////////////////////////////////////////////////
// Build and update author cache and start listening for messages from the DB
function initializeDatabaseListeners() {
    // First fetch and cache a list of author names and pictures
    authorsSnapshot = buildAuthorProfilesCache((updatedData) => {
        updatedData.docChanges().forEach((change) => {
            if ((change.type === "added") || (change.type === "modified")) {
                const profileData = change.doc.data();
                const userId = profileData.userid;
                const userName = (getIsValidText(profileData.username) ? profileData.username : "No name");
                const userPicture = (getIsValidText(profileData.picture) ? profileData.picture : './images/profile-test-image.png');

                userProfileCache[userId] = {
                    userid: userId,
                    name: userName,
                    picture: userPicture,
                };

                if (change.type === "modified") {
                    // TODO: Uppdatera meddelanden skapade av denna användaren!
                }
            }
            if (change.type === "removed") {
                delete userProfileCache[userId];
                console.log("###### USER PROFILE DELETE", userId);
            }
        });

        // After initial author list is first loaded, start to listen for messages
        if (!authorCacheInitialized) {
            initializeMessageBoard(SHOW_MAX_MESSAGES);
            authorCacheInitialized = true;
        }
    });
    return authorsSnapshot;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Fetch and build messageboard and listen for changes in the database.
function initializeMessageBoard(displayMax) {
    messagesSnapshot = getChatMessagesOnUpdate(displayMax, (updatedData) => {
        const messageBoard = document.querySelector("#messageboard");
        updatedData.docChanges().forEach((change) => {
            if (change.type === "added") {
                // Insert new messages first, but not when initially building the board
                if (boardInitialized) {
                    messageBoard.prepend(createMessageCard(change.doc.data(), change.doc.id));
                }
                else {
                    messageBoard.append(createMessageCard(change.doc.data(), change.doc.id));
                }
            }
            if (change.type === "modified") {
                updateMessageCard(change.doc.data(), change.doc.id);
            }
            if (change.type === "removed") {
                deleteMessageCard(change.doc.id);
            }
        });

        boardInitialized = true;
    });

}


///////////////////////////////////////////////////////////////////////////////////////////
// Update information about an existing message
function updateMessageCard(messageData, messageId) {
    const messageCard = document.querySelector(`article[messageid="${messageId}"].message-card`);

    if ((messageCard !== undefined) && (messageCard !== null)) {
        const messageDate = messageCard.querySelector(".message-date");
        const messageText = messageCard.querySelector(".message-text");
        const messageAuthor = messageCard.querySelector(".message-author span");
        const messageAuthorPic = messageCard.querySelector(".message-author img");
        const messageLikes = messageCard.querySelector(".message-like-button");

        const messageEditor = messageCard.querySelector(".message-edit-form");
        const editorText = messageCard.querySelector(".message-edit-text");
        const editorColor = messageCard.querySelector(".message-edit-color");

        const messageFullTextBox = messageCard.querySelector(".message-fulltext-box");
        const messageFullTextButton = messageCard.querySelector(".message-fulltext-button");

        const trimmedText = getTruncatedText(messageData.message, SHORT_MESSAGE_LIMIT);

        messageCard.setAttribute("card-color", messageData.color);
        setElementBackgroundColor(messageCard, messageData.color);

        messageEditor.setAttribute("card-color", messageData.color);
        setElementBackgroundColor(messageEditor, messageData.color);

        messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
        messageLikes.innerText = ` Like (${messageData.likes !== undefined ? messageData.likes : 0})`;

        messageAuthor.innerText = (getIsValidText(userProfileCache[messageData.authorid].name) ? userProfileCache[messageData.authorid].name : "No name");
        messageAuthorPic.src = (getIsValidText(userProfileCache[messageData.authorid].picture) ? userProfileCache[messageData.authorid].picture : './images/profile-test-image.png');

        messageText.innerText = (getIsValidText(messageData.message) ? trimmedText : "No message");
        messageFullTextBox.innerText = (getIsValidText(messageData.message) ? messageData.message : "");
        editorText.innerHTML = (getIsValidText(messageData.message) ? messageData.message : "");
        editorColor.value = messageData.color;

        // Text is longer than the limit to display directly on the message note, load it in the viewer
        if (messageData.message.length > SHORT_MESSAGE_LIMIT) {
            messageFullTextButton.classList.remove("hide");
        }
        else {
            messageFullTextButton.classList.add("hide");
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Remove an existing message from the board
function deleteMessageCard(messageId) {
    const messageCard = document.querySelector(`article[messageid="${messageId}"].message-card`);

    if ((messageCard !== undefined) && (messageCard !== null)) {
        console.log("REMOVING MESSAGE", messageId);
        messageCard.remove();
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// EXAMPLE: Build and return a Message HTML/DOM-element
//          dataItem is an object containing the message data
//          docName is the message-ID (i.e. document name in the database) used to uniquely identify this message
function createMessageCard(messageData, messageId, isNewMessage = false) {
    const messageCard = document.createElement("article");
    const messageDate = document.createElement("div");
    const messageText = document.createElement("div");
    const messageFooter = document.createElement("footer");
    const messageEditButton = document.createElement("button");
    const messageLikeButton = document.createElement("button");
    const messageEditor = createMessageEditor(messageData, messageId);

    let messageAuthor;

    if (isNewMessage) {
        messageDate.innerText = 'New Message';
        messageText.innerText = '';
        messageEditButton.classList.add("hide");
        messageLikeButton.classList.add("hide");
    }
    else {
        messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
        messageText.innerText = (getIsValidText(messageData.message) ? getTruncatedText(messageData.message, SHORT_MESSAGE_LIMIT) : "No message");
        messageEditButton.innerText = "Edit";
        messageLikeButton.innerText = ` Like (${messageData.likes !== undefined ? messageData.likes : 0})`;
    }

    messageCard.classList.add("message-card");
    messageDate.classList.add("message-date");
    messageText.classList.add("message-text");
    messageFooter.classList.add("message-footer");
    messageEditButton.classList.add("message-edit-button");
    messageLikeButton.classList.add("message-like-button");

    if (!isNewMessage) {
        // Custom background-color
        if (getIsValidText(messageData.color)) {
            messageCard.classList.add(`background-${messageData.color}`);
        }

        // Like button
        messageLikeButton.addEventListener("click", (event) => {
            likeChatMessage(messageId).then(() => {
                messageLikeButton.innerText = ` Like (${messageData.likes !== undefined ? messageData.likes + 1 : 1})`;
                console.log("MESSAGE LIKED", messageId);
            }).catch((error) => {
                console.error("MESSAGE LIKE ERROR", error);
                showErrorMessage(error, true);
            });
        });


        userProfileCache[messageData.authorid].name

        // Author name and picture
        messageAuthor = createAuthorSignature(userProfileCache[messageData.authorid].name, userProfileCache[messageData.authorid].picture);

        // Edit button if current user is the creator of this message
        if ((messageId !== null) && getIsUserId(messageData.authorid)) {
            messageEditButton.classList.add("show");
        }

        // Hide/show the message editor
        messageEditButton.addEventListener("click", (event) => {
            const messageEditInput = messageEditor.querySelector("textarea");
            messageEditor.classList.toggle("show");
            messageEditInput.focus();
        });

        // Message editor
        messageEditor.addEventListener("submit", messageEditorSubmitCallback);

        messageCard.setAttribute("messageid", messageId);
        messageCard.setAttribute("authorid", messageData.authorid);
        messageCard.setAttribute("card-color", messageData.color);
    }
    else {
        // New Message
        const currUserId = getCurrentUserId();
        messageAuthor = createAuthorSignature(userProfileCache[currUserId].name, userProfileCache[currUserId].picture);

        messageEditor.classList.add("show");
        messageEditor.id = "new-message-editor";
        messageCard.id = "new-message-card";

        messageEditor.addEventListener("submit", newMessageEditorSubmitCallback);
    }

    messageFooter.append(
        messageEditButton,
        messageLikeButton
    );

    messageCard.append(
        messageDate,
        messageText,
        messageAuthor,
        messageFooter,
        messageEditor,
    );

    // Full message view popup on long messages.
    if (!isNewMessage) {
        const messageFullTextDialog = document.createElement("dialog");
        const messageFullTextBox = document.createElement("div");
        const messageFullTextButton = document.createElement("button");

        messageFullTextBox.innerText = (getIsValidText(messageData.message) ? messageData.message : "");
        messageFullTextButton.innerText = "View full";

        messageFullTextDialog.classList.add("message-fulltext-dialog");
        messageFullTextBox.classList.add("message-fulltext-box");
        messageFullTextButton.classList.add("message-fulltext-button");

        messageFullTextDialog.id = `dialog-${messageId}`;
        messageFullTextBox.id = `longtext-${messageId}`;

        messageFooter.appendChild(messageFullTextButton);
        messageFullTextDialog.appendChild(messageFullTextBox);
        messageCard.appendChild(messageFullTextDialog);

        if (messageData.message.length <= SHORT_MESSAGE_LIMIT) {
            messageFullTextButton.classList.add("hide");
        }

        messageFullTextDialog.addEventListener("click", (event) => {
            if (event.target.id == event.currentTarget.id) {
                event.currentTarget.close();
            }
        });

        messageFullTextButton.addEventListener("click", (event) => {
            messageFullTextDialog.showModal();
        });
    }

    return messageCard;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Event callback for submitting the new Message form
function newMessageEditorSubmitCallback(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const parentElement = document.querySelector("#new-message-card");

    if (event.submitter.classList.contains("message-edit-save")) {
        const messageText = formElement.querySelector("textarea").value.trim();
        const messageColor = formElement.querySelector("select").value;

        addChatMessage(messageText, messageColor).then((doc) => {
            // The database update will handle showing the new message, remove the New Message editor card.
            document.querySelector("#new-message-card").remove();
        }).catch((error) => {
            console.error("Error adding message:", error);
            showErrorMessage(error, true);
        });
    }
    else if (event.submitter.classList.contains("message-edit-cancel")) {
        // Abort creating new message - close the editor
        parentElement.remove();
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Event callback for submitting the Edit Message form of a message
function messageEditorSubmitCallback(event) {
    event.preventDefault();

    const messageId = event.currentTarget.getAttribute("messageid");
    const authorId = event.currentTarget.getAttribute("authorid");
    const formElement = event.currentTarget;
    const parentElement = formElement.parentElement;

    if (event.submitter.classList.contains("message-edit-save")) {
        const messageText = formElement.querySelector("textarea").value.trim();
        const messageColor = formElement.querySelector("select").value;

        editChatMessage(messageId, messageText, messageColor).then(() => {
            formElement.classList.remove("show");
            console.log("Message edited", messageId);
        }).catch((error) => {
            console.error("Error editing message:", error);
            showErrorMessage(error, true);
        });
    }
    else if (event.submitter.classList.contains("message-edit-cancel")) {
        // Reset form and close editor
        formElement.reset();
        formElement.classList.remove("show");

        // Restore the correct background color if it was changed in the editor
        for (const colorElement of [formElement, parentElement]) {
            const backgroundColor = colorElement.getAttribute("card-color");
            if (getIsValidText(backgroundColor)) {
                setElementBackgroundColor(colorElement, backgroundColor);
            }
        }

        // Reset color picker as well since reset() does not seem to work for it... 
        const formBackground = formElement.getAttribute("card-color");
        if (getIsValidText(formBackground)) {
            formElement.querySelector(".message-edit-color select").value = formBackground;
        }
    }
    else if (event.submitter.classList.contains("message-edit-delete")) {
        if (confirm("Are you sure you wish to permanently remove this message?")) {
            deleteChatMessage(messageId).catch((error) => {
                console.error("Error deleting message:", error);
                showErrorMessage(error, true);
            });
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Build the Author Info element with name and a profile picture
function createAuthorSignature(authorName, authorPicture = '') {
    const messageAuthor = document.createElement("div");
    const messageAuthorName = document.createElement("span");
    messageAuthorName.innerText = ((authorName !== undefined) && (authorName.length > 0) ? authorName : "No name");
    messageAuthor.classList.add("message-author");
    messageAuthor.appendChild(messageAuthorName);

    setAuthorSignaturePicture(messageAuthor, authorPicture);

    return messageAuthor;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Update the author profile picture of a message
function setAuthorSignaturePicture(messageAuthorBox, authorPicture) {
    if (authorPicture.length > 0) {
        let messageAuthorPicture = messageAuthorBox.querySelector("img");
        if ((messageAuthorPicture === undefined) || (messageAuthorPicture === null)) {
            messageAuthorPicture = document.createElement("img");
        }

        messageAuthorPicture.src = authorPicture;
        messageAuthorBox.appendChild(messageAuthorPicture);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Create an edit message form for the specified message
function createMessageEditor(messageData, messageId) {
    const messageEditor = document.createElement("form");
    const messageEditText = document.createElement("textarea");

    const messageEditButtons = document.createElement("div");
    const messageEditSave = document.createElement("button");
    const messageEditDelete = document.createElement("button");
    const messageEditCancel = document.createElement("button");
    const messageEditColor = document.createElement("div");

    const isNewMessage = ((messageId === undefined) || (messageId === null) || (messageData === undefined) || (messageData == null));

    messageEditor.classList.add("message-edit-form");
    messageEditText.classList.add("message-edit-text");
    messageEditButtons.classList.add("message-edit-buttons");
    messageEditSave.classList.add("message-edit-save");
    messageEditDelete.classList.add("message-edit-delete");
    messageEditCancel.classList.add("message-edit-cancel");
    messageEditColor.classList.add("message-edit-color");

    // Disallow empty messages
    messageEditText.setAttribute("minlength", 3);
    messageEditText.setAttribute("required", true);
    messageEditCancel.setAttribute("formnovalidate", true);
    messageEditDelete.setAttribute("formnovalidate", true);

    if (!isNewMessage) {
        messageEditor.setAttribute("messageid", messageId);
        messageEditor.setAttribute("authorid", messageData.authorid);

        messageEditText.innerHTML = messageData.message;
    }
    messageEditSave.innerText = (isNewMessage ? "Create" : "Save");
    messageEditDelete.innerText = "Delete";
    messageEditCancel.innerText = "Cancel";

    if (!isNewMessage && getIsValidText(messageData.color)) {
        messageEditor.classList.add(`background-${messageData.color}`);
        messageEditor.setAttribute("card-color", messageData.color);
    }

    messageEditColor.appendChild(createColorPicker(!isNewMessage ? messageData.color : ""));

    if (isNewMessage) {
        messageEditButtons.append(
            messageEditSave,
            messageEditCancel,
        );
    }
    else {
        messageEditButtons.append(
            messageEditSave,
            messageEditCancel,
            messageEditDelete
        );
    }

    messageEditor.append(
        messageEditText,
        messageEditColor,
        messageEditButtons
    );

    return messageEditor;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Create a select menu for choosing background color of messages
function createColorPicker(defaultValue) {
    const selectList = document.createElement("select");

    for (const bgColor in messageBackgroundColors) {
        const selectItem = document.createElement("option");
        selectItem.value = bgColor;
        selectItem.innerText = messageBackgroundColors[bgColor];
        if (defaultValue == bgColor) {
            selectItem.selected = true;
        }
        selectItem.classList.add(`background-${bgColor}`);
        selectList.appendChild(selectItem);
    }

    // Update color of editor card to preview the change
    selectList.addEventListener("change", (event) => {
        const cardElement = getFirstParentWithClass(event.target, 'message-card');
        const formElement = getFirstParentWithClass(event.target, 'message-edit-form');

        setElementBackgroundColor(cardElement, event.currentTarget.value);
        setElementBackgroundColor(formElement, event.currentTarget.value);
    });
    return selectList;
}


function setElementBackgroundColor(targetElement, newColor) {
    const colorsClasses = Object.keys(messageBackgroundColors).map((val) => `background-${val}`);
    colorsClasses.forEach((elem) => {
        targetElement.classList.remove(elem);
    });

    if (getIsValidText(newColor)) {
        targetElement.classList.add(`background-${newColor}`);
    }
}


function getFirstParentWithClass(startElement, className, maxDepth = 10) {
    let checkElement = startElement.parentElement;
    while ((!checkElement.classList.contains(className)) && (maxDepth > 0)) {
        maxDepth--;
        checkElement = checkElement.parentElement;
    }
    return (checkElement.classList.contains(className) ? checkElement : null);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////
// Return a string cropped down to a maximum number of characters. The function will cut off the
// string at the closest space character before the max-length to avoid cutting in the middle of words.
export function getTruncatedText(truncText, maxLength) {
    if (maxLength < truncText.length) {
        let cutOffLength = truncText.lastIndexOf(" ", maxLength);
        if (cutOffLength < 1) {
            cutOffLength = maxLength;
        }
        truncText = truncText.slice(0, cutOffLength) + "…";
    }
    return truncText;
}



///////////////////////////////////////////////////////////////////////////////////////////
// Convert a timestamp number to a displayable date string
function timestampToDateTime(timestamp, isMilliSeconds = true) {
    const dateObj = new Date(isMilliSeconds ? timestamp : timestamp * 1000);
    return `${dateObj.toLocaleDateString('sv-SE')} ${dateObj.toLocaleTimeString('sv-SE')}`;
}


export { createMessageCard, createColorPicker };