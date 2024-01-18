
/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Functionality for building user interface elements.
*/

import {
    userIsLoggedIn,
    getIsUserId,
    getUserPicture,
    getChatMessages,
    getChatMessagesOnUpdate,
    deleteChatMessage,
    editChatMessage,
    likeChatMessage,
    getIsValidText,
} from './api.js';

import { showErrorMessage, clearErrorMessages } from './interface.js';

// Cache fetched user profile images to avoid needless DB queries. 
let profilePictureCache = {};

// List of available background colors, the property name is part of the CSS-class prefixed by "background-", 
// i.e. "background-lightgreen". The value is displayed to the user in color picker menus. 
const messageBackgroundColors = {
    lightgreen: 'Green',
    lightyellow: 'Yellow',
    lightblue: 'Blue',
    lightpink: 'Pink',
    lightgray: 'Gray'
};

// Globals used by listener for changes to the "chatmeddelande" DB-collection.
let messagesSnapshot;
let boardInitialized = false;


// Load up to 30 available messages and listen for changes
initializeMessageBoard(30);



///////////////////////////////////////////////////////////////////////////////////////////
// Check if the editor form is currently open for any message.
function getIsEditingAnyMessage() {
    if (!userIsLoggedIn()) {
        return;
    }

    const messageEditors = document.querySelectorAll(".message-edit-form");
    if ((messageEditors !== undefined) && (messageEditors.length > 0)) {
        for (const messageEditor of messageEditors) {
            if (messageEditor.classList.contains("show")) {
                return true;
            }
        }
    }
    return false;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Fetch and build message cards to display on the messageboard
/*
function buildMessageBoard(displayMax) {
    const messageBoard = document.querySelector("#messageboard");
    messageBoard.innerHTML = "";

    getChatMessages(displayMax).then((messageList) => {
        if ((messageList !== undefined) && (messageList !== null) && (typeof messageList == "object") && (Object.keys(messageList).length > 0)) {
            for (const messageId in messageList) {
                messageBoard.appendChild(createMessageCard(messageList[messageId], messageId));
            }
        }
    });
}
*/


///////////////////////////////////////////////////////////////////////////////////////////
// Fetch and build messageboard and listen for changes in the database.
function initializeMessageBoard(displayMax) {
    messagesSnapshot = getChatMessagesOnUpdate(displayMax, (updatedData) => {
        const messageBoard = document.querySelector("#messageboard");

        updatedData.docChanges().forEach((change) => {
            if (change.type === "added") {
                if (boardInitialized) {
                    messageBoard.prepend(createMessageCard(change.doc.data(), change.doc.id));
                }
                else {
                    messageBoard.append(createMessageCard(change.doc.data(), change.doc.id));
                }
                console.log(" >>>> New message!", change.doc.id, change.doc.data());
            }
            if (change.type === "modified") {
                updateMessageCard(change.doc.data(), change.doc.id);
                console.log(" >>>> Modified message!", change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                deleteMessageCard(change.doc.id);
                console.log(" >>>> Deleted message!", change.doc.id, change.doc.data());
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
        const messageLikes = messageCard.querySelector(".message-like-button");
        const colorsClasses = Object.keys(messageBackgroundColors).map((val) => `background-${val}`);

        const editorText = messageCard.querySelector(".message-edit-text");
        const editorColor = messageCard.querySelector(".message-edit-color");

        colorsClasses.forEach((elem) => { messageCard.classList.remove(elem); });
        if (getIsValidText(messageData.color)) {
            messageCard.classList.add(`background-${messageData.color}`);
        }

        messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
        messageText.innerText = ((messageData.message !== undefined) && (messageData.message.length > 0) ? messageData.message : "No message");
        messageLikes.innerText = ` Like (${messageData.likes !== undefined ? messageData.likes : 0})`;
        messageAuthor.innerText = ((messageData.authorname !== undefined) && (messageData.authorname.length > 0) ? messageData.authorname : "No name");

        editorText.value = messageText.innerText;
        editorColor.value = messageData.color;
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
function createMessageCard(messageData, messageId = null) {
    const messageCard = document.createElement("article");
    const messageDate = document.createElement("div");
    const messageText = document.createElement("div");
    const messageFooter = document.createElement("footer");
    const messageEditButton = document.createElement("button");
    const messageLikeButton = document.createElement("button");
    const messageEditor = createMessageEditor(messageData, messageId);

    // TODO: Trim messages to 50-100 ish characters to show on card, and make popup to show the full text if longer

    messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
    messageText.innerText = ((messageData.message !== undefined) && (messageData.message.length > 0) ? messageData.message : "No message");
    messageEditButton.innerText = "Edit";
    messageLikeButton.innerText = ` Like (${messageData.likes !== undefined ? messageData.likes : 0})`;

    messageCard.classList.add("message-card");
    messageDate.classList.add("message-date");
    messageText.classList.add("message-text");
    messageFooter.classList.add("message-footer");
    messageEditButton.classList.add("message-edit-button");
    messageLikeButton.classList.add("message-like-button");

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

    // Author name and picture
    const messageAuthor = createAuthorSignature(messageData.authorname, './images/profile-test-image.png');
    if ((profilePictureCache[messageData.authorid] !== undefined) && (profilePictureCache[messageData.authorid] !== null)) {
        const userPicture = profilePictureCache[messageData.authorid];
        if (userPicture.length > 0) {
            setAuthorSignaturePicture(messageAuthor, userPicture);
        }

    }
    else {
        getUserPicture(messageData.authorid).then((userPicture) => {
            if (userPicture.length > 0) {
                profilePictureCache[messageData.authorid] = userPicture;
                setAuthorSignaturePicture(messageAuthor, userPicture);
            }
        });

    }

    // Edit button if current user is the creator of this message
    if ((messageId !== null) && getIsUserId(messageData.authorid)) {
        messageEditButton.classList.add("show");
    }

    // Hide/show the message editor
    messageEditButton.addEventListener("click", (event) => {
        messageEditor.classList.toggle("show");
    });

    // Message editor
    messageEditor.addEventListener("submit", messageEditorSubmitCallback);

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

    messageCard.setAttribute("messageid", messageId);
    messageCard.setAttribute("authorid", messageData.authorid);

    return messageCard;
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
            const messageTextBox = parentElement.querySelector(".message-text");
            const colorsClasses = Object.keys(messageBackgroundColors).map((val) => `background-${val}`);

            messageTextBox.innerText = messageText;

            colorsClasses.forEach((elem) => {
                formElement.classList.remove(elem);
                parentElement.classList.remove(elem);
            });

            formElement.classList.add(`background-${messageColor}`);
            parentElement.classList.add(`background-${messageColor}`);
            formElement.classList.remove("show");

            console.log("Message edited", messageId);
        }).catch((error) => {
            console.error("Error editing message:", error);
            showErrorMessage(error, true);
        });
    }
    else if (event.submitter.classList.contains("message-edit-cancel")) {
        formElement.reset();
        formElement.classList.remove("show");
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

    messageEditor.classList.add("message-edit-form");
    messageEditText.classList.add("message-edit-text");
    messageEditButtons.classList.add("message-edit-buttons");
    messageEditSave.classList.add("message-edit-save");
    messageEditDelete.classList.add("message-edit-delete");
    messageEditCancel.classList.add("message-edit-cancel");
    messageEditColor.classList.add("message-edit-color");

    messageEditor.setAttribute("messageid", messageId);
    messageEditor.setAttribute("authorid", messageData.authorid);

    messageEditText.innerText = messageData.message;
    messageEditSave.innerText = "Save";
    messageEditDelete.innerText = "Delete";
    messageEditCancel.innerText = "Cancel";

    if (getIsValidText(messageData.color)) {
        messageEditor.classList.add(`background-${messageData.color}`);
    }

    messageEditColor.appendChild(createColorPicker(messageData.color));

    messageEditButtons.append(
        messageEditSave,
        messageEditCancel,
        messageEditDelete
    );

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
    return selectList;
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