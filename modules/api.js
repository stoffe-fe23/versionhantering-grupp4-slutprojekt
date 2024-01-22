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
    updateEmail,
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
    where,
    increment,
    arrayUnion,
    onSnapshot,
    writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { firebaseConfig } from './apiconfig.js';

// Firebase Initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);


// Global variables used for logging on/off users
let currentUser = auth.currentUser;
let lastUserId = ((auth.currentUser !== undefined) && (auth.currentUser !== null) ? auth.currentUser.uid : 0);
let currentUserProfile = null;
let userLoginCallback;
let userLogoffCallback;



/****************************************************************************************
 * USER MANAGEMENT
 ****************************************************************************************/


///////////////////////////////////////////////////////////////////////////////////////////
// Update authenticated user status when user logs in or off. Run relevant callback 
// functions set with the setUserLoginCallback() and setUserLogoffCallback() functions. 
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        lastUserId = currentUser.uid;
        getCurrentUserProfile();
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
        currentUserProfile = null;
        console.log("NO USER", currentUser);
    }
});


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
// Get the UserId of the currently logged on user
function getCurrentUserId() {
    return (userIsLoggedIn() ? currentUser.uid : 0);
}


///////////////////////////////////////////////////////////////////////////////////////////
// Get the userid most recently logged on as, or 0 if not having logged on. 
// Note that this differs from getCurrentUserId() in that it will retain the UID after the
// user has logged off, but not left/refreshed the page. 
function getLastUserId() {
    return lastUserId;
}


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
// setUserLogoffCallback() function to respond when the logoff process has finished.
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
    const updatePromise = await updateProfile(auth.currentUser, authProfileData);

    // Clear profile data cache and rebuild... 
    currentUserProfile = null;
    getCurrentUserProfile();

    return updatePromise;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve the profile data of the currently logged on user
// Function returns a Promise with the user profile data as callback parameter.
async function getCurrentUserProfile() {
    if (currentUser === null) {
        return {};
    }

    if ((currentUserProfile === undefined) || (currentUserProfile === null) || (typeof currentUserProfile != "object")) {
        let userProfile = {
            uid: currentUser.uid,
            displayName: (getIsValidText(currentUser.displayName) ? currentUser.displayName : "No name"),
            email: currentUser.email,
            verified: currentUser.emailVerified,
            phone: currentUser.phoneNumber,
            picture: (getIsValidText(currentUser.photoURL) ? currentUser.photoURL : './images/profile-test-image.png'),
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

        currentUserProfile = userProfile;
        console.log("User Profile Load from DB...");
    }
    else {
        console.log("User Profile Load from cache...");
    }
    return currentUserProfile;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Add a new user account (login) to the system.
// Returns a Promise with the credentials of the new user as callback parameter.
async function createNewUser(userEmail, userPassword, userName) {
    return createUserWithEmailAndPassword(auth, userEmail, userPassword).then((userCredential) => {
        currentUser = userCredential.user;
        lastUserId = currentUser.uid;

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
// Change the e-mail address of the current user. The user's password must be specified to
// confirm the address change. 
async function userSetEmail(userPassword, newEmail) {
    if (userIsLoggedIn(true)) {
        // Require reauthentication before password change for safety.
        const authCredential = EmailAuthProvider.credential(auth.currentUser.email, userPassword);
        return reauthenticateWithCredential(auth.currentUser, authCredential).then(() => {
            return updateEmail(auth.currentUser, newEmail).then(() => {
                console.log("USER E-MAIL UPDATED");
                userSendEmailVerification();
            });
        });
    }
    else {
        throw new Error("Unable to change e-mail address. No user is logged in.");
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

///////////////////////////////////////////////////////////////////////////////////////////
// Get a current snapshot of the Name and Picture of all users as parameter to the Promise
// callback function. 
async function getUserProfiles() {
    return dbGetCollectionDocuments(db, 'userprofiles', ['userid', 'asc'], -1).then((dbData) => {
        const userProfileCache = {};

        if ((dbData !== undefined) && (dbData !== null) && Array.isArray(dbData) && (dbData.length > 0)) {
            for (const dataItem of dbData) {
                const userId = dataItem.data.userid;
                const userName = (getIsValidText(dataItem.data.username) ? dataItem.data.username : "No name");
                const userPicture = (getIsValidText(dataItem.data.picture) ? dataItem.data.picture : './images/profile-test-image.png');

                userProfileCache[userId] = {
                    userid: dataItem.data.userid,
                    name: userName,
                    picture: userPicture,
                };
            }
        }
        return userProfileCache;
    });
}


///////////////////////////////////////////////////////////////////////////////////////////
// Listen for changes to the user profiles database and run the specified callback function
// whenever something has changed on the server. 
//  N.B. Only call this function once per page load!
async function buildAuthorProfilesCache(onProfileUpdateCallback) {
    return await dbSetCollectionDocumentsListener(db, 'userprofiles', ['userid', 'asc'], -1, onProfileUpdateCallback);
}



/****************************************************************************************
 * CHAT MESSAGES
 ****************************************************************************************/


///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve up to messageLimit Messages from the database, in falling chronological order.
// Function returns a Promise with an object as callback parameter containing properties 
// with Message objects. The property names are the message ID / database document name.
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
// whenever something has changed on the server. 
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
// Delete all messages by the author specified by userId.
async function deleteChatMessagesByAuthor(userId) {
    try {
        const collectionName = 'chatmeddelande';
        let fetchQuery = query(collection(db, collectionName), where("authorid", "==", userId));
        const dbDocuments = await getDocs(fetchQuery);
        const deleteBatch = writeBatch(db);

        let documentCount = 0;
        dbDocuments.forEach((messageDoc) => {
            documentCount++;
            deleteBatch.delete(doc(db, collectionName, messageDoc.id));
        });

        await deleteBatch.commit();
        return documentCount;
    }
    catch (error) {
        console.error("Error deleting messages from databse: ", error);
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
// Retrieve an array of the message-IDs of all messages the specified user has Liked. 
async function getLikedMessages(userId) {
    try {
        let fetchQuery = query(collection(db, 'chatmeddelande'), where("likers", "array-contains", userId));
        const dbDocuments = await getDocs(fetchQuery);

        const resultArray = [];
        dbDocuments.forEach((doc) => {
            resultArray.push(doc.id);
        });
        return resultArray;
    }
    catch (error) {
        console.error("Error reading likes from databse: ", error);
    }
}



/****************************************************************************************
 * GENERIC FUNCTIONS
 ****************************************************************************************/


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
        let fetchQuery;
        if (resultLimit == -1) {
            fetchQuery = query(collection(db, collectionName), orderBy(...sortResultBy));
        }
        else {
            fetchQuery = query(collection(db, collectionName), orderBy(...sortResultBy), limit(resultLimit));
        }
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
            let fetchQuery;
            if (resultLimit == -1) {
                fetchQuery = query(collection(db, collectionName), orderBy(...sortResultBy));
            }
            else {
                fetchQuery = query(collection(db, collectionName), orderBy(...sortResultBy), limit(resultLimit));
            }

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
    // TODO: Delete any sub-collections associated with this as well, not really needed right now though.
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
    userSetEmail,
    getIsUserId,
    getCurrentUserId,
    getIsValidText,
    getUserProfiles,
    buildAuthorProfilesCache,
    getLastUserId,
    getLikedMessages,
    deleteChatMessagesByAuthor,
};