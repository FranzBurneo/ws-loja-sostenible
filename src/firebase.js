const {firebaseConfig} = require('./config');
const app  = require('firebase/app');
const { getFirestore } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword }  = require("firebase/auth");

app.initializeApp(firebaseConfig);

const db = getFirestore();
const auth = getAuth();

// const provider_google = new app.auth.GoogleAuthProvider();
// provider_google.setCustomParameters({ prompt: 'select_account' });

// const provider_fb = new app.auth.FacebookAuthProvider();
// provider_fb.setCustomParameters({ prompt: 'select_account' });


module.exports = {
    db,
    auth,
    app,
    signInWithEmailAndPassword
  };

// export {db, auth, storage, timestamp, app}

// export const signInWithGoogle = () => auth.signInWithPopup(provider_google);
// export const signInWithFacebook = () => auth.signInWithPopup(provider_fb);