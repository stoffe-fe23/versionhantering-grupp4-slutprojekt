
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
    deleteChatMessage,
    editChatMessage,
    likeChatMessage,
    getIsValidText,
} from './api.js';


let profilePictureCache = {};

const messageBackgroundColors = {
    lightgreen: 'Green',
    lightyellow: 'Yellow',
    lightblue: 'Blue',
    lightpink: 'Pink',
    lightgray: 'Gray'
};

/*
let messageUpdateInterval;


// Check for new messages every 30 seconds.
messageUpdateInterval = setInterval(() => {
    if (!getIsEditingAnyMessage()) {
        console.log("Not editing");
    }
}, 30000);

*/




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

    console.log("DATAITEM", messageId, messageData);

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
            console.error("MESSAGE LIKE", error);
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
        });
    }
    else if (event.submitter.classList.contains("message-edit-cancel")) {
        formElement.reset();
        formElement.classList.remove("show");
    }
    else if (event.submitter.classList.contains("message-edit-delete")) {
        if (confirm("Are you sure you wish to permanently remove this message?")) {
            deleteChatMessage(messageId).then(() => {
                buildMessageBoard();
            }).catch((error) => {
                console.error("Error deleting message:", error);
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


export { createMessageCard, buildMessageBoard, createColorPicker };