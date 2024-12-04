import { getStorage, ref, getDownloadURL } from "firebase/storage";

const storage = getStorage();

export const getImgByname = async (imgName) =>{
    getDownloadURL(ref(storage, imgName))
    .then((url) => {
        console.log('img: ', url);
        return url;
    })
    .catch((error) => {
        return "";
    });
}