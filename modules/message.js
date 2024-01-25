
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
    likeChatMessageUndo,
    getIsValidText,
    getCurrentUserId,
    buildAuthorProfilesCache,
    getLikedMessages,
} from './api.js';

import { showErrorMessage, clearErrorMessages, setIsBusy } from './interface.js';

// Amanda (group 2)
const messagesParam = new URLSearchParams(window.location.search).get("messages");
const SHOW_MAX_MESSAGES = ((messagesParam !== undefined) && (messagesParam !== null) ? messagesParam : 32);
// const SHOW_MAX_MESSAGES = 32;
// End

const SHORT_MESSAGE_LIMIT = 200;


// Set selected value of filter form, if one is set.
if ((messagesParam !== undefined) && (messagesParam !== null)) {
    document.querySelector("#filter-messages").value = messagesParam;
}



// Colors (with associated CSS class identifier) available in color pickers
// Key is the name of a CSS class with a "background-" prefix.
const messageBackgroundColors = {
    lightgreen: 'Green',
    lightyellow: 'Yellow',
    lightblue: 'Blue',
    lightpink: 'Pink',
    lightgray: 'Gray'
};

// Globals used by listener for changes to the "chatmeddelande" and "userprofiles" DB-collections.
let messagesSnapshot;
let authorsSnapshot;
let authorCacheInitialized = false;
let boardInitialized = false;
let userProfileCache = {};


// Initialize: Start watching the userprofiles and chatmessages databases for initial load and continually listen for changes. 
initializeDatabaseListeners();



///////////////////////////////////////////////////////////////////////////////////////////
// Build and keep the author cache updated and start listening for messages from the DB
// Note that the callback function to buildAuthorProfilesCache() here will be run whevever
// anything changes in the userprofiles database (a new user is created, a user is removed
// or a user updates their name or picture).
function initializeDatabaseListeners() {
    setIsBusy(true);
    // Fetch and cache a list of potential author names and pictures, and update any changes depending on DB state. 
    authorsSnapshot = buildAuthorProfilesCache((updatedData) => {
        updatedData.docChanges().forEach((change) => {
            if ((change.type === "added") || (change.type === "modified")) {
                // A user profile is added or updated, update the name/portrait lookup table
                const profileData = change.doc.data();
                const userId = profileData.userid;
                const userName = (getIsValidText(profileData.username) ? profileData.username : "No name");
                const userPicture = (getIsValidText(profileData.picture) ? profileData.picture : './images/user-icon.png');

                userProfileCache[userId] = {
                    userid: userId,
                    name: userName,
                    picture: userPicture,
                };

                if (change.type === "modified") {
                    // User profile changed, refresh the author info of messages by this author
                    updateMessageCardsAuthor(userId);
                }
            }
            if (change.type === "removed") {
                // User removed from the system, remove the deleted user from the profile cache
                delete userProfileCache[userId];
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
// Note that the callback function to getChatMessagesOnUpdate() here will be run whenever anything 
// changes in the messages database (a new message is added, a message is deleted, a message is edited)
function initializeMessageBoard(displayMax) {
    messagesSnapshot = getChatMessagesOnUpdate(displayMax, (updatedData) => {
        const messageBoard = document.querySelector("#messageboard");
        // Only get what has changed since last update
        updatedData.docChanges().forEach((change) => {
            if (change.type === "added") {
                // Insert new messages first, but not when initially building the board (or the initial sort order ends up backwards)
                if (boardInitialized) {
                    messageBoard.prepend(createMessageCard(change.doc.data(), change.doc.id));
                    // Ton Group 3 - play sound when a new message appears on the board
                    const clickSound = new Audio('./audio/click-124467.mp3');
                    clickSound.play();
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
        setIsBusy(false);
    });

}


///////////////////////////////////////////////////////////////////////////////////////////
// Update information about an existing message
function updateMessageCard(messageData, messageId) {
    const messageCard = document.querySelector(`article[messageid="${messageId}"].message-card`);

    if ((messageCard !== undefined) && (messageCard !== null)) {
        const messageDate = messageCard.querySelector(".message-date");
        const messageText = messageCard.querySelector(".message-text");
        const messageLikes = messageCard.querySelector(".message-like-button");
        const messageEditor = messageCard.querySelector(".message-edit-form");
        const editorText = messageCard.querySelector(".message-edit-text");
        const editorColor = messageCard.querySelector(".message-edit-color");
        const messageFullTextBox = messageCard.querySelector(".message-fulltext-box");
        const messageFullTextButton = messageCard.querySelector(".message-fulltext-button");

        const trimmedText = getTruncatedText(messageData.message, SHORT_MESSAGE_LIMIT);

        const hasLikedMessage = (userIsLoggedIn() && (messageData.likers !== undefined) && (messageData.likers !== null) ? messageData.likers.includes(getCurrentUserId()) : false);

        messageCard.setAttribute("card-color", messageData.color);
        setElementBackgroundColor(messageCard, messageData.color);

        messageEditor.setAttribute("card-color", messageData.color);
        setElementBackgroundColor(messageEditor, messageData.color);

        messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
        messageLikes.innerHTML = `<img class="smallicon" src="./images/smallicon-like.png" alt="Like"><span>(${messageData.likes !== undefined ? messageData.likes : 0})</span>`;
        messageLikes.setAttribute("title", (hasLikedMessage ? "Liked message" : "Like message"));
        if (hasLikedMessage) {
            messageLikes.classList.add("message-liked");
        }
        else {
            messageLikes.classList.remove("message-liked");
        }

        setAuthorInfoFromCache(messageCard, messageData.authorid);

        messageText.innerText = (getIsValidText(messageData.message) ? trimmedText : "No message");
        messageFullTextBox.innerText = (getIsValidText(messageData.message) ? messageData.message : "");
        editorText.innerHTML = (getIsValidText(messageData.message) ? messageData.message : "");
        editorColor.value = messageData.color;

        // Text is longer than the limit to display directly on the message note, show viewer button
        if (messageData.message.length > SHORT_MESSAGE_LIMIT) {
            messageFullTextButton.classList.remove("hide");
        }
        else {
            messageFullTextButton.classList.add("hide");
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Update the profile info (name and picture) from cache on all messages posted by the
// specified author. 
function updateMessageCardsAuthor(authorId) {
    const messageCards = document.querySelectorAll(`article[authorid="${authorId}"].message-card`);

    if ((messageCards !== undefined) && (messageCards !== null) && (messageCards.length > 0)) {
        for (const messageCard of messageCards) {
            setAuthorInfoFromCache(messageCard, authorId);
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Enable the Edit button for all displayed messages created by the current user. 
function updateMessageCardsOwned(authorId, showEditButton) {
    const messageCards = document.querySelectorAll(`article[authorid="${authorId}"].message-card`);

    if ((messageCards !== undefined) && (messageCards !== null) && (messageCards.length > 0)) {
        for (const messageCard of messageCards) {
            if (showEditButton) {
                messageCard.querySelector(".message-edit-button").classList.add("show");
            }
            else {
                messageCard.querySelector(".message-edit-button").classList.remove("show");
            }
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Indicate which messages were liked by the specified user, or remove all Liked markers
// if authorId is not set to a User-ID. 
function updateMessageCardsLiked(authorId) {
    if ((authorId == 0) || (authorId == false) || (authorId === null) || (authorId === undefined)) {
        // No valid author ID, clear the likes indicators on all displayed messages. 
        const likeButtons = document.querySelectorAll(`.message-card .message-like-button`);
        if ((likeButtons !== undefined) && (likeButtons !== null) && (likeButtons.length > 0)) {
            for (const likeButton of likeButtons) {
                likeButton.classList.remove("message-liked");
                likeButton.setAttribute("title", "Like message");
            }
        }
    }
    else {
        // Update which displayed messages have been liked by the specified author (userid).
        getLikedMessages(authorId).then((messageIds) => {
            for (const messageId of messageIds) {
                const messageCard = document.querySelector(`article[messageid="${messageId}"].message-card`);
                if ((messageCard !== undefined) && (messageCard !== null)) {
                    const messageLikeButton = messageCard.querySelector(".message-like-button");
                    messageLikeButton.classList.add("message-liked");
                    messageLikeButton.setAttribute("title", "Liked message");
                }
            }
        });
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Remove an existing message from the board
function deleteMessageCard(messageId) {
    const messageCard = document.querySelector(`article[messageid="${messageId}"].message-card`);

    if ((messageCard !== undefined) && (messageCard !== null)) {
        messageCard.remove();
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Build and return a Message "postit-note" HTML/DOM-element.
// Note that this is also used to generate a "blank" editor note when the user is adding a new message. 
//  - messageData  - object with message info to show in the element, if applicable
//  - messageId    - the message id (DB Doc-name) of the message
//  - isNewMessage - if set to true the two previous params are ignored and a blank card
//                   used to create a new message is displayed instead. 
function createMessageCard(messageData, messageId, isNewMessage = false) {
    const messageCard = document.createElement("article");
    const messageDate = document.createElement("div");
    const messageText = document.createElement("div");
    const messageFooter = document.createElement("footer");
    const messageEditButton = document.createElement("button");
    const messageLikeButton = document.createElement("button");
    const messageEditor = createMessageEditor(messageData, messageId);

    let messageAuthor;

    const hasLikedMessage = (!isNewMessage && userIsLoggedIn() && (messageData.likers !== undefined) && (messageData.likers !== null) ? messageData.likers.includes(getCurrentUserId()) : false);

    if (isNewMessage) {
        messageDate.innerText = 'New Message';
        messageText.innerText = '';
        messageEditButton.classList.add("hide");
        messageLikeButton.classList.add("hide");
    }
    else {
        if (hasLikedMessage) {
            messageLikeButton.classList.add("message-liked");
        }
        else {
            messageLikeButton.classList.remove("message-liked");
        }

        messageDate.innerText = ((messageData.date.seconds !== undefined) && (messageData.date.seconds !== null) ? timestampToDateTime(messageData.date.seconds, false) : "Date missing");
        messageText.innerText = (getIsValidText(messageData.message) ? getTruncatedText(messageData.message, SHORT_MESSAGE_LIMIT) : "No message");
        messageEditButton.innerHTML = `<img class="smallicon" src="./images/smallicon-edit.png" alt="Edit message">`;
        messageLikeButton.innerHTML = `<img class="smallicon" src="./images/smallicon-like.png" alt="Like"><span>(${messageData.likes !== undefined ? messageData.likes : 0})</span>`;
        messageEditButton.setAttribute("title", "Edit message");
        messageLikeButton.setAttribute("title", (hasLikedMessage ? "Liked message" : "Like message"));
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
            if (!userIsLoggedIn()) {
                showErrorMessage("You must be logged on to Like messages.", false, 5000);
                return;
            }

            if (event.currentTarget.classList.contains("message-liked")) {
                likeChatMessageUndo(messageId).catch((error) => {
                    showErrorMessage(error, false);
                });
            }
            else {
                likeChatMessage(messageId).catch((error) => {
                    showErrorMessage(error, false);
                });
            }
        });

        // Author name and picture
        messageAuthor = createAuthorSignature(getUserProfileData(messageData.authorid, "name"), getUserProfileData(messageData.authorid, "picture"));

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
        messageAuthor = createAuthorSignature(getUserProfileData(currUserId, "name"), getUserProfileData(currUserId, "picture"));

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
        const messageFullTexWrapper = document.createElement("div");
        const messageFullTextTitle = document.createElement("h3");
        const messageFullTextBox = document.createElement("div");
        const messageFullTextButton = document.createElement("button");
        const messageFullTextClose = document.createElement("button");

        messageFullTextBox.innerText = (getIsValidText(messageData.message) ? messageData.message : "");
        messageFullTextButton.innerHTML = `<img class="smallicon" src="./images/smallicon-expand.png" alt="View full message">`;
        messageFullTextButton.setAttribute("title", "View full message text");
        messageFullTextClose.innerText = 'X';
        messageFullTextTitle.innerText = 'View full message text';

        messageFullTextDialog.classList.add("message-fulltext-dialog");
        messageFullTexWrapper.classList.add("message-fulltext-wrapper");
        messageFullTextBox.classList.add("message-fulltext-box");
        messageFullTextButton.classList.add("message-fulltext-button");
        messageFullTextClose.classList.add("message-fulltext-close");

        messageFullTextDialog.id = `dialog-${messageId}`;
        messageFullTextBox.id = `longtext-${messageId}`;
        messageFullTextClose.id = `longtext-close-${messageId}`

        messageFooter.appendChild(messageFullTextButton);
        messageFullTexWrapper.appendChild(messageFullTextTitle);
        messageFullTextTitle.appendChild(messageFullTextClose);
        messageFullTexWrapper.appendChild(messageFullTextBox);
        messageFullTextDialog.appendChild(messageFullTexWrapper);
        messageCard.appendChild(messageFullTextDialog);

        if (messageData.message.length <= SHORT_MESSAGE_LIMIT) {
            messageFullTextButton.classList.add("hide");
        }

        messageFullTextDialog.addEventListener("click", (event) => {
            if (event.target.id == event.currentTarget.id) {
                event.currentTarget.close();
            }
        });

        messageFullTextClose.addEventListener("click", (event) => {
            messageFullTextDialog.close();
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
            showErrorMessage(error, false);
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
        }).catch((error) => {
            showErrorMessage(error, false);
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
                showErrorMessage(error, false);
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

    if (authorPicture.length > 0) {
        const messageAuthorPicture = document.createElement("img");
        messageAuthorPicture.src = authorPicture;
        messageAuthor.appendChild(messageAuthorPicture);
    }

    return messageAuthor;
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
    messageEditText.setAttribute("maxlength", 5000);
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

    messageEditButtons.append(
        messageEditSave,
        messageEditCancel,
    );
    if (!isNewMessage) {
        messageEditButtons.appendChild(messageEditDelete);
    }

    messageEditor.append(
        messageEditText,
        messageEditColor,
        messageEditButtons
    );
    return messageEditor;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Update the author fields of a message card with the cached name and picture
function setAuthorInfoFromCache(messageCard, authorId) {
    const messageAuthorName = messageCard.querySelector(".message-author span");
    const messageAuthorPic = messageCard.querySelector(".message-author img");

    messageAuthorName.innerText = getUserProfileData(authorId, "name");
    messageAuthorPic.src = getUserProfileData(authorId, "picture");
}


///////////////////////////////////////////////////////////////////////////////////////////
// Create a select menu for choosing background color of message cards
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


///////////////////////////////////////////////////////////////////////////////////////////
// Set the background color of the specified card to the specified CSS class "background-newColor"
function setElementBackgroundColor(targetElement, newColor) {
    const colorsClasses = Object.keys(messageBackgroundColors).map((val) => `background-${val}`);
    colorsClasses.forEach((elem) => {
        targetElement.classList.remove(elem);
    });
    if (getIsValidText(newColor)) {
        targetElement.classList.add(`background-${newColor}`);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Get the first parent of the start element that has the specified class
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


///////////////////////////////////////////////////////////////////////////////////////////
// Get a field of profile data for the specified user (i.e. "name" or "picture")
function getUserProfileData(userId, dataField) {
    if ((typeof userProfileCache == "object")
        && (Object.keys(userProfileCache).length > 0)
        && (userProfileCache[userId] !== undefined)
        && (userProfileCache[userId] !== null)
        && (userProfileCache[userId][dataField] !== undefined)
        && (userProfileCache[userId][dataField] !== null)) {
        return userProfileCache[userId][dataField];
    }
    else {
        switch (dataField) {
            case "name": return "No name";
            case "picture": return './images/user-icon.png';
            default: return "";
        }
    }
    return "";
}


export { createMessageCard, createColorPicker, updateMessageCardsOwned, updateMessageCardsLiked };