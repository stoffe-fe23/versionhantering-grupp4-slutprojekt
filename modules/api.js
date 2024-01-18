/*
    Versionshantering slutprojekt (FE23)
    Grupp 4

    Functionality for retrieving and storing data from the Firebase API,
    and managing user logins.
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    deleteUser,
    sendPasswordResetEmail,
    sendEmailVerification,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import {
    getFirestore,
    collection,
    doc,
    getDocs,
    addDoc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    query,
    orderBy,
    limit,
    increment,
    arrayUnion,
    onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
// } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-lite.js';


import { firebaseConfig } from './apiconfig.js';

// Firebase Initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);


// Global variables used for logging on/off users
let currentUser = auth.currentUser;
let userLoginCallback;
let userLogoffCallback;


/****************************************************************************************
 * USER MANAGEMENT
 ****************************************************************************************/

///////////////////////////////////////////////////////////////////////////////////////////
// Set the callback function to run when a user has completed logging on.
function setUserLoginCallback(callbackFunc) {
    userLoginCallback = callbackFunc;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Set the callback function to run when a user has completed logging off. 
function setUserLogoffCallback(callbackFunc) {
    userLogoffCallback = callbackFunc;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Returns true if there is currently a user logged on, otherwise false.
// If the requireVerified is set, it also required the user account to have been verified.
// (I.e. user getting a confirmation email and clicking on the link)
function userIsLoggedIn(requireVerified = false) {
    return (currentUser !== null) && (!requireVerified || (requireVerified && currentUser.emailVerified));
}


///////////////////////////////////////////////////////////////////////////////////////////
// Check if the currently logged in user has the specified userId.
function getIsUserId(userId) {
    return userIsLoggedIn() && (currentUser.uid == userId);
}

///////////////////////////////////////////////////////////////////////////////////////////
// Update authenticated user status. Run relevant callback functions set with the 
// setUserLoginCallback() and setUserLogoffCallback() functions. 
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (typeof userLoginCallback == "function") {
            userLoginCallback();
        }
        console.log("CURRENT USER", currentUser);
    }
    else {
        currentUser = null;
        if (typeof userLogoffCallback == "function") {
            userLogoffCallback();
        }
        console.log("NO USER", currentUser);
    }
});


///////////////////////////////////////////////////////////////////////////////////////////
// Authenticate the current user. Use the onAuthStateChanged callback set with the 
// setUserLoginCallback() function to respond when the login process has finished.
async function userLogin(loginName, loginPassword) {
    return signInWithEmailAndPassword(auth, loginName, loginPassword).then((userCredential) => {
        currentUser = userCredential.user;
        console.log("SIGNED IN", userCredential);
    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// Log off the current user.  Use the onAuthStateChanged callback set with the 
// setUserLogoffCallback() function to respond when the login process has finished.
async function userLogoff() {
    return signOut(auth).then(() => {
        currentUser = null;
        console.log("LOG OFF SUCCESSFUL");
    }).catch((error) => {
        console.error("LOG OFF FAILED", error);
    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// Get the name of the current user or "No name" if no user is logged on or the user has
// not set any display name. 
function getCurrentUserName() {
    if ((currentUser !== undefined) && (currentUser !== null) && getIsValidText(currentUser.displayName)) {
        return (currentUser.displayName.length > 0 ? currentUser.displayName : "No name");
    }
    else {
        return "No name";
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Update profile data of the currently logged on user
// The profileData parameter must be an object with properties for the profile fields to update.
// Possible properties are: displayName, picture, color
// Function returns a Promise for when the update is complete.
async function userUpdateProfile(profileData) {
    const authProfileData = {};
    const userProfileData = {};

    if (getIsValidText(profileData.displayName)) {
        authProfileData.displayName = profileData.displayName;
        userProfileData.username = profileData.displayName;
    }
    if (getIsValidText(profileData.picture)) {
        authProfileData.photoURL = profileData.picture;
        userProfileData.picture = profileData.picture;
    }
    if (getIsValidText(profileData.color)) {
        userProfileData.picture = profileData.color;
    }

    // Update the user profile fields in the database
    const docProfile = await getDoc(doc(db, "userprofiles", currentUser.uid));
    if (docProfile.exists()) {
        await updateDoc(doc(db, "userprofiles", currentUser.uid), userProfileData);
    }
    else {
        userProfileData.userid = currentUser.uid;
        await setDoc(doc(db, "userprofiles", currentUser.uid), userProfileData);
    }

    // Update user authentication data
    return await updateProfile(auth.currentUser, authProfileData);
}


///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve the profile data of the currently logged on user
// Function returns a Promise with the user profile data as callback parameter.
async function getCurrentUserProfile() {
    let userProfile = {};
    if (currentUser !== null) {
        userProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            verified: currentUser.emailVerified,
            phone: currentUser.phoneNumber,
            picture: currentUser.photoURL,
            color: '',
            lastLogin: currentUser.metadata.lastSignInTime,
        }

        const docProfile = await getDoc(doc(db, "userprofiles", currentUser.uid));
        if (docProfile.exists()) {
            const docProfileData = docProfile.data();
            if (getIsValidText(docProfileData.picture)) {
                userProfile.picture = docProfileData.picture;
            }
            if (getIsValidText(docProfileData.color)) {
                userProfile.color = docProfileData.color;
            }
        }
    }
    return userProfile;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve the profile picture of the specified user.
async function getUserPicture(userId) {
    const docProfile = await getDoc(doc(db, "userprofiles", userId));
    if (docProfile.exists()) {
        const docProfileData = docProfile.data();
        if (getIsValidText(docProfileData.picture)) {
            return docProfileData.picture;
        }
        return "";
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Add a new user account (login) to the system.
// Returns a Promise with the credentials of the new user as callback parameter.
async function createNewUser(userEmail, userPassword, userName) {
    return createUserWithEmailAndPassword(auth, userEmail, userPassword).then((userCredential) => {
        currentUser = userCredential.user;

        if ((userName !== undefined) && (userName.length > 0)) {
            userUpdateProfile({ displayName: userName }).then(() => {
                userLoginCallback();
            });

        }
        console.log("USER CREATED", userCredential);
    });
}



///////////////////////////////////////////////////////////////////////////////////////////
// Delete the current user from the system. The user's password must be specified to
// confirm the deletion. 
async function userDelete(userPassword) {
    if (userIsLoggedIn()) {
        // Require reauthentication before deletion for safety.
        const authCredential = EmailAuthProvider.credential(auth.currentUser.email, userPassword);
        return reauthenticateWithCredential(auth.currentUser, authCredential).then(() => {
            // User reauthenticated, delete the account.
            return deleteUser(auth.currentUser).then(() => {
                currentUser = null;
            });
        });
    }
    else {
        throw new Error("Unable to delete user. No user is logged in.");
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Change the password of the current user. Both the old password and the desired new
// password must be specified. 
async function userSetPassword(oldPassword, newPassword) {
    if (userIsLoggedIn()) {
        // Require reauthentication before password change for safety.
        const authCredential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
        return reauthenticateWithCredential(auth.currentUser, authCredential).then(() => {
            // User reauthenticated, update the password.
            return updatePassword(auth.currentUser, newPassword).then(() => {
                console.log("USER PASSWORD UPDATED");
            });
        });
    }
    else {
        throw new Error("Unable to change password. No user is logged in.");
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Send a verification email to the email address of the current user
async function userSendEmailVerification() {
    if (!userIsLoggedIn()) {
        throw new Error("Unable to send verification email. No user is logged in.");
    }

    if (currentUser.emailVerified) {
        throw new Error("This account is already verified.");
    }

    return sendEmailVerification(auth.currentUser).then(() => {
        console.log("USER VERIFICATION EMAIL SENT");
    });
}



/****************************************************************************************
 * CHAT MESSAGES
 ****************************************************************************************/


///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve up to messageLimit Messages from the database, in falling chronological order.
// Function returns a Promise with an object as callback parameter containing properties 
// with Message objects. The property names are the message ID / database document name.
// 
// Use this for single requests to fetch a current snapshot of available messages. 
// Use getChatMessagesOnUpdate() below instead to continually listen for changes within
// the set of messages. 
async function getChatMessages(messageLimit = 30) {
    return dbGetCollectionDocuments(db, 'chatmeddelande', ["date", "desc"], messageLimit).then((dbData) => {
        const chatMessages = {};

        if ((dbData !== undefined) && (dbData !== null) && Array.isArray(dbData) && (dbData.length > 0)) {
            for (const dataItem of dbData) {
                chatMessages[dataItem.docname] = dataItem.data;
            }
        }

        return chatMessages;
    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// Listen for changes to the messages database and run the specified callback function
// whenever something has changed on the server. Use this instead of getChatMessages()
// to keep the message list automatically updated without further requests. 
//
// Use getChatMessages() instead to get a current snapshot of messages with no automatic 
// updates.  
//  N.B. Only call this function once per page load!
function getChatMessagesOnUpdate(messageLimit = 30, onUpdateCallback = null) {
    return dbSetCollectionDocumentsListener(db, 'chatmeddelande', ["date", "desc"], messageLimit, onUpdateCallback);
}


///////////////////////////////////////////////////////////////////////////////////////////
// Store a new Message in the database. 
// Function returns a Promise with data about the new message when it has been stored. 
async function addChatMessage(messageText, noteColor = '') {
    if (userIsLoggedIn()) {
        const collectionData = {
            date: Timestamp.fromDate(new Date()),
            message: messageText,
            authorname: (currentUser.displayName.length > 0 ? currentUser.displayName : currentUser.email),
            authorid: currentUser.uid,
            color: noteColor,
        };
        return dbStoreDocument(db, "chatmeddelande", collectionData);
    }
    else {
        throw new Error("You must be logged in to create new messages");
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Remove a message from the database.
async function deleteChatMessage(messageid) {
    if (userIsLoggedIn()) {
        const docMessage = await getDoc(doc(db, "chatmeddelande", messageid));
        if (docMessage.exists()) {
            const docMessageData = docMessage.data();
            if (docMessageData.authorid == currentUser.uid) {
                return dbDeleteDocument(db, "chatmeddelande", messageid);
            }
            else {
                throw new Error("You may only remove messages you have created.");
            }
        }
        else {
            throw new Error("The specified message does not exist.");
        }
    }
    else {
        throw new Error("You must be logged in to remove messages.");
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Edit an existing message in the database. 
async function editChatMessage(messageId, newMessage, newColor = '') {
    const docMessage = await getDoc(doc(db, "chatmeddelande", messageId));
    if (docMessage.exists()) {
        const docMessageData = docMessage.data();

        if (docMessageData.authorid == currentUser.uid) {
            return await updateDoc(doc(db, "chatmeddelande", messageId), {
                message: newMessage,
                color: newColor
            });
        }
        else {
            throw new Error("You can only edit messages you have created");
        }
    }
    else {
        throw new Error("Could not find the message to edit.");
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Increase the "Likes" counter for this message 
async function likeChatMessage(messageId) {
    if (!userIsLoggedIn()) {
        throw new Error("You must be logged in to like a message.");
    }

    const docMessage = await getDoc(doc(db, "chatmeddelande", messageId));
    if (docMessage.exists()) {
        const docMessageData = docMessage.data();

        // A user may only like a message once
        if ((docMessageData !== undefined) && (docMessageData.likers !== undefined) && Array.isArray(docMessageData.likers)) {
            if (docMessageData.likers.includes(currentUser.uid)) {
                throw new Error("You have already liked this message before.");
            }
        }

        return await updateDoc(doc(db, "chatmeddelande", messageId), { likes: increment(1), likers: arrayUnion(currentUser.uid) });
    }
    else {
        throw new Error("Could not find the message to edit.");
    }
}



///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve up to resultLimit documents from the collectionName collection, sorted by
// the sortResultBy parameter.
//  - db is the database handler global.
//  - collectionName is a string with the name of the Database collection
//  - sortResultBy is an array where the first element is the name of the field to sort by, and
//              the second element is either "asc" or "desc" to set the sort order.
//  - resultLimit is an integer number to limit how many documents to retrieve
async function dbGetCollectionDocuments(db, collectionName, sortResultBy, resultLimit = 30) {
    try {
        const fetchQuery = query(collection(db, collectionName), orderBy(...sortResultBy), limit(resultLimit));
        const dbDocuments = await getDocs(fetchQuery);

        const resultArray = [];
        dbDocuments.forEach((doc) => {
            const resultDoc = {
                docname: doc.id,
                data: doc.data()
            }
            resultArray.push(resultDoc);
        });
        return resultArray;
    }
    catch (error) {
        console.error("Error reading from collection: ", error);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve up to resultLimit documents from the collectionName collection, sorted by
// the sortResultBy parameter.
//  - db is the database handler global.
//  - collectionName is a string with the name of the Database collection
//  - sortResultBy is an array where the first element is the name of the field to sort by, and
//              the second element is either "asc" or "desc" to set the sort order.
//  - resultLimit is an integer number to limit how many documents to retrieve
//  - onUpdateCallback is a callback function to run whenever the observed data changes in the DB.
async function dbSetCollectionDocumentsListener(db, collectionName, sortResultBy, resultLimit = 30, onUpdateCallback = null) {
    try {
        if (typeof onUpdateCallback == "function") {
            const fetchQuery = query(collection(db, collectionName), orderBy(...sortResultBy), limit(resultLimit));
            return onSnapshot(fetchQuery, onUpdateCallback);
        }
        else {
            throw new Error("Unable to fetch data: No valid listener callback function has been set!");
        }
    }
    catch (error) {
        console.error("Error reading from collection: ", error);
    }
}



///////////////////////////////////////////////////////////////////////////////////////////
// Store a new document in the database.
//  - db is the database handler global
//  - collectionName is a string with the name of the Database collection to store the document in.
//  - collectionData is an object with properties matching the names of the database fields to store in the document
//  - documentName is the name of the document. Omit to make the database automatically assign a name. 
async function dbStoreDocument(db, collectionName, collectionData, documentName = null) {
    try {
        if (documentName !== null) {
            return await setDoc(doc(db, collectionName, documentName), collectionData);
        }
        else {
            return await addDoc(collection(db, collectionName), collectionData);
        }
    }
    catch (error) {
        console.error("Error writing to collection: ", error);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Remove a document from the database
async function dbDeleteDocument(db, collectionName, documentName) {
    // TODO: Delete any sub-collections associated with this as well
    return await deleteDoc(doc(db, collectionName, documentName));
}


///////////////////////////////////////////////////////////////////////////////////////////
// Utility to determine if a text variable has been set and assigned a value.
function getIsValidText(text) {
    return ((text !== undefined) && (text !== null) && (text.length !== undefined) && (text.length > 0));
}


export {
    addChatMessage,
    getChatMessages,
    getChatMessagesOnUpdate,
    deleteChatMessage,
    editChatMessage,
    likeChatMessage,
    userLogin,
    userLogoff,
    userIsLoggedIn,
    userUpdateProfile,
    getCurrentUserName,
    setUserLoginCallback,
    setUserLogoffCallback,
    getCurrentUserProfile,
    createNewUser,
    userDelete,
    userSetPassword,
    userSendEmailVerification,
    getIsUserId,
    getUserPicture,
    getIsValidText,
};