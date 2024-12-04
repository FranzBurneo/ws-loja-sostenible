const { dbAdmin, bucket } = require("../firebaseAdmin");
const firebase = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { NODE_API } = require('../config');

export const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.iterator) || 1; // Página predeterminada es 1 si no se proporciona el parámetro
        const maxPerPage = 10;
        const type = req.query.type;
        console.log('page: ', page);
        let postQuery = dbAdmin.collection("posts").orderBy('timestamp', 'desc');

        if (type && type != -1) {
            postQuery = postQuery.where("type", "==", parseInt(type));
        }

        if (!req.query.onlyOwnPosts) {
            // Consulta los documentos donde el campo "visibility" es true o el campo no está presente
            postQuery = postQuery.where("visibility", "==", true);
        }

        // Verifica si se desea obtener solo las publicaciones del usuario loggeado
        if (req.query.onlyOwnPosts === 'true') {
            console.log('req.organization: ', req.organization, ' req.query.onlyOwnPosts: ', req.query.onlyOwnPosts);
            if (req.organization && req.rol.includes("admin")) {
                postQuery = postQuery.where("organization", "==", req.organization);
            } else {
                // Filtra las publicaciones por el ID de usuario loggeado
                const userId = req.userId; // Se asume que el ID de usuario está en req.userId
                if (userId) {
                    postQuery = postQuery.where("userId", "==", userId);
                } else {
                    // Manejar el caso donde req.userId es undefined
                    console.error('El ID de usuario no está disponible en la solicitud.');
                    res.status(400).json({ message: 'El ID de usuario no está disponible en la solicitud.' });
                    return;
                }
            }
        }

        // Si no es la primera página, utiliza el último documento como referencia
        if (page > 1) {
            const lastDocument = await getLastDocument(page - 1, maxPerPage, postQuery);
            console.log('lastDocument: ', lastDocument);
            if (lastDocument) {
                postQuery = postQuery.startAfter(lastDocument);
            } else {
                res.status(400).json({ message: 'No se encontraron documentos para la página especificada.' });
                return;
            }
        }

        const postQuerySnapshot = await postQuery.limit(maxPerPage).get();
        const posts = [];

        for (const doc of postQuerySnapshot.docs) {
            const postData = doc.data();
            const selectedOdsId = postData.selectedOds;
            const userIdPost = postData.userId;
            let selectedOdsData = {};
            let dataUserPost = {};
            let odsDoc;
            if (selectedOdsId) {
                odsDoc = await dbAdmin.collection("ods").doc(selectedOdsId).get();
                selectedOdsData = odsDoc.data();
            }

            if (userIdPost) {
                const usersCollectionRef = dbAdmin.collection("users");
                const userDataSnapshot = await usersCollectionRef.where("userId", "==", userIdPost).get();
                if (!userDataSnapshot.empty) {
                    dataUserPost = userDataSnapshot.docs[0].data();
                } else {
                    console.error(`No se encontró ningún usuario con el ID: ${userIdPost}`);
                }
            }

            const post = {
                id: doc.id,
                ...postData,
                ...(odsDoc && { selectedOds: { id: odsDoc.id, ...selectedOdsData } }), // Incluir selectedOds solo si odsDoc existe
                userPost: dataUserPost,
            };
            posts.push(post);
        }

        res.status(200).json({ posts });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
    }
}

const getLastDocument = async (page, maxPerPage, postQuery) => {
    try {        
        const offset = (page - 1) * maxPerPage;

        // Realiza una consulta para obtener el último documento de la página anterior
        const postQuerySnapshot = await postQuery.limit(offset).get();

        // Si hay documentos, el último será el que se utilizará como referencia
        if (!postQuerySnapshot.empty) {
            return postQuerySnapshot.docs[postQuerySnapshot.docs.length - 1];
        } else {
            throw new Error('No se encontraron documentos para la página especificada.');
        }
    } catch (error) {
        console.error('Error obteniendo el último documento:', error);
        throw new Error('Ocurrió un error al obtener el último documento.');
    }
};


    export const getPostById = async (req, res) =>{
        try {
            const postId = req.params.postId;
            const userId = req.query.userId;
            // Obtener la publicación
            const postDoc = await dbAdmin.collection("posts").doc(postId).get();

            if (!postDoc.exists) {
                return res.status(404).json({ message: 'La publicación no fue encontrada.' });
            }

            const postData = postDoc.data();
            const userIdPost = postData.userId;

            // Obtener los datos del usuario que publicó
            const userPostDoc = await dbAdmin.collection("users").where("userId", "==", userIdPost).get();
            const userPostData = userPostDoc.empty ? {} : userPostDoc.docs[0].data();

            // Obtener los comentarios de la publicación y sus respuestas
            const commentsQuerySnapshot = await dbAdmin.collection("comments").where("postId", "==", postId).orderBy("timestamp", "desc").get();
            const commentsData = await Promise.all(commentsQuerySnapshot.docs.map(async (commentDoc) => {
                const commentData = commentDoc.data();
                const commentUserId = commentData.userId;
                let nameUserReplied;

                // Obtener los datos del usuario que comentó
                const userCommentDoc = await dbAdmin.collection("users").where("userId", "==", commentUserId).get();
                const userCommentData = userCommentDoc.empty ? {} : userCommentDoc.docs[0].data();

                // Obtener las respuestas del comentario
                const repliesQuerySnapshot = await dbAdmin.collection("commentReplies").where("commentId", "==", commentDoc.id).orderBy("timestamp", "asc").get();
                const repliesData = await Promise.all(repliesQuerySnapshot.docs.map(async (replyDoc) => {
                    const replyData = replyDoc.data();
                    const replyUserId = replyData.userId;
                    const repliedUserId = replyData.repliedUserId;

                    // Obtener los datos del usuario que respondió
                    const userReplyDoc = await dbAdmin.collection("users").where("userId", "==", replyUserId).get();
                    const userReplyData = userReplyDoc.empty ? {} : userReplyDoc.docs[0].data();
                    if(repliedUserId){
                        const usersCollectionRef = dbAdmin.collection("users");
                        const userDataSnapshot = await usersCollectionRef.where("userId", "==", repliedUserId).get();
                        if(!userDataSnapshot.empty)
                            nameUserReplied = userDataSnapshot.docs[0].data().firstname + " "  + userDataSnapshot.docs[0].data().lastname
                    }

                    // Combinar la información del usuario y la respuesta en un objeto
                    return {
                        id: replyDoc.id,
                        content: replyData.content,
                        timestamp: replyData.timestamp,
                        user: {
                            id: replyUserId,
                            firstname: userReplyData.firstname || 'Unknown',
                            lastname: userReplyData.lastname || 'Unknown',
                            profileImage: userReplyData.avatarImage || null,
                        },
                        nameUserReplied,
                    };
                }));

                // Combinar la información del comentario, usuario y respuestas en un objeto
                return {
                    id: commentDoc.id,
                    postId: commentData.postId,
                    content: commentData.content,
                    timestamp: commentData.timestamp,
                    user: {
                        id: commentUserId,
                        firstname: userCommentData.firstname || 'Unknown',
                        lastname: userCommentData.lastname || 'Unknown',
                        profileImage: userCommentData.avatarImage || null,
                    },
                    replies: repliesData
                };
            }));
            let userParticipation = false;
            if(userId){
                console.log('Hay user ID postId: ', postId, ' userId: ', userId);
                const participationCollectionRef = dbAdmin.collection("postParticipants");
                const participationSnapshot = await participationCollectionRef.where("postId", "==", postId)
                                                                            .where("userId", "==", userId)
                                                                            .get();
                if(!participationSnapshot.empty){
                    const participationData = participationSnapshot.docs[0].data();
                    if (participationData.userId === userId) {
                        userParticipation = true; // El usuario ha registrado su participación
                    }
                }
            }
            // Devolver la publicación con sus comentarios y respuestas
            res.status(200).json({ 
                post: { 
                    id: postDoc.id, 
                    ...postData, 
                    userPost: userPostData, 
                    comments: commentsData,
                    userParticipation
                }  
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Ocurrió un error al obtener la información.' });
        }
    }

// Función para guardar la imagen en el almacenamiento de Firebase
async function guardarImagen(imageData, originalFileName) {
    const timestamp = new Date().getTime();
    const uniqueId = uuidv4();
    const uniqueFileName = `postImages/${timestamp}_${uniqueId}_${originalFileName}`;

    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const file = bucket.file(uniqueFileName);

    await file.save(buffer, {
        metadata: {
            contentType: 'image/png', // O 'image/jpeg'
        },
    });

    const url = NODE_API + 'img';
    const req = {
        imgName: uniqueFileName
    };

    const responseImg = await axios.post(url, req);
    return responseImg.data.url;
}

async function guardarArchivo(fileBuffer, originalFileName, mimeType) {
    const timestamp = new Date().getTime();
    const uniqueId = uuidv4();
    const uniqueFileName = `postFiles/${timestamp}_${uniqueId}_${originalFileName}`;

    const file = bucket.file(uniqueFileName);

    await file.save(fileBuffer, {
        metadata: {
            contentType: mimeType,
        },
    });

    const url = NODE_API + 'img';
    const req = {
        imgName: uniqueFileName,
    };

    const responseImg = await axios.post(url, req);
    return responseImg.data.url;
}

export const createPost = async (req, res) => {
    try {
        console.log('createPost');
        // Extraer campos del cuerpo de la solicitud
        const { title, content, selectedOds, type, image, DateTimeEvent, place, interactionType, summaryContent, attachments } = req.body;
        let imageUrl = "";
        console.log('image: ', image);
        if (image !== null && image !== undefined) {
            const imageData = image.image;
            const fileName = image.fileName;    
            // Guardar la imagen en Firebase Storage y obtener la URL   
            imageUrl = await guardarImagen(imageData, fileName);
        }        
        // Convertir los archivos adjuntos a buffers y obtener las URLs
        const attachmentUrls = [];
        if (attachments && attachments.length > 0) {
            for (const attachment of attachments) {
                const fileBuffer = Buffer.from(attachment.fileContent.split(',')[1], 'base64');
                const attachmentUrl = await guardarArchivo(fileBuffer, attachment.fileName, attachment.contentType);
                attachmentUrls.push({ url: attachmentUrl, fileName: attachment.fileName, contentType: attachment.contentType });
            }
        }
        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        // Crear el documento en Firestore
        const docRef = await dbAdmin.collection("posts").add({
            title,
            content,
            summaryContent, // Agregar el contenido resumido
            userId: req.userId,
            selectedOds,
            type,
            imageUrl,
            DateTimeEvent,
            place,
            timestamp,
            visibility: true,
            organization: req.organization,
            interactionType,
            attachments: attachmentUrls
        });

        const postId = docRef.id;
        res.status(200).json({ success: true, postId, imageUrl });
    } catch (error) {
        console.error('Error al crear la publicación:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};


export const updatePostById = async (req, res) => {
    try {
        const { title, content, selectedOds, type, image, DateTimeEvent, place, visibility, interactionType, summaryContent } = req.body;
        const attachments = req.files && req.files.filter(file => file.fieldname.startsWith('attachment'));

        console.log('req.body: ', req.body);

        const postCollectionRef = dbAdmin.collection("posts").doc(req.params.postId);
        const postDoc = await postCollectionRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ message: 'La publicación con el ID proporcionado no existe.' });
        }

        const postUserId = postDoc.data().userId;

        if (req.userId !== postUserId && req.organization !== postDoc.data().organization) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar esta publicación.' });
        }

        if (visibility !== undefined) {
            await postCollectionRef.update({ visibility: visibility });
            res.status(200).json({ message: 'Visibilidad actualizada correctamente' });
            return;
        }

        const timestamp = firebase.firestore.Timestamp.fromMillis(Date.now());

        let imageUrl = null;
        if (image === "-1" || image === postDoc.data().imageUrl) {
            imageUrl = postDoc.data().imageUrl;
        } else if (image) {
            imageUrl = await guardarImagen(image.image, image.fileName);
        }

        const attachmentUrls = postDoc.data().attachments || [];
        for (const file of attachments) {
            console.log('inside for: ', file)
            const attachmentUrl = await guardarArchivo(file.buffer, file.originalname, file.mimetype);
            attachmentUrls.push({ url: attachmentUrl, fileName: file.originalname, contentType: file.mimetype });
        }

        await postCollectionRef.update({
            title,
            content,
            summaryContent,
            selectedOds,
            type,
            imageUrl,
            DateTimeEvent,
            place,
            timestamp,
            interactionType,
            attachments: attachmentUrls
        });

        res.status(200).json({ message: 'Publicación actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar la publicación:', error);
        res.status(500).json({ message: 'Ocurrió un error al actualizar la publicación.' });
    }
};

export const deletePostById = async (req, res) => {
    try {
        const postCollectionRef = dbAdmin.collection("posts").doc(req.params.postId);
        
        // Obtener la información de la publicación
        const postDoc = await postCollectionRef.get();

        // Verificar si la publicación existe
        if (!postDoc.exists) {
            return res.status(404).json({ message: 'La publicación con el ID proporcionado no existe.' });
        }

        // Obtener el userID del documento de la publicación
        const postUserId = postDoc.data().userId;

        // Verificar si el usuario que hace la petición es el mismo que creó la publicación
        if (req.userId !== postUserId && req.organization !== postDoc.data().organization) {
            return res.status(403).json({ message: 'No tiene permisos para eliminar esta publicación.' });
        }

        // Eliminar la publicación
        await postCollectionRef.delete();

        res.status(200).json({ message: 'Publicación eliminada correctamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Ocurrió un error al eliminar la publicación.' });
    }
};

export const searchPostByParams = async (req, res) => {
    try {

        const { type, ods, keyWords } = req.query;
        console.log('searchPostByParams: ', req.query)

        const collectionToSearch = type == 1 ? "posts" : "forms";
        
        let query = dbAdmin.collection(collectionToSearch);

        // Agregar filtro para el campo "visibility" igual a true
        query = query.where("visibility", "==", true);

        // Si se proporciona el parámetro "ods", filtrar por "selectedOds"
        if (ods && ods.trim() !== "") {
            console.log('ods if');
            query = query.where("selectedOds", "==", ods);
        }       

        // Si se proporciona el parámetro "keyWords", buscar en "title" o "content"
        if (keyWords && keyWords.trim() !== "") {
            console.log('keyworkds if');
            const keyWordsArray = keyWords.includes(',') ? keyWords.split(',').map(keyword => keyword.trim()) : [keyWords];
            const snapshot = await dbAdmin.collection(collectionToSearch).get();

            const matchedPosts = [];
            for (const doc of snapshot.docs) {
                const post = doc.data();
                // Construir una expresión regular para buscar cada palabra clave en el título
                const regex = new RegExp(keyWordsArray.join("|"), "gi");
                // Verificar si la expresión regular coincide con el título del post
                if (post.title.match(regex)) {
                    const selectedOdsData = post.selectedOds ? await dbAdmin.collection("ods").doc(post.selectedOds).get().then(doc => doc.data()) : {};
                    const userDataSnapshot = await dbAdmin.collection("users").where("userId", "==", post.userId).get();
                    const dataUserPost = !userDataSnapshot.empty ? userDataSnapshot.docs[0].data() : {};
                    matchedPosts.push({ id: doc.id, ...post, selectedOds: selectedOdsData, userPost: dataUserPost });
                }
            }

            if (matchedPosts.length === 0) {
                console.error("No se encontraron publicaciones con la keyWord:", keyWords);
                res.status(404).json({ error: "No se encontraron publicaciones con la palabra clave especificada" });
                return;
            }

            res.status(200).json({ posts: matchedPosts });
            return;
        }

        const snapshot = await query.get();
        const posts = [];
        for (const doc of snapshot.docs) {
            const post = doc.data();
            console.log(post)
            const selectedOdsData = post.selectedOds ? await dbAdmin.collection("ods").doc(post.selectedOds).get().then(doc => doc.data()) : {};
            const userDataSnapshot = await dbAdmin.collection("users").where("userId", "==", post.userId).get();
            const dataUserPost = !userDataSnapshot.empty ? userDataSnapshot.docs[0].data() : {};
            posts.push({ id: doc.id, ...post, selectedOds: selectedOdsData, userPost: dataUserPost });
        }

        res.status(200).json({ posts });
    } catch (error) {
        console.error("Error al buscar publicaciones por parámetros:", error);
        res.status(500).json({ message: "Error al buscar publicaciones por parámetros" });
    }
};