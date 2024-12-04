import jwt, { verify } from "jsonwebtoken";
const {authAdmin, dbAdmin} = require("../firebaseAdmin");
const {auth, signInWithEmailAndPassword} = require("../firebase");
const CryptoJS = require("crypto-js");
const {SECRET_KEY} = require('../config');

export const signUp = async (req, res) => {
    try {
        const { firstname, lastname, email, password, organization } = req.body;
        // Password is encrypted, we get the decrypted password to use the firebase auth method
        const bytes = CryptoJS.AES.decrypt(password, SECRET_KEY);
        const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
        //crear usuario mediante autenticación de firebase
        const userResponse = await authAdmin.createUser({
            email,
            password: decryptedPassword,
            emailVerified: false,
            disabled: false
          });
        const rol = [
            "user"
        ];
        // Guardar detalles del usuario en una colección
        dbAdmin.collection("users").add({
            firstname,
            lastname,
            email,
            userId: userResponse.uid, // Asigna el uid del usuario a userId
            rol,
            active: true,
            organization: organization,
            verifiedOrganization: false,
        });

        // Generar el token con el rol
        const token = jwt.sign({ 
            id: userResponse.uid, 
            rol, 
            firstname, 
            lastname,
        }, 
        SECRET_KEY, {
            expiresIn: 86400 // 24 horas
        });
            
        return res.status(200).json({token})        
    } catch (error) {
        console.log('signUp Error: ', error);
        return res.status(500).json({message: "Ocurrió un error, intente nuevamente más tarde"});
    }
}

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        const usersCollectionRef = dbAdmin.collection("users");

        // Buscar el usuario por correo electrónico
        const querySnapshot = await usersCollectionRef.where("email", "==", email).get();

        // Verificar si el usuario existe
        if (querySnapshot.empty) {
            return res.status(400).json({ message: 'No existe una cuenta vinculada a ese correo' });
        }

        // Desencriptar la contraseña
        const bytes = CryptoJS.AES.decrypt(password, SECRET_KEY);
        const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

        // Autenticar al usuario
        const userCredential = await signInWithEmailAndPassword(auth, email, decryptedPassword);
        const user = userCredential.user;

        // Obtener el documento del usuario desde Firestore
        const userDataSnapshot = await usersCollectionRef.where("userId", "==", user.uid).get();

        // Verificar si el documento existe
        if(querySnapshot.empty) return res.status(404).json({ message: 'Usuario no encontrado' }); 
        // Obtener el rol del usuario
        const userData = userDataSnapshot.docs[0].data();

        if(!userData.active) return res.status(403).json({ message: 'El usuario se encuentra bloqueado'})
        const userRole = userData.rol || ["user"]; // Valor predeterminado si el campo "rol" no está definido

        console.log("datos: nombre ", userData.firstname, " apellido ", userData.lastname, " userData.avatarImage", userData.avatarImage, " userData.organization", userData.organization);
    
        // Generar el token
        const token = jwt.sign({ 
            id: user.uid, 
            rol: userRole, 
            firstname: userData.firstname, 
            lastname: userData.lastname, 
            profileImage: userData.avatarImage,
            organization: userData.organization,
            verifiedUser: userData.verifiedUser,
        }, 
        SECRET_KEY, {
            expiresIn: 86400 // 24 horas
        });

        res.json({ token });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const singInWithGoogle  = async (req, res) => {
    try {
        const { token } = req.body;
        const decodedToken = await authAdmin.verifyIdToken(token);
        const { uid, email, name, picture } = decodedToken;
        console.log('decodedToken: ', decodedToken)
        // Separa el nombre completo en nombres y apellidos
        const nameParts = name.split(" ");
        const firstname = nameParts.slice(0, -2).join(" "); // Todos los nombres excepto las dos últimas palabras
        const lastname = nameParts.slice(-2).join(" "); // Las dos últimas palabras son los apellidos
        let userDoc = await dbAdmin.collection('users').doc(uid).get();

        const rol = [
            "user"
        ];
    
        if (!userDoc.exists) {
          await dbAdmin.collection('users').doc(uid).set({
            firstname,
            lastname,
            email,
            userId: uid,
            rol,
            avatarImage: picture,
            active: true,
          });
        }
    

        // Generar el token con el rol
        const jwtToken = jwt.sign({ 
            id: uid, 
            rol, 
            firstname, 
            lastname,
            profileImage: picture,
        }, 
        SECRET_KEY, {
            expiresIn: 86400 // 24 horas
        });
    
        res.json({ token: jwtToken });
      } catch (error) {
        console.error('Error al autenticar con Google:', error);
        res.status(500).json({ message: 'Error al autenticar con Google' });
      }
}
