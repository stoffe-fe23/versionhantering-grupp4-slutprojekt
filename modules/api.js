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
    updateProfile
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
    Timestamp,
    query,
    orderBy,
    limit,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-lite.js';


import { firebaseConfig } from './apiconfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);


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
function userIsLoggedIn() {
    return (currentUser !== null);
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
function userLogoff() {
    signOut(auth).then(() => {
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


/****************************************************************************************
 * CHAT MESSAGES
 ****************************************************************************************/


///////////////////////////////////////////////////////////////////////////////////////////
// Retrieve up to messageLimit Messages from the database, in falling chronological order.
// Function returns a Promise with an array of Message objects as callback parameter. 
async function getChatMessages(messageLimit = 30) {
    return dbGetCollectionDocuments(db, 'chatmeddelande', ["date", "desc"]).then((dbData) => {
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
// Store a new Message in the database. 
// Function returns a Promise with data about the new message when it has been stored. 
async function addChatMessage(messageText) {
    const collectionData = {
        date: Timestamp.fromDate(new Date()),
        message: messageText,
        authorname: (currentUser.displayName.length > 0 ? currentUser.displayName : currentUser.email),
        authorid: currentUser.uid
    };
    return dbStoreDocument(db, "chatmeddelande", collectionData);
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
// Utility to determine if a text variable has been set and assigned a value.
function getIsValidText(text) {
    return ((text !== undefined) && (text !== null) && (text.length !== undefined) && (text.length > 0));
}


export {
    addChatMessage,
    getChatMessages,
    dbGetCollectionDocuments,
    dbStoreDocument,
    userLogin,
    userLogoff,
    userIsLoggedIn,
    userUpdateProfile,
    getCurrentUserName,
    setUserLoginCallback,
    setUserLogoffCallback,
    getCurrentUserProfile,
    createNewUser
};