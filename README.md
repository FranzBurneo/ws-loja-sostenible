# Backend for Loja Sostenible

This project is the backend of the **Loja Sostenible** application, designed to interact with Firebase and provide CRUD (Create, Read, Update, Delete) functionalities required for managing platform data. This backend is built with **Node.js** using the **Express** framework.

## Frontend URL
The frontend of this application is deployed at:
[https://lojasosteniblenv.onrender.com/](https://lojasosteniblenv.onrender.com/)

## Technologies Used
- **Node.js**: Runtime environment.
- **Express**: Backend development framework.
- **Firebase**: Realtime database used for storage.

## Features
1. **User Management:**
   - User registration and authentication.
   - Role-based access control.
   - User profile management (update and delete user details).
   - User activation and deactivation.

2. **Publication Management:**
   - Create, update, and delete publications.
   - Retrieve and display user publications.
   - Share publications with other users.
   - Manage publication visibility (public or private).

3. **Comment and Feedback Management:**
   - Add, edit, and delete comments on publications.
   - Reply to comments to create threaded discussions.

4. **Survey and Poll Management:**
   - Create, update, and delete surveys or polls.
   - Collect and store responses from users.
   - Display survey results in real-time.

5. **Content Moderation:**
   - Review and approve publications and comments.
   - Manage inappropriate content by hiding or deleting it.

6. **Sustainable Development Goals (SDGs) Data Management:**
   - Provide up-to-date information about the SDGs.
   - Categorize and display initiatives based on specific SDGs.

7. **Platform Analytics and Reporting:**
   - Track user engagement with publications and surveys.
   - Generate reports for administrators on platform usage.

8. **Firebase Integration:**
   - Real-time data synchronization with Firebase.
   - Use Firebase Authentication for secure user login.
   - Store user data, publications, and media files in Firestore and Firebase Storage.

9. **API Documentation:**
   - Detailed RESTful API endpoints for frontend integration.
   - Includes authentication, error handling, and pagination support.
