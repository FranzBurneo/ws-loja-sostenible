const {authAdmin, dbAdmin, bucket} = require("../firebaseAdmin");
const axios = require ('axios');
const {NODE_API, SECRET_KEY} = require('../config');
import jwt from "jsonwebtoken";


export const getUsers = async (req, res) => {
    try {
        const usersCollectionRef = dbAdmin.collection("users");
        
        const userDataSnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

        if (userDataSnapshot.empty) {
            res.status(404).json({ message: 'El documento no fue encontrado.' });
        }
        const organizationAdmin = userDataSnapshot.docs[0].data().organization;

        let usersList;

        if(organizationAdmin !== undefined){
            console.log('organizationAdmin: ', organizationAdmin);
            const usersListSnapshot = await usersCollectionRef.where("organization", "==", organizationAdmin).get();
            usersList = usersListSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))   
        }else{
            console.log('not undefined')
            const userSnapshot = await dbAdmin.collection("users").get();
            // const userSnapshot = usersCollectionRef.get();
            usersList = userSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }
        console.log(usersList);
        res.status(200).json({ users:   usersList });
    } catch (error) {
        console.log('error in getUsers: ', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const getUserById = async (req, res) => {
    try {
        const docRef = dbAdmin.collection("users").doc(req.params.userId);
        const doc = await docRef.get();

        if (doc.exists) {
            // El documento existe, devolver sus datos
            res.status(200).json({ form: { id: doc.id, ...doc.data() } });
        } else {
            // El documento no existe
            res.status(404).json({ message: 'El documento no fue encontrado.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const getUserByUserToken = async (req, res) => {
    try{
        const usersCollectionRef = dbAdmin.collection("users");
        const userDataSnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

        if (!userDataSnapshot.empty) {
            res.status(200).json({ user: { id: userDataSnapshot.docs[0].id, ...userDataSnapshot.docs[0].data() } });
        } else {
            // El documento no existe
            res.status(404).json({ message: 'El documento no fue encontrado.' });
        }
    } catch(error){
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

export const createUser = async (req, res) => {
    try {
        const { firstname, lastname, email, password, rol } = req.body;
        // Password is encrypted, we get the decrypted password to use the firebase auth method
        // const bytes = CryptoJS.AES.decrypt(pass, SECRET_KEY);
        // const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
        //crear usuario mediante autenticación de firebase
        const userResponse = await authAdmin.createUser({
            email,
            password,
            emailVerified: false,
            disabled: false
          });   
        // Guardar detalles del usuario en una colección
        dbAdmin.collection("users").add({
            firstname,
            lastname,
            email,
            userId: userResponse.uid, // Asigna el uid del usuario a userId
            rol: rol,
            active: true
        });
    
        return res.status(201).json({ message: 'Usuario creado correctamente' });
    } catch (error) {
        console.log('createUser error: ', error)
        return res.status(500).json({message: "Ocurrió un error, intente nuevamente más tarde"});
    }
}

export const updateUserById = async (req, res) =>{ 
    try {
        const { firstname, lastname, rol, active, organization, verifiedOrganization, onlyOrgChanges } = req.body;
        console.log('updateUserById req.body: ', req.body);

        const usersCollectionRef = dbAdmin.collection("users");
        const querySnapshot = await usersCollectionRef.where("userId", "==", req.params.userId).get();

        if (querySnapshot.empty) {
            return res.status(404).json({ message: 'El usuario con el ID proporcionado no existe.' });
        }
        
        let objToUpdate;
        if(onlyOrgChanges){
            if(verifiedOrganization){
                objToUpdate = {
                    verifiedOrganization
                }
            }else{                
                objToUpdate = {
                    organization : null,
                    verifiedOrganization
                }
            }
        }else{
            objToUpdate = {
                firstname,
                lastname,
                rol,
                active,
                organization,
                verifiedOrganization
            }
        }

        // Filtra los valores undefined
        objToUpdate = Object.fromEntries(
            Object.entries(objToUpdate).filter(([_, v]) => v !== undefined)
        );

        await usersCollectionRef.doc(querySnapshot.docs[0].id).update(objToUpdate);
        // El documento existe, así que procede a actualizarlo
        res.status(200).json({ message: 'Usuario editado correctamente' });
    } catch (error) {
        console.log('error: '+error)
        res.status(500).json({ message: 'Ocurrió un error al editar el usuario.' });
    }
}

// Función para guardar la imagen en el almacenamiento de Firebase
async function guardarImagen(imageData, fileName) {
    // Generar un nombre de archivo único usando un sello de tiempo y un UUID
    const uniqueFileName = `Avatars/${fileName}`;

    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const file = bucket.file(uniqueFileName);
    //save image into storage
    await file.save(buffer, {
        metadata: {
            contentType: 'image/png', // O 'image/jpeg'
        },
    });
    
    //get URL from img
    const url = NODE_API + 'img';
    const req = {
        imgName: uniqueFileName
      };

    const responseImg = await axios.post(url, req);
    return responseImg.data.url;
}
async function saveFileToFirebaseStorage(imageData, userId, documentType) {
    const uniqueFileName = `IdDocs/${userId}`; // Nombre único para el archivo
    const buffer = Buffer.from(imageData.split(',')[1], 'base64'); // Convierte la cadena Base64 en datos binarios
    const file = bucket.file(uniqueFileName);
    await file.save(buffer, {
        metadata: {
            contentType: documentType
        },
    });
    //get URL from img
    const url = NODE_API + 'img';
    const req = {
        imgName: uniqueFileName
      };

    const responseImg = await axios.post(url, req);
    return responseImg.data.url;
}

const verifyUser = (newData, oldData) => { 
    console.log('newData: ', newData, ' oldData: ', oldData)
    const idCard = newData.idCard ?? oldData.idCard;
    const birthdate = newData.birthdate ?? oldData.birthdate;
    const phone = newData.phone ?? oldData.phone;
    const address = newData.address ?? oldData.address;
    console.log('verifyUser: ', idCard, birthdate, phone, address);
    // Verifica si algún campo está vacío o indefinido
    if (!idCard || !birthdate || !phone || !address) {
        return false;
    }

    return true;
};

export const updateUserByUserToken = async (req, res) =>{
    try {
        const { firstname, lastname, password, organization, avatarImage, idCard, birthdate, phone, address, documentFile, documentType } = req.body;

        console.log('req.body', req.body);
        
        const usersCollectionRef = dbAdmin.collection("users");
        const userDataSnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

        if (userDataSnapshot.empty) {
            return res.status(404).json({ message: 'El usuario con el ID proporcionado no existe.' });
        }
        const userDataDoc = userDataSnapshot.docs[0];
        const userData = userDataDoc.data();

        const verifiedUser = verifyUser(req.body, userData)  

        const url = avatarImage ? await guardarImagen(avatarImage, req.userId) : null;
        const urlIdDoc = documentFile ? await saveFileToFirebaseStorage(documentFile, req.userId, documentType) : null;
        
        if (firstname || lastname || avatarImage) {
            const updateFields = {}; // Objeto para almacenar los campos a actualizar            
            // Verifica si firstname tiene un valor y lo agrega al objeto de actualización
            if (firstname) {
              updateFields.firstname = firstname;
            }            
            // Verifica si lastname tiene un valor y lo agrega al objeto de actualización
            if (lastname) {
              updateFields.lastname = lastname;
            }            
            // Verifica si avatarImage tiene un valor y lo agrega al objeto de actualización
            if (avatarImage) {
              updateFields.avatarImage = url; // Asumiendo que 'url' contiene la URL de la imagen
            }

            // Verifica si idCard tiene un valor y no está vacío
            if (typeof idCard !== 'undefined') {
                updateFields.idCard = idCard;
            }

            // Verifica si birthdate tiene un valor y no está vacío
            if (typeof birthdate !== 'undefined') {
                updateFields.birthdate = birthdate;
            }

            // Verifica si phone tiene un valor y no está vacío
            if (typeof phone !== 'undefined') {
                updateFields.phone = phone;
            }

            // Verifica si address tiene un valor y no está vacío
            if (typeof address !== 'undefined') {
                updateFields.address = address;
            }

            if(documentFile){
                updateFields.documentFile = urlIdDoc; 
            }

            updateFields.verifiedUser = verifiedUser;

            console.log('updateFields: ', updateFields, 'req.userId: ', req.userId);
            // Actualiza el documento solo con los campos que tienen valor
            await usersCollectionRef.doc(userDataSnapshot.docs[0].id).update(updateFields);
        }          

        // Actualiza la contraseña del usuario utilizando Firebase Authentication
        if(password !== ''){
            await authAdmin.updateUser(req.userId, {
                password,
            });
        }

        const newUserDataSnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();
        const newUserDataDoc = newUserDataSnapshot.docs[0];
        const newUserData = newUserDataDoc.data();
        const userRole = newUserData.rol || ["user"]; // Valor predeterminado si el campo "rol" no está definido
        
        // Generar el token
        const token = jwt.sign({ 
            id: newUserData.userId, 
            rol: userRole, 
            firstname: newUserData.firstname, 
            lastname: newUserData.lastname, 
            profileImage: newUserData.avatarImage,
            organization: newUserData.organization,
            verifiedUser: newUserData.verifiedUser,
        }, 
        SECRET_KEY, {
            expiresIn: 86400 // 24 horas
        });
        // El documento existe, así que procede a actualizarlo
        res.status(200).json({ message: 'Usuario editado correctamente', ...(url && { avatarImage: url }), token });

    } catch (error) {
        console.log('updateUserByUserToken error: '+error)
        res.status(500).json({ message: 'Ocurrió un error al editar el usuario.' });
    }
}

export const deleteUserById = async (req, res) =>{
    const usersCollectionRef = dbAdmin.collection("users");
    const querySnapshot = await usersCollectionRef.where("userId", "==", req.params.userId).get();
    if (querySnapshot.empty) {
        return res.status(404).json({ message: 'El usuario con el ID proporcionado no existe.' });
    }
    const userIdCollection = querySnapshot.docs[0].id;
    try {
        await usersCollectionRef.doc(userIdCollection).delete();
    
        await authAdmin.deleteUser(req.params.userId);
        res.status(200).json({ message: 'Usuario eliminado correctamente'})
    } catch (error) {
        console.log('error:'+error)
        res.status(500).json({ message: 'Ocurrió un error al eliminar el usuario.' });
    }
}