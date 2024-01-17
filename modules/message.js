
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
} from './api.js';


let profilePictureCache = {};


function buildMessageBoard(displayMax) {
    const messageBoard = document.querySelector("#messageboard");
    messageBoard.innerHTML = "";

    getChatMessages(displayMax).then((messageList) => {
        if ((messageList !== undefined) && (messageList !== null) && (typeof messageList == "object") && (Object.keys(messageList).length > 0)) {
            for (const messageId in messageList) {
                messageBoard.appendChild(createMessageCard(messageList[messageId], messageId));
            }
        }

        console.log("BUILD MESSAGES", messageList);
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

    console.log("DATAITEM", messageId, messageData);

    messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
    messageText.innerText = ((messageData.message !== undefined) && (messageData.message.length > 0) ? messageData.message : "No message");
    messageEditButton.innerText = "Edit";

    messageCard.classList.add("message-card");
    messageDate.classList.add("message-date");
    messageText.classList.add("message-text");
    messageFooter.classList.add("message-footer");
    messageEditButton.classList.add("message-edit-button");

    // Author
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
    messageEditButton.addEventListener("click", (event) => {
        // TODO: Visa/göm form för redigering
        console.log("TODO: Show edit message form");
    });

    messageFooter.appendChild(messageEditButton);
    messageCard.append(
        messageDate,
        messageText,
        messageAuthor,
        messageFooter,
        createMessageEditor(messageData, messageId),
    );

    messageCard.setAttribute("messageid", messageId);
    messageCard.setAttribute("authorid", messageData.authorid);

    return messageCard;
}


///////////////////////////////////////////////////////////////////////////////////////////
// 
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
// 
function setAuthorSignaturePicture(messageAuthorBox, authorPicture) {
    if (authorPicture.length > 0) {
        let messageAuthorPicture = messageAuthorBox.querySelector("img");
        console.log("IMAGE ELEMENT 1", messageAuthorPicture);
        if ((messageAuthorPicture === undefined) || (messageAuthorPicture === null)) {
            console.log("IMAGE ELEMENT 2", messageAuthorPicture);
            messageAuthorPicture = document.createElement("img");
        }

        messageAuthorPicture.src = authorPicture;
        messageAuthorBox.appendChild(messageAuthorPicture);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// 
function createMessageEditor(messageData, messageId) {
    const messageEditor = document.createElement("form");
    const messageEditText = document.createElement("textarea");
    const messageEditSave = document.createElement("button");
    const messageEditDelete = document.createElement("button");

    messageEditor.classList.add("message-edit-form");
    messageEditText.classList.add("message-edit-text");
    messageEditSave.classList.add("message-edit-save");
    messageEditDelete.classList.add("message-edit-delete");

    messageEditor.setAttribute("messageid", messageId);
    messageEditor.setAttribute("authorid", messageData.authorid);
    return messageEditor;
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


export { createMessageCard, buildMessageBoard };