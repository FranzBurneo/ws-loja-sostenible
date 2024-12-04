require("dotenv").config();
const admin = require("firebase-admin")
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase-admin/auth");

initializeApp({
  credential: applicationDefault(),
  storageBucket: 'gs://route-firebase.com',
});

const dbAdmin = getFirestore();
const authAdmin = getAuth();
const bucket = admin.storage().bucket();

module.exports = {
  dbAdmin,
  authAdmin,
  bucket
};