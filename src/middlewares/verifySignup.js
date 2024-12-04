const admin = require("firebase-admin")

export const checkDuplicateUsernameOrEmail = async (req, res, next) =>{
    const usersCollectionRef = admin.firestore().collection("users");

    try {
        const querySnapshot = await usersCollectionRef.where("email", "==", req.body.email).get();
        if(!querySnapshot.empty) return res.status(400).json({message: 'Ya existe una cuenta vinculada a ese correo'})
        next();
    } catch (error) {
        return res.status(500).json({message: "Ocurrió un error interno, intente nuevamente más tarde"})
    }
}

// export const checkRolesExisted = (req, res, next) =>{
//     if(req.body.roles){
//         for (let i = 0; i < req.body.roles.length; i++) {
//               if(!ROLES.includes(req.body.roles[i])){
//                 return res.status(400).json({
//                     message: `Role ${req.body.roles[i]} does not exist`,
//                 })
//               }
//         }
//     }

//     next()
// }

