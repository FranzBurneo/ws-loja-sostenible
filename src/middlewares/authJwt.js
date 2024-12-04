import jwt from "jsonwebtoken";
import config from "../config";
const {dbAdmin} = require("../firebaseAdmin");

export const verifyToken = async(req, res, next) => {
    try {
        const token = req.headers["x-access-token"];
        console.log('token: ', token);

        if(!token) return res.status(403).json({message: "Se requiere un token"})

        const decoded = jwt.verify(token, config.SECRET_KEY)
        req.userId = decoded.id;

        const usersCollectionRef = dbAdmin.collection("users");
        const userDataSnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

        if(userDataSnapshot.empty) return res.status(404).json({message: 'Usuario no encontrado'})

        const userData = userDataSnapshot.docs[0].data();

        if(!userData.active) return res.status(403).json({ message: 'El usuario se encuentra bloqueado'})

        req.rol = userData.rol;
        req.organization = userData.organization;
        req.verifiedUser = userData.verifiedUser;

        next();
    } catch (error) {
      console.log('error: ', error);
        return res.status(401).json({message: 'No autorizado'})
    }
}


export const verifyToken2 = async(req, res, next) => {
  try {        
      const token = req.headers["x-access-token"];

      if(!token) return res.status(403).json({message: "Se requiere un token"})

      const decoded = jwt.verify(token, config.SECRET_KEY)
      req.userId = decoded.id;
      const usersCollectionRef = dbAdmin.collection("users");
      const userDataSnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

      if(userDataSnapshot.empty) return res.status(404).json({message: 'Usuario no encontrado'})

      const userData = userDataSnapshot.docs[0].data();

      if(!userData.active) return res.status(403).json({ message: 'El usuario se encuentra bloqueado'})

      return res.status(200);
  } catch (error) {
    console.log('error: ', error);
      return res.status(401).json({message: 'No autorizado'})
  }
}

export const isModerator = async (req, res, next) =>{
    const usersCollectionRef = dbAdmin.collection("users");
    const querySnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

    if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const userData = doc.data();      
          // Verifica si el usuario tiene el rol "moderator"
          if (userData.rol && userData.rol.includes("moderator")) {
            // El usuario tiene el rol de "moderator"
            next();
          } else {
            // El usuario no tiene el rol de "moderator"
            return res.status(403).json({message: "Requiere rol de moderador"})
          }
        });
      } else {
        // El usuario con el ID especificado no se encontró
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
}

export const isAdmin = async (req, res, next) =>{
    
    const usersCollectionRef = dbAdmin.collection("users");
    const querySnapshot = await usersCollectionRef.where("userId", "==", req.userId).get();

    if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const userData = doc.data();      
          // Verifica si el usuario tiene el rol "admin"
          if (userData.rol && userData.rol.includes("admin")) {
            // El usuario tiene el rol de "admin"
            next();
          } else {
            // El usuario no tiene el rol de "admin"
            return res.status(403).json({message: "Requiere rol de admin"})
          }
        });
      } else {
        // El usuario con el ID especificado no se encontró
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
}