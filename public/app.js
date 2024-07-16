// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDwg-EuEYFSn4Y3IqiaW-w3fUoS1FNKfaE",
    authDomain: "new-chat-app-17ec7.firebaseapp.com",
    databaseURL: "https://new-chat-app-17ec7-default-rtdb.firebaseio.com",
    projectId: "new-chat-app-17ec7",
    storageBucket: "new-chat-app-17ec7.appspot.com",
    messagingSenderId: "221822313733",
    appId: "1:221822313733:web:56357c7624a135a99ec36c",
    measurementId: "G-VDQDBJT9ZE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
console.log("Firebase initialized");

const db = firebase.database();
console.log("Database reference created");
const auth = firebase.auth();
console.log("Auth reference created");

// DOM elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginBox = document.getElementById('login-box');
const signupBox = document.getElementById('signup-box');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const sendBtn = document.getElementById('send-btn');
const messageInput = document.getElementById('message-input');

// Show/hide login and signup boxes
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.style.display = 'none';
    signupBox.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupBox.style.display = 'none';
    loginBox.style.display = 'block';
});
auth.onAuthStateChanged((user) => {
    if (user) {
        showChatInterface();
        loadActiveUsers();
    } else {
        showAuthInterface();
    }
});




// Login functionality
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Login successful', userCredential.user);
            showChatInterface();
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
        });
});

signupBtn.addEventListener('click', (e) => {
    
    loginBox.style.display = 'block';
    signupBox.style.display = 'none';
});

// Signup functionality
signupBtn.addEventListener('click', () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const phone = document.getElementById('signup-phone').value;
  
    if (!email || !password || !phone) {
      alert('Please fill in all fields');
      return;
    }

    isSigningUp = true;
  
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        return db.ref('users/' + user.uid).set({
          email: email,
          phone: phone,
        });
      })
      .then(() => {
        // Immediately sign out the user after creating the account
        return auth.signOut();
      })
      .then(() => {
        alert('Sign up successful! Please log in.');
        // Clear the signup form fields
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-phone').value = '';
        // Show the login window
        showAuthInterface();
        loginBox.style.display = 'block';
        signupBox.style.display = 'none';
        isSigningUp = false; 
      })
      .catch((error) => {
        console.error('Signup error:', error);
        alert(`Signup failed: ${error.message}`);
        isSigningUp = false;
      });
});
// Logout functionality
logoutBtn.addEventListener('click', () => {
    logout();
});

function logout() {
    removeUserFromActiveList();
    auth.signOut().then(() => {
        console.log('User signed out');
        showAuthInterface();
    }).catch((error) => {
        console.error('Error signing out:', error);
        alert(`Logout failed: ${error.message}`);
    });
}

function showAuthInterface() {
    authContainer.style.display = 'flex';
    chatContainer.style.display = 'none';
    loginBox.style.display = 'block';
    signupBox.style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showChatInterface() {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    loadActiveUsers();
    listenForNewMessages();
    listenForMessageStatusChanges();
}

let isSigningUp = false;

auth.onAuthStateChanged((user) => {
    if (user && !isSigningUp) {
        showChatInterface();
        loadActiveUsers();
    } else {
        showAuthInterface();
    }
});
function checkAuthState() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

let currentChatPartner = null;
let currentChatPartnerEmail = null;
let localMessageIds = new Set();

function loadActiveUsers() {
    const activeUsersRef = db.ref('active_users');
    const currentUser = auth.currentUser;

    if (!currentUser) {
        console.error('No current user found');
        return;
    }

    console.log('Loading active users for', currentUser.email);

    activeUsersRef.child(currentUser.uid).set({
        isOnline: true,
        email: currentUser.email,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log('Current user set as active');
    }).catch(error => {
        console.error('Error setting user as active:', error);
    });

    activeUsersRef.child(currentUser.uid).onDisconnect().remove();

    activeUsersRef.on('value', (snapshot) => {
        const activeUsersContainer = document.getElementById('active-users');
        if (!activeUsersContainer) {
            console.error('Active users container not found');
            return;
        }

        activeUsersContainer.innerHTML = '';
        console.log('Active users snapshot:', snapshot.val());

        let otherActiveUsersCount = 0;
        const now = Date.now();
        const staleThreshold = 5 * 60 * 1000; // 5 minutes

        snapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key;
            const userData = childSnapshot.val();

            console.log('User data:', userId, userData);

            if (now - userData.lastSeen > staleThreshold) {
                console.log('Removing stale user data for:', userData.email);
                childSnapshot.ref.remove();
                return;
            }

            if (userData.isOnline && userId !== currentUser.uid) {
                const userElement = document.createElement('div');
                userElement.textContent = userData.email || 'Unknown User';
                userElement.classList.add('user');
                userElement.addEventListener('click', () => startChat(userId, userData.email));
                activeUsersContainer.appendChild(userElement);
                console.log('Added user to list:', userData.email);
                otherActiveUsersCount++;
            }
        });

        console.log('Total other active users:', otherActiveUsersCount);

        if (otherActiveUsersCount === 0) {
            const noUsersElement = document.createElement('div');
            noUsersElement.textContent = 'No other active users';
            activeUsersContainer.appendChild(noUsersElement);
            console.log('No other active users found');
        }
    }, (error) => {
        console.error('Error fetching active users:', error);
    });
}

function startChat(userId, userEmail) {
    currentChatPartner = userId;
    currentChatPartnerEmail = userEmail;
    document.getElementById('current-chat-partner').textContent = userEmail;
    document.getElementById('chat-messages').innerHTML = '';
    localMessageIds.clear();
    loadMessages();
    listenForNewMessages();
    listenForMessageStatusChanges();
    console.log('Starting chat with:', userEmail);
}

function loadMessages() {
    const currentUser = auth.currentUser;
    const messagesRef = db.ref('messages');

    messagesRef.orderByChild('timestamp').limitToLast(50).once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            message.id = childSnapshot.key;
            if (
                (message.sender === currentUser.uid && message.recipient === currentChatPartner) ||
                (message.sender === currentChatPartner && message.recipient === currentUser.uid)
            ) {
                displayMessage(message);
            }
        });
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const currentUser = auth.currentUser;
    const isSender = message.sender === currentUser.uid;

    if (document.querySelector(`[data-message-id="${message.id}"]`)) {
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isSender ? 'sent' : 'received');
    messageElement.dataset.messageId = message.id;

    const senderElement = document.createElement('div');
    senderElement.classList.add('message-sender');
    senderElement.textContent = isSender ? 'You' : message.senderEmail;
    messageElement.appendChild(senderElement);

    const contentElement = document.createElement('span');
    contentElement.textContent = message.content;
    messageElement.appendChild(contentElement);

    if (isSender) {
        const statusElement = document.createElement('span');
        statusElement.classList.add('status');
        updateMessageStatus(message, statusElement);
        messageElement.appendChild(statusElement);
    } else {
        markMessageAsRead(message.id);
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateMessageStatus(message, statusElement) {
    switch(message.status) {
        case 'read':
            statusElement.textContent = '✓✓';
            statusElement.style.color = 'blue';
            break;
        case 'delivered':
            statusElement.textContent = '✓✓';
            statusElement.style.color = 'gray';
            break;
        case 'sent':
        default:
            statusElement.textContent = '✓';
            statusElement.style.color = 'gray';
    }
}

function sendMessage() {
    const currentUser = auth.currentUser;
    const content = messageInput.value.trim();

    if (content && currentChatPartner) {
        const messagesRef = db.ref('messages');
        const newMessageRef = messagesRef.push();

        const message = {
            sender: currentUser.uid,
            senderEmail: currentUser.email,
            recipient: currentChatPartner,
            recipientEmail: currentChatPartnerEmail,
            content: content,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'sent'
        };

        newMessageRef.set(message)
            .then(() => {
                messageInput.value = '';
                message.id = newMessageRef.key;
                localMessageIds.add(message.id);
                displayMessage(message);
            })
            .catch((error) => {
                console.error('Error sending message:', error);
                alert(`Error sending message: ${error.message}`);
            });
    } else if (!currentChatPartner) {
        alert('Please select a user to chat with first.');
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function updateMessageDeliveryStatus(messageId) {
    const messageRef = db.ref(`messages/${messageId}`);
    messageRef.child('status').set('delivered');
}

function markMessageAsRead(messageId) {
    const messageRef = db.ref(`messages/${messageId}`);
    messageRef.transaction((currentData) => {
        if (currentData && currentData.status !== 'read') {
            currentData.status = 'read';
        }
        return currentData;
    });
}

function listenForNewMessages() {
    const currentUser = auth.currentUser;
    const messagesRef = db.ref('messages');

    messagesRef.off('child_added');

    messagesRef.orderByChild('timestamp').on('child_added', (snapshot) => {
        const message = snapshot.val();
        message.id = snapshot.key;
        if (
            (message.sender === currentUser.uid && message.recipient === currentChatPartner) ||
            (message.sender === currentChatPartner && message.recipient === currentUser.uid)
        ) {
            if (!document.querySelector(`[data-message-id="${message.id}"]`) && !localMessageIds.has(message.id)) {
                displayMessage(message);
                if (message.sender === currentChatPartner) {
                    markMessageAsRead(message.id);
                }
            }
        }
    });
}

function listenForMessageStatusChanges() {
    const currentUser = auth.currentUser;
    db.ref('messages')
        .orderByChild('sender')
        .equalTo(currentUser.uid)
        .on('child_changed', (snapshot) => {
            const message = snapshot.val();
            message.id = snapshot.key;
            const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
            if (messageElement) {
                const statusElement = messageElement.querySelector('.status');
                if (statusElement) {
                    updateMessageStatus(message, statusElement);
                }
            }
        });
}

function removeUserFromActiveList() {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const activeUsersRef = db.ref('active_users');
        activeUsersRef.child(currentUser.uid).remove()
            .then(() => console.log('User removed from active list'))
            .catch(error => console.error('Error removing user from active list:', error));
    }
}

function cleanupStaleUsers() {
    const activeUsersRef = db.ref('active_users');
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    activeUsersRef.once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (now - userData.lastSeen > staleThreshold) {
                console.log('Removing stale user data for:', userData.email);
                childSnapshot.ref.remove();
            }
        });
    });
}

setInterval(cleanupStaleUsers, 5 * 60 * 1000);

window.addEventListener('load', async () => {
    const user = await checkAuthState();
    if (user) {
        showChatInterface();
        loadActiveUsers();
    } else {
        showAuthInterface();
    }
});